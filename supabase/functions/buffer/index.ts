// Kulsums Collection: post products to Facebook, Instagram, WhatsApp (and any other channel) through Buffer.
// Supabase Edge Function. Runs on Supabase's servers, never in the browser.
//
// POST /functions/v1/buffer   (needs a signed-in staff member: Authorization: Bearer <Supabase session token>)
//   { action: "status" }                                              -> { ok, connected, organizations:[{id,name}], channels:[{id,name,service,avatar,paused,org}] }
//   { action: "post", channel_ids, text, image_urls, mode, due_at? }  -> { ok, results:[{channel_id, service, name, ok, post_id?, error?}] }
//        mode: "shareNow" (post now), "addToQueue" (next free slot in Buffer), "customScheduled" (with due_at, ISO time)
//
// Secret (Supabase Dashboard > Edge Functions > Secrets):
//   BUFFER_API_KEY   your personal key from publish.buffer.com/settings/api (only the organization owner can create one)
// SUPABASE_URL and SUPABASE_SECRET_KEYS (or SUPABASE_SERVICE_ROLE_KEY) are provided by Supabase automatically.
//
// The Buffer key is only read here. It is never sent to the browser, stored in a table or written to the logs.
// Deploy with "Verify JWT" OFF (the new publishable keys are not JWTs); this function checks the staff login itself.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
function serverKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try { const keys = JSON.parse(raw); const k = typeof keys === "string" ? keys : (keys.default ?? Object.values(keys)[0]); if (k) return String(k); }
    catch { if (raw.startsWith("sb_secret_")) return raw; }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
const db = createClient(SUPABASE_URL, serverKey(), { auth: { persistSession: false, autoRefreshToken: false } });
const BUFFER = "https://api.buffer.com";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": SITE_URL && origin && !origin.startsWith(SITE_URL) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin) ? SITE_URL : (origin ?? "*"),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (o: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
class Fail extends Error { constructor(public code: string, msg: string, public status = 400) { super(msg); } }

async function staffUser(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data?.user) return null;
  const { data: row } = await db.from("staff").select("role").eq("user_id", data.user.id).maybeSingle();
  return row ? { id: data.user.id, role: String(row.role) } : null;
}

// One GraphQL call to Buffer
async function gql(query: string, variables: Record<string, unknown> = {}) {
  const key = Deno.env.get("BUFFER_API_KEY");
  if (!key) throw new Fail("not_connected", "Buffer is not connected yet. Add your Buffer API key as the BUFFER_API_KEY secret (README Part 61).", 503);
  let r: Response;
  try {
    r = await fetch(BUFFER, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) });
  } catch { throw new Fail("unreachable", "Could not reach Buffer. Please try again in a minute.", 502); }
  if (r.status === 401 || r.status === 403) throw new Fail("auth", "Buffer did not accept the API key. It may have expired: make a new one in Buffer and update BUFFER_API_KEY.", 401);
  if (r.status === 429) throw new Fail("limit", "Buffer's request limit for your plan has been reached. Try again later.", 429);
  const j = await r.json().catch(() => ({}));
  if (Array.isArray(j.errors) && j.errors.length) {
    const m = String(j.errors[0]?.message ?? "Buffer returned an error");
    if (/unauth|not authorized|invalid token|api key/i.test(m)) throw new Fail("auth", "Buffer did not accept the API key. Make a new one in Buffer and update BUFFER_API_KEY.", 401);
    throw new Fail("buffer", m.slice(0, 300), 502);
  }
  return j.data ?? {};
}

async function channels() {
  const d = await gql(`query Orgs { account { organizations { id name } } }`);
  const orgs: { id: string; name: string }[] = d?.account?.organizations ?? [];
  const out: { id: string; name: string; service: string; avatar: string | null; paused: boolean; org: string }[] = [];
  for (const o of orgs) {
    const c = await gql(`query Channels($org: OrganizationId!) { channels(input: { organizationId: $org }) { id name displayName service avatar isQueuePaused } }`, { org: o.id });
    for (const ch of c?.channels ?? []) out.push({ id: ch.id, name: ch.displayName || ch.name, service: String(ch.service), avatar: ch.avatar ?? null, paused: !!ch.isQueuePaused, org: o.name });
  }
  return { organizations: orgs, channels: out };
}

