// Kulsums Collection: Instagram publishing (Instagram API with Instagram Login)
// Supabase Edge Function. Runs on Supabase's servers, never in the browser.
//
// Routes:
//   POST /functions/v1/instagram        { action: "status" | "connect" | "disconnect" | "publish" | "media_page", ... }
//                                       media_page (admins): a few of your own posts with their photos, to recover lost product photos
//                                       needs the staff member's login (Authorization: Bearer <Supabase session token>)
//   GET  /functions/v1/instagram/callback?code=...&state=...    (Instagram redirects here after login)
//
// Secrets (Supabase Dashboard > Edge Functions > Secrets):
//   IG_APP_ID        Instagram App ID     (App Dashboard > Instagram > API setup with Instagram login)
//   IG_APP_SECRET    Instagram App Secret (same place)
//   IG_TOKEN_KEY     32 random bytes, base64 (used to encrypt the access token at rest)
//   SITE_URL         optional, e.g. https://kulsumscollection.in (allowed website for CORS and redirects)
//   IG_API_VERSION   optional, default v25.0
//   SUPABASE_URL and SUPABASE_SECRET_KEYS (or the older SUPABASE_SERVICE_ROLE_KEY) are provided by Supabase automatically.
//
// Access tokens are encrypted (AES-GCM) and stored in a table that browsers cannot read. They are never
// returned to the browser and never logged.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Works with both Supabase key systems: the new secret keys (SUPABASE_SECRET_KEYS) and the older service role key.
function serverKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      const k = typeof keys === "string" ? keys : (keys.default ?? Object.values(keys)[0]);
      if (k) return String(k);
    } catch { if (raw.startsWith("sb_secret_")) return raw; }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
const SERVICE_KEY = serverKey();
const IG_APP_ID = Deno.env.get("IG_APP_ID") ?? "";
const IG_APP_SECRET = Deno.env.get("IG_APP_SECRET") ?? "";
const IG_TOKEN_KEY = Deno.env.get("IG_TOKEN_KEY") ?? "";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const API_VERSION = Deno.env.get("IG_API_VERSION") ?? "v25.0";
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/instagram/callback`;
const GRAPH = `https://graph.instagram.com/${API_VERSION}`;
const SCOPES = "instagram_business_basic,instagram_business_content_publish";
const PUBLIC_MEDIA = `${SUPABASE_URL}/storage/v1/object/public/`;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // Instagram's limit for images

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------- small helpers ----------
const MESSAGES: Record<string, string> = {
  not_connected: "Instagram account is not connected.",
  auth_expired: "Instagram authorization expired. Please reconnect.",
  image_inaccessible: "Product image cannot be accessed by Instagram.",
  media_rejected: "Instagram rejected the media.",
  unavailable: "Instagram publishing is temporarily unavailable. Please try again in a few minutes.",
  permission_missing: "Instagram API permission is missing. Please reconnect and allow publishing.",
  rate_limited: "Instagram's daily publishing limit has been reached. Please try again tomorrow.",
  already_published: "This product is already on Instagram.",
  in_progress: "This product is being published right now.",
  bad_request: "Something in the request was not right.",
  not_configured: "Instagram is not set up on the server yet (missing app ID, secret or key).",
};
function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = SITE_URL ? (origin === SITE_URL || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : SITE_URL) : (origin || "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
function fail(req: Request, code: string, status = 400, extra: Record<string, unknown> = {}) {
  return json(req, { ok: false, code, message: MESSAGES[code] ?? MESSAGES.unavailable, ...extra }, status);
}
const b64 = (a: Uint8Array) => btoa(String.fromCharCode(...a));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
let cryptoKey: CryptoKey | null = null;
async function key() {
  if (cryptoKey) return cryptoKey;
  const raw = unb64(IG_TOKEN_KEY);
  if (raw.length !== 32) throw new Error("IG_TOKEN_KEY must be 32 bytes, base64-encoded");
  cryptoKey = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  return cryptoKey;
}
async function encrypt(text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(text)));
  return `${b64(iv)}.${b64(c)}`;
}
async function decrypt(s: string) {
  const [iv, c] = s.split(".");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await key(), unb64(c)));
}
async function log(product_id: string | null, step: string, http_status: number | null, detail: unknown) {
  // Diagnostic details stay on the server (a table browsers cannot read). Never contains tokens.
  try { await db.from("instagram_publish_log").insert({ product_id, step, http_status, detail }); } catch { /* ignore */ }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Who is calling? Must be a signed-in staff member.
async function staffUser(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data?.user) return null;
  const { data: row } = await db.from("staff").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!row) return null;
  return { id: data.user.id, role: row.role as string };
}

