// Kulsums Collection: customer sign-in with a one-time code (OTP) by SMS or WhatsApp
// Supabase Edge Function. Runs on Supabase's servers, never in the browser.
//
// POST /functions/v1/customer-otp
//   { action: "send",     phone }                       -> { ok: true, wait: 45 }
//   { action: "verify",   phone, code, name? }           -> { token_hash } or { need_name: true, ticket }
//   { action: "complete", phone, ticket, name }          -> { token_hash }
// The browser then calls supabase.auth.verifyOtp({ token_hash, type: "email" }) to open the customer's session.
// It is the SAME account as the mobile number + password sign-in, so the shopping history is shared.
//
// Secrets (Supabase Dashboard > Edge Functions > Secrets). Choose ONE provider with OTP_PROVIDER:
//   OTP_PROVIDER = twilio | msg91 | whatsapp
//   twilio   : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID, optional OTP_CHANNEL = sms | whatsapp (default sms)
//   msg91    : MSG91_AUTHKEY, MSG91_TEMPLATE_ID (an approved OTP template; India needs DLT registration)
//   whatsapp : WA_TOKEN (permanent system-user token), WA_PHONE_ID, WA_TEMPLATE (approved "authentication" template), optional WA_LANG (default en)
//   optional : SITE_URL (your website, for CORS), CUSTOMER_EMAIL_DOMAIN (default customers.kulsumscollection.com)
// SUPABASE_URL and SUPABASE_SECRET_KEYS (or SUPABASE_SERVICE_ROLE_KEY) are provided by Supabase automatically.
//
// Deploy with "Verify JWT" turned OFF (shoppers are not signed in yet). This function does its own checks:
// limits on how often codes are sent and tried, and codes are never stored in plain text or logged.

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
const SERVICE_KEY = serverKey();
const PROVIDER = (Deno.env.get("OTP_PROVIDER") ?? "").toLowerCase();
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const DOMAIN = Deno.env.get("CUSTOMER_EMAIL_DOMAIN") ?? "customers.kulsumscollection.com";
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": SITE_URL && origin && !origin.startsWith(SITE_URL) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin) ? SITE_URL : (origin ?? "*"),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (o: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
class Fail extends Error { constructor(public code: string, msg: string, public status = 400) { super(msg); } }