const LIMIT: Record<string, number> = { twitter: 280, bluesky: 300, threads: 500, mastodon: 500, instagram: 2200, tiktok: 2200, linkedin: 3000, pinterest: 500, googlebusiness: 1500 };
function fit(text: string, service: string) {
  const max = LIMIT[service];
  if (!max || text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}
function metadataFor(service: string) {
  if (service === "instagram") return { instagram: { type: "post", shouldShareToFeed: true } };
  if (service === "facebook") return { facebook: { type: "post" } };
  return undefined;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST" }, 405, origin);
  try {
    const who = await staffUser(req);
    if (!who) throw new Fail("auth_staff", "Please log in to the staff area again.", 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "status") {
      if (!Deno.env.get("BUFFER_API_KEY")) return json({ ok: true, connected: false, organizations: [], channels: [] }, 200, origin);
      return json({ ok: true, connected: true, ...(await channels()) }, 200, origin);
    }

    if (action === "post") {
      if (who.role !== "admin") throw new Fail("admin_only", "Only admins can post to the social channels.", 403);
      const ids: string[] = Array.isArray(body.channel_ids) ? body.channel_ids.map(String).slice(0, 20) : [];
      const text = String(body.text ?? "").slice(0, 5000);
      const images: string[] = Array.isArray(body.image_urls) ? body.image_urls.map(String).filter((u: string) => /^https:\/\//.test(u)).slice(0, 10) : [];
      const mode = ["shareNow", "addToQueue", "customScheduled", "shareNext"].includes(body.mode) ? body.mode : "addToQueue";
      const dueAt = mode === "customScheduled" ? String(body.due_at ?? "") : "";
      if (!ids.length) throw new Fail("no_channels", "Choose at least one channel.");
      if (!text.trim() && !images.length) throw new Fail("empty", "Add a caption or a photo.");
      if (mode === "customScheduled" && (!dueAt || isNaN(Date.parse(dueAt)) || Date.parse(dueAt) < Date.now() - 60000)) throw new Fail("bad_time", "Choose a time in the future.");
      const all = (await channels()).channels, results = [];
      for (const id of ids) {
        const ch = all.find((c) => c.id === id);
        if (!ch) { results.push({ channel_id: id, ok: false, error: "This channel is no longer in your Buffer account." }); continue; }
        if (ch.service === "instagram" && !images.length) { results.push({ channel_id: id, service: ch.service, name: ch.name, ok: false, error: "Instagram needs at least one photo." }); continue; }
        const input: Record<string, unknown> = { channelId: id, text: fit(text, ch.service), schedulingType: "automatic", mode,
          assets: images.map((url) => ({ image: { url } })), source: "kulsumscollection.com" };
        const md = metadataFor(ch.service); if (md) input.metadata = md;
        if (dueAt) input.dueAt = new Date(dueAt).toISOString();
        try {
          const d = await gql(`mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`, { input });
          const r = d?.createPost ?? {};
          if (r?.post?.id) results.push({ channel_id: id, service: ch.service, name: ch.name, ok: true, post_id: r.post.id });
          else results.push({ channel_id: id, service: ch.service, name: ch.name, ok: false, error: String(r?.message ?? "Buffer did not accept this post.").slice(0, 300) });
        } catch (e) {
          if (e instanceof Fail && (e.code === "auth" || e.code === "limit" || e.code === "not_connected")) throw e;
          results.push({ channel_id: id, service: ch.service, name: ch.name, ok: false, error: (e as Error).message.slice(0, 300) });
        }
      }
      return json({ ok: true, results }, 200, origin);
    }
    throw new Fail("bad_request", "Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ ok: false, code: e.code, message: e.message }, e.status, origin);
    console.error("buffer function failed", (e as Error)?.name ?? "error");   // never logs keys or captions
    return json({ ok: false, code: "server", message: "Something went wrong. Please try again." }, 500, origin);
  }
});