// ---------- the stored connection ----------
type Conn = { instagram_user_id: string; instagram_username: string | null; account_type: string | null; access_token_enc: string; token_expires_at: string; token_refreshed_at: string };
async function getConn(): Promise<Conn | null> {
  const { data } = await db.from("instagram_connections").select("*").eq("id", 1).maybeSingle();
  return (data as Conn) ?? null;
}
// Long-lived tokens last 60 days. Refresh when less than 15 days are left (allowed once the token is 24 hours old).
async function freshToken(c: Conn): Promise<string | null> {
  const token = await decrypt(c.access_token_enc);
  const expires = new Date(c.token_expires_at).getTime(), refreshed = new Date(c.token_refreshed_at).getTime(), now = Date.now();
  if (expires <= now) return null;
  if (expires - now < 15 * 864e5 && now - refreshed > 864e5) {
    const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.access_token) {
      await db.from("instagram_connections").update({
        access_token_enc: await encrypt(d.access_token),
        token_expires_at: new Date(now + (Number(d.expires_in) || 5184000) * 1000).toISOString(),
        token_refreshed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", 1);
      return d.access_token;
    }
    await log(null, "refresh", r.status, d?.error ?? d);
  }
  return token;
}

// Map an Instagram error to one of our friendly codes.
function classify(err: any): string {
  const e = err?.error ?? err ?? {};
  const code = Number(e.code), sub = Number(e.error_subcode), msg = String(e.message ?? "").toLowerCase();
  if (code === 190 || e.type === "OAuthException" && /expired|session|invalid/.test(msg)) return "auth_expired";
  if (code === 10 || code === 200 || code === 3 || /permission/.test(msg)) return "permission_missing";
  if (sub === 2207042 || code === 9 || /limit/.test(msg) && /publish/.test(msg)) return "rate_limited";
  if ([2207003, 2207020, 2207026, 2207052].includes(sub) || code === 9004 || /media download|fetch|could not be downloaded|uri/.test(msg)) return "image_inaccessible";
  if ([2207001, 2207004, 2207005, 2207009, 2207010, 2207023, 2207028].includes(sub) || code === 36003 || /aspect ratio|format|media/.test(msg)) return "media_rejected";
  if ([1, 2, 4, 17, 32, 613].includes(code) || e.is_transient) return "unavailable";
  return "unavailable";
}
async function graph(path: string, token: string, method = "GET", body?: Record<string, unknown>) {
  const r = await fetch(`${GRAPH}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.error) { const err = new Error("graph") as any; err.status = r.status; err.detail = d?.error ?? d; throw err; }
  return d;
}

// ---------- OAuth ----------
async function connect(req: Request, user: { id: string }, body: any) {
  if (!IG_APP_ID || !IG_APP_SECRET || !IG_TOKEN_KEY) return fail(req, "not_configured", 500);
  const origin = req.headers.get("origin") ?? SITE_URL;
  const returnTo = String(body?.return_to ?? `${origin}/#/staff/settings?s=insta`);
  if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(returnTo)) return fail(req, "bad_request");
  const state = b64(crypto.getRandomValues(new Uint8Array(24))).replace(/[^a-zA-Z0-9]/g, "");
  await db.from("instagram_oauth_states").delete().lt("created_at", new Date(Date.now() - 864e5).toISOString());
  await db.from("instagram_oauth_states").insert({ state, user_id: user.id, return_to: returnTo });
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", IG_APP_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("enable_fb_login", "false");
  url.searchParams.set("force_reauth", "true");
  return json(req, { ok: true, url: url.toString() });
}
function back(returnTo: string, result: string) {
  const sep = returnTo.includes("?") ? "&" : (returnTo.includes("#") ? "?" : "#/staff/settings?s=insta&");
  return new Response(null, { status: 302, headers: { Location: `${returnTo}${sep}ig=${encodeURIComponent(result)}` } });
}
async function callback(url: URL) {
  const state = url.searchParams.get("state") ?? "";
  const { data: st } = await db.from("instagram_oauth_states").select("*").eq("state", state).maybeSingle();
  const fallback = SITE_URL ? `${SITE_URL}/#/staff/settings?s=insta` : "/";
  if (!st) return back(fallback, "state_invalid");
  await db.from("instagram_oauth_states").delete().eq("state", state); // one use only
  const returnTo = st.return_to || fallback;
  if (Date.now() - new Date(st.created_at).getTime() > 15 * 60000) return back(returnTo, "state_expired");
  if (url.searchParams.get("error")) return back(returnTo, "denied");
  const { data: who } = await db.from("staff").select("role").eq("user_id", st.user_id).maybeSingle();
  if (who?.role !== "admin") return back(returnTo, "not_admin");
  const code = (url.searchParams.get("code") ?? "").replace(/#_$/, "");
  if (!code) return back(returnTo, "error");
  try {
    // 1. code -> short-lived token
    const form = new FormData();
    form.set("client_id", IG_APP_ID); form.set("client_secret", IG_APP_SECRET);
    form.set("grant_type", "authorization_code"); form.set("redirect_uri", REDIRECT_URI); form.set("code", code);
    const r1 = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
    const d1 = await r1.json().catch(() => ({}));
    const first = Array.isArray(d1?.data) ? d1.data[0] : d1;
    if (!r1.ok || !first?.access_token) { await log(null, "oauth_exchange", r1.status, { error_type: d1?.error_type, error_message: d1?.error_message, code: d1?.code }); return back(returnTo, "error"); }
    const perms = String(first.permissions ?? "");
    if (perms && !perms.includes("instagram_business_content_publish")) return back(returnTo, "permission_missing");
    // 2. short-lived -> long-lived (60 days)
    const r2 = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(IG_APP_SECRET)}&access_token=${encodeURIComponent(first.access_token)}`);
    const d2 = await r2.json().catch(() => ({}));
    if (!r2.ok || !d2?.access_token) { await log(null, "oauth_long_lived", r2.status, d2?.error ?? {}); return back(returnTo, "error"); }
    // 3. who is it?
    const me = await graph("me?fields=user_id,username,account_type", d2.access_token);
    const igId = String(me.user_id ?? first.user_id);
    await db.from("instagram_connections").upsert({
      id: 1, instagram_user_id: igId, instagram_username: me.username ?? null, account_type: me.account_type ?? null,
      access_token_enc: await encrypt(d2.access_token),
      token_expires_at: new Date(Date.now() + (Number(d2.expires_in) || 5184000) * 1000).toISOString(),
      token_refreshed_at: new Date().toISOString(), connected_by: st.user_id, updated_at: new Date().toISOString(),
    });
    await log(null, "connected", 200, { username: me.username, account_type: me.account_type });
    return back(returnTo, "connected");
  } catch (e: any) {
    await log(null, "oauth", e?.status ?? null, e?.detail ?? String(e?.message ?? e));
    return back(returnTo, "error");
  }
}

// ---------- publishing ----------
async function checkImage(url: string) {
  if (!url.startsWith(PUBLIC_MEDIA)) return "image_inaccessible";
  try {
    let r = await fetch(url, { method: "HEAD" });
    if (r.status === 405) r = await fetch(url, { headers: { Range: "bytes=0-0" } });
    if (!r.ok && r.status !== 206) return "image_inaccessible";
    const type = (r.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("image/jpeg") && !type.includes("image/jpg")) return "media_rejected";
    const len = Number(r.headers.get("content-length") ?? 0);
    if (len > MAX_IMAGE_BYTES) return "media_rejected";
    return null;
  } catch { return "image_inaccessible"; }
}
async function publish(req: Request, user: { id: string }, body: any) {
  const productId = String(body?.product_id ?? "").slice(0, 80);
  const caption = String(body?.caption ?? "").slice(0, 2200);
  const images: string[] = Array.isArray(body?.image_urls) ? body.image_urls.map(String).slice(0, 10) : [];
  const force = body?.force === true;
  if (!productId || !images.length) return fail(req, images.length ? "bad_request" : "image_inaccessible");
  const c = await getConn();
  if (!c) return fail(req, "not_connected", 409);

  // Never publish the same product twice by accident.
  const { data: prev } = await db.from("instagram_posts").select("*").eq("product_id", productId).maybeSingle();
  if (prev?.status === "published" && !force) return fail(req, "already_published", 409, { media_id: prev.media_id, permalink: prev.permalink, published_at: prev.published_at });
  if (prev?.status === "publishing" && Date.now() - new Date(prev.updated_at).getTime() < 5 * 60000) return fail(req, "in_progress", 409);

  for (const u of images) { const bad = await checkImage(u); if (bad) { await log(productId, "image_check", null, { url: u, result: bad }); return saveFail(req, productId, bad, user, caption, images.length, prev); } }

  const token = await freshToken(c);
  if (!token) return saveFail(req, productId, "auth_expired", user, caption, images.length, prev);

  await db.from("instagram_posts").upsert({ product_id: productId, status: "publishing", caption, image_count: images.length, error_code: null, error_message: null,
    attempts: (prev?.attempts ?? 0) + 1, published_by: user.id, updated_at: new Date().toISOString() });
  const ig = c.instagram_user_id;
  try {
    let creation: string;
    if (images.length === 1) {
      creation = (await graph(`${ig}/media`, token, "POST", { image_url: images[0], caption })).id;
    } else {
      const kids: string[] = [];
      for (const u of images) kids.push((await graph(`${ig}/media`, token, "POST", { image_url: u, is_carousel_item: true })).id);
      creation = (await graph(`${ig}/media`, token, "POST", { media_type: "CAROUSEL", children: kids.join(","), caption })).id;
    }
    // Wait until Instagram has processed the photo(s).
    let status = "IN_PROGRESS";
    for (let i = 0; i < 20 && status === "IN_PROGRESS"; i++) {
      const s = await graph(`${creation}?fields=status_code`, token);
      status = s.status_code ?? "FINISHED";
      if (status === "IN_PROGRESS") await sleep(2000);
    }
    if (status === "ERROR" || status === "EXPIRED") { await log(productId, "container_status", null, { status }); return saveFail(req, productId, "media_rejected", user, caption, images.length, prev); }
    if (status === "IN_PROGRESS") return saveFail(req, productId, "unavailable", user, caption, images.length, prev);
    const media = await graph(`${ig}/media_publish`, token, "POST", { creation_id: creation });
    let permalink: string | null = null;
    try { permalink = (await graph(`${media.id}?fields=permalink`, token)).permalink ?? null; } catch { /* optional */ }
    const published_at = new Date().toISOString();
    await db.from("instagram_posts").upsert({ product_id: productId, status: "published", media_id: media.id, permalink, caption, image_count: images.length,
      error_code: null, error_message: null, attempts: (prev?.attempts ?? 0) + 1, published_at, published_by: user.id, updated_at: published_at });
    await log(productId, "published", 200, { media_id: media.id });
    return json(req, { ok: true, media_id: media.id, permalink, published_at });
  } catch (e: any) {
    await log(productId, "publish", e?.status ?? null, e?.detail ?? String(e?.message ?? e));
    return saveFail(req, productId, e?.detail ? classify(e.detail) : "unavailable", user, caption, images.length, prev);
  }
}
// ---------- photo recovery: read back the photos of your own posts ----------
// Returns up to 3 posts per call. Photos are fetched here (Instagram's photo links cannot be read by a browser page)
// and returned as image data. Only links that Instagram itself returned are fetched; the token never leaves the server.
const IG_CDN = /^https:\/\/[a-z0-9.-]+\.(cdninstagram\.com|fbcdn\.net)\//i;
async function mediaPage(req: Request, body: any) {
  const c = await getConn();
  if (!c) return fail(req, "not_connected", 409);
  const token = await freshToken(c);
  if (!token) return fail(req, "auth_expired", 401);
  const after = String(body?.after ?? "").replace(/[^A-Za-z0-9_=-]/g, "").slice(0, 400);
  const page = await graph(`${c.instagram_user_id}/media?fields=id,media_type,media_url,timestamp,children{media_type,media_url}&limit=3${after ? `&after=${after}` : ""}`, token);
  const items: { id: string; timestamp: string; images: string[] }[] = [];
  for (const m of page.data ?? []) {
    const urls: string[] = m.media_type === "CAROUSEL_ALBUM" ? (m.children?.data ?? []).filter((k: any) => k.media_type === "IMAGE").map((k: any) => k.media_url) : m.media_type === "IMAGE" ? [m.media_url] : [];
    const images: string[] = [];
    for (const u of urls.slice(0, 10)) {
      if (!u || !IG_CDN.test(u)) continue;
      try {
        const r = await fetch(u);
        const type = (r.headers.get("content-type") ?? "").toLowerCase();
        if (!r.ok || !type.startsWith("image/")) continue;
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf.byteLength > MAX_IMAGE_BYTES) continue;
        let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        images.push(`data:${type.split(";")[0]};base64,${btoa(bin)}`);
      } catch { /* skip this photo */ }
    }
    items.push({ id: String(m.id), timestamp: String(m.timestamp ?? ""), images });
  }
  return json(req, { ok: true, items, next: page.paging?.next ? (page.paging?.cursors?.after ?? null) : null });
}

async function saveFail(req: Request, productId: string, code: string, user: { id: string }, caption: string, n: number, prev: any) {
  // A product that was already published keeps its published record if a re-publish fails.
  if (prev?.status !== "published") {
    await db.from("instagram_posts").upsert({ product_id: productId, status: "failed", caption, image_count: n, error_code: code, error_message: MESSAGES[code] ?? MESSAGES.unavailable,
      attempts: (prev?.attempts ?? 0) + 1, published_by: user.id, updated_at: new Date().toISOString() });
  }
  return fail(req, code, code === "auth_expired" || code === "not_connected" ? 401 : 422);
}

// ---------- entry point ----------
Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method === "GET" && url.pathname.endsWith("/callback")) return callback(url);
  if (req.method !== "POST") return json(req, { ok: false, code: "bad_request" }, 405);
  const user = await staffUser(req);
  if (!user) return json(req, { ok: false, code: "auth", message: "Please log in to the staff area again." }, 401);
  const body = await req.json().catch(() => ({}));
  try {
    switch (body?.action) {
      case "status": {
        const c = await getConn();
        if (!c) return json(req, { ok: true, connected: false, configured: !!(IG_APP_ID && IG_APP_SECRET && IG_TOKEN_KEY) });
        const expired = new Date(c.token_expires_at).getTime() <= Date.now();
        if (!expired && user.role === "admin") { try { await freshToken(c); } catch { /* ignore */ } }
        const c2 = (await getConn()) ?? c;
        return json(req, { ok: true, connected: true, expired, username: c2.instagram_username, account_type: c2.account_type, token_expires_at: c2.token_expires_at });
      }
      case "connect": if (user.role !== "admin") return json(req, { ok: false, code: "auth", message: "Only admins can connect Instagram." }, 403); return connect(req, user, body);
      case "disconnect": if (user.role !== "admin") return json(req, { ok: false, code: "auth", message: "Only admins can disconnect Instagram." }, 403);
        await db.from("instagram_connections").delete().eq("id", 1); await log(null, "disconnected", 200, {}); return json(req, { ok: true });
      case "media_page": if (user.role !== "admin") return json(req, { ok: false, code: "auth", message: "Only admins can do this." }, 403); return mediaPage(req, body);
      case "publish": if (user.role !== "admin") return json(req, { ok: false, code: "auth", message: "Only admins can publish to Instagram." }, 403); return publish(req, user, body);
      default: return fail(req, "bad_request");
    }
  } catch (e: any) {
    await log(null, "server", null, String(e?.message ?? e));
    return fail(req, "unavailable", 500);
  }
});