// 91XXXXXXXXXX for Indian numbers; other countries keep their country code
function digits(x: unknown): string {
  let d = String(x ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d; else if (d.length === 11 && d[0] === "0") d = "91" + d.slice(1);
  if (d.length < 11 || d.length > 15) throw new Fail("bad_phone", "Enter your 10-digit mobile number, or your number with the country code.");
  return d;
}
async function sha(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + "|" + SERVICE_KEY.slice(-24)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const randomCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
const randomToken = () => [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, "0")).join("");

// ---------- limits ----------
async function limit(phone: string, ip: string, kind: "send" | "verify") {
  const since = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  const count = async (col: string, val: string, mins: number) => {
    const { count } = await db.from("otp_log").select("id", { count: "exact", head: true }).eq(col, val).eq("kind", kind).gte("at", since(mins));
    return count ?? 0;
  };
  if (kind === "send") {
    if (await count("phone", phone, 0.75) > 0) throw new Fail("wait", "Please wait a moment before asking for another code.", 429);
    if (await count("phone", phone, 60) >= 5) throw new Fail("too_many", "Too many codes for this number. Please try again in an hour, or sign in with your password.", 429);
    if (ip && await count("ip", ip, 60) >= 25) throw new Fail("too_many", "Too many codes from this connection. Please try again later.", 429);
  } else {
    if (await count("phone", phone, 15) >= 8) throw new Fail("too_many", "Too many tries. Please wait 15 minutes and ask for a new code.", 429);
  }
  await db.from("otp_log").insert({ phone, ip: ip || null, kind });
}

// ---------- providers ----------
async function providerSend(phone: string) {
  if (PROVIDER === "twilio") {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID"), tok = Deno.env.get("TWILIO_AUTH_TOKEN"), vs = Deno.env.get("TWILIO_VERIFY_SID");
    if (!sid || !tok || !vs) throw new Fail("not_set_up", "Code sign-in is not set up yet.", 503);
    const r = await fetch(`https://verify.twilio.com/v2/Services/${vs}/Verifications`, { method: "POST",
      headers: { Authorization: "Basic " + btoa(`${sid}:${tok}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: "+" + phone, Channel: (Deno.env.get("OTP_CHANNEL") ?? "sms").toLowerCase() }) });
    if (!r.ok) throw new Fail("send_failed", "The code could not be sent to this number. Check it, or sign in with your password.", 502);
    return;
  }
  if (PROVIDER === "msg91") {
    const key = Deno.env.get("MSG91_AUTHKEY"), tpl = Deno.env.get("MSG91_TEMPLATE_ID");
    if (!key || !tpl) throw new Fail("not_set_up", "Code sign-in is not set up yet.", 503);
    const r = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(tpl)}&mobile=${phone}&otp_length=6&otp_expiry=10`, { method: "POST", headers: { authkey: key, "Content-Type": "application/json" }, body: "{}" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.type === "error") throw new Fail("send_failed", "The code could not be sent to this number. Check it, or sign in with your password.", 502);
    return;
  }
  if (PROVIDER === "whatsapp") {
    const tok = Deno.env.get("WA_TOKEN"), pid = Deno.env.get("WA_PHONE_ID"), tpl = Deno.env.get("WA_TEMPLATE");
    if (!tok || !pid || !tpl) throw new Fail("not_set_up", "Code sign-in is not set up yet.", 503);
    const code = randomCode();
    await db.from("otp_codes").upsert({ phone, hash: await sha(phone + ":" + code), expires_at: new Date(Date.now() + 10 * 60000).toISOString(), tries: 0, ticket: null, ticket_until: null });
    const r = await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "template", template: { name: tpl, language: { code: Deno.env.get("WA_LANG") ?? "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: code }] }, { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] }] } }) });
    if (!r.ok) throw new Fail("send_failed", "The code could not be sent on WhatsApp. Check the number, or sign in with your password.", 502);
    return;
  }
  throw new Fail("not_set_up", "Code sign-in is not set up yet. Please sign in with your password.", 503);
}
async function providerCheck(phone: string, code: string): Promise<boolean> {
  if (!/^\d{4,8}$/.test(code)) return false;
  if (PROVIDER === "twilio") {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!, tok = Deno.env.get("TWILIO_AUTH_TOKEN")!, vs = Deno.env.get("TWILIO_VERIFY_SID")!;
    const r = await fetch(`https://verify.twilio.com/v2/Services/${vs}/VerificationCheck`, { method: "POST",
      headers: { Authorization: "Basic " + btoa(`${sid}:${tok}`), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: "+" + phone, Code: code }) });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.status === "approved";
  }
  if (PROVIDER === "msg91") {
    const r = await fetch(`https://control.msg91.com/api/v5/otp/verify?otp=${code}&mobile=${phone}`, { headers: { authkey: Deno.env.get("MSG91_AUTHKEY")! } });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.type === "success";
  }
  if (PROVIDER === "whatsapp") {
    const { data } = await db.from("otp_codes").select("hash,expires_at,tries").eq("phone", phone).maybeSingle();
    if (!data || Date.parse(data.expires_at) < Date.now() || data.tries >= 5) return false;
    const ok = data.hash === await sha(phone + ":" + code);
    await db.from("otp_codes").update(ok ? { hash: "used", expires_at: new Date().toISOString() } : { tries: data.tries + 1 }).eq("phone", phone);
    return ok;
  }
  return false;
}

// ---------- the customer's account ----------
async function findCustomer(phone: string): Promise<string | null> {
  const { data } = await db.from("customers").select("user_id").eq("phone", phone).maybeSingle();
  if (data?.user_id) return data.user_id;
  const { data: d2 } = await db.from("customers").select("user_id,phone").like("phone", "%" + phone.slice(-10)).limit(1);
  return d2?.[0]?.user_id ?? null;
}
async function sessionFor(phone: string, name?: string): Promise<{ token_hash: string; created: boolean }> {
  const email = `c${phone}@${DOMAIN}`;
  let created = false;
  const uid = await findCustomer(phone);
  if (!uid) {
    if (!name || !name.trim()) throw new Fail("need_name", "need_name");
    const { error } = await db.auth.admin.createUser({ email, email_confirm: true, password: randomToken(),
      user_metadata: { kind: "customer", name: name.trim().slice(0, 60), phone, contact_email: "" } });
    if (error && !/already|registered|exists/i.test(error.message)) throw new Fail("create_failed", "Could not create your account. Please try again.", 500);
    created = !error;
  } else {
    const { data } = await db.auth.admin.getUserById(uid);
    if (data?.user?.email && data.user.email !== email) {
      // an account made another way: sign in to that same account
      const { data: l, error } = await db.auth.admin.generateLink({ type: "magiclink", email: data.user.email });
      if (error || !l?.properties?.hashed_token) throw new Fail("link_failed", "Could not sign you in. Please try again.", 500);
      return { token_hash: l.properties.hashed_token, created };
    }
  }
  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link?.properties?.hashed_token) throw new Fail("link_failed", "Could not sign you in. Please try again.", 500);
  return { token_hash: link.properties.hashed_token, created };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405, origin);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    if (action === "status") return json({ ok: true, provider: PROVIDER || null, ready: !!PROVIDER }, 200, origin);
    const phone = digits(body.phone);
    if (action === "send") {
      await limit(phone, ip, "send");
      await providerSend(phone);
      return json({ ok: true, wait: 45 }, 200, origin);
    }
    if (action === "verify") {
      await limit(phone, ip, "verify");
      if (!await providerCheck(phone, String(body.code ?? "").trim())) throw new Fail("wrong_code", "That code is not right, or it has expired. Check it, or ask for a new one.");
      try { return json(await sessionFor(phone, body.name), 200, origin); }
      catch (e) {
        if (e instanceof Fail && e.code === "need_name") {
          // new customer: the code was right; keep a short ticket so they only need to add their name
          const ticket = randomToken();
          await db.from("otp_codes").upsert({ phone, hash: "used", expires_at: new Date().toISOString(), tries: 0, ticket: await sha(phone + ":" + ticket), ticket_until: new Date(Date.now() + 10 * 60000).toISOString() });
          return json({ need_name: true, ticket }, 200, origin);
        }
        throw e;
      }
    }
    if (action === "complete") {
      const { data } = await db.from("otp_codes").select("ticket,ticket_until").eq("phone", phone).maybeSingle();
      if (!data?.ticket || Date.parse(data.ticket_until) < Date.now() || data.ticket !== await sha(phone + ":" + String(body.ticket ?? ""))) throw new Fail("expired", "This sign-in has expired. Please ask for a new code.");
      const out = await sessionFor(phone, String(body.name ?? ""));
      await db.from("otp_codes").update({ ticket: null, ticket_until: null }).eq("phone", phone);
      return json(out, 200, origin);
    }
    return json({ error: "Unknown action" }, 400, origin);
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message, code: e.code }, e.status, origin);
    console.error("customer-otp failed", (e as Error)?.name ?? "error");   // never log numbers or codes
    return json({ error: "Something went wrong. Please try again.", code: "server" }, 500, origin);
  }
});
