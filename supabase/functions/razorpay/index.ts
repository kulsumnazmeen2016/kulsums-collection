// Kulsums Collection: online payments with Razorpay (UPI, cards, net banking, wallets).
// Supabase Edge Function. Runs on Supabase's servers, never in the browser.
//
// POST /functions/v1/razorpay
//   { action: "create", order_id, phone }   -> { ok, key_id, rzp_order_id, amount, currency }
//        Anyone with the order number AND the phone used at checkout. The amount always comes from the saved order,
//        never from the browser.
//   { action: "verify", order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } -> { ok, paid }
//        Checks Razorpay's signature with the Key Secret, then asks Razorpay that the payment is really captured,
//        and only then marks the order as paid.
//   { action: "status" }   (staff only) -> { ok, configured, mode: "test"|"live", webhook }
//   Webhook from Razorpay (header X-Razorpay-Signature): payment.captured / order.paid mark the order paid even if
//   the customer closed the page before it finished.
//
// Secrets (Supabase Dashboard > Edge Functions > Secrets):
//   RAZORPAY_KEY_ID          rzp_live_... (or rzp_test_... while testing)
//   RAZORPAY_KEY_SECRET      the Key Secret shown once when you make the key in Razorpay
//   RAZORPAY_WEBHOOK_SECRET  optional: the secret you type when adding the webhook in Razorpay
// The Key Secret is only read here. It is never sent to the browser, stored in a table or written to the logs.
// Deploy with "Verify JWT" OFF: customers pay without a login, and Razorpay's webhook has no Supabase login.

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
const RZP = "https://api.razorpay.com/v1";
const KEY_ID = () => (Deno.env.get("RAZORPAY_KEY_ID") ?? "").trim();
const KEY_SECRET = () => (Deno.env.get("RAZORPAY_KEY_SECRET") ?? "").trim();
const HOOK_SECRET = () => (Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "").trim();

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (o: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
class Fail extends Error { constructor(public code: string, msg: string, public status = 400) { super(msg); } }

const enc = new TextEncoder();
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sameText(a: string, b: string) {   // compare without leaking timing
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
async function rzp(path: string, method = "GET", body?: unknown) {
  if (!KEY_ID() || !KEY_SECRET()) throw new Fail("not_configured", "Online payment is not set up yet. Please choose another payment method or message us.", 503);
  let r: Response;
  try {
    r = await fetch(RZP + path, { method, headers: { Authorization: "Basic " + btoa(`${KEY_ID()}:${KEY_SECRET()}`), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Fail("unreachable", "Could not reach Razorpay. Please try again in a minute.", 502); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Fail("auth", "Razorpay did not accept the keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.", 502);
  if (!r.ok) throw new Fail("razorpay", String(j?.error?.description ?? "Razorpay could not do this right now.").slice(0, 200), 502);
  return j;
}
const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

async function loadOrder(id: string) {
  const { data, error } = await db.from("orders").select("id, phone, data").eq("id", id).maybeSingle();
  if (error || !data) throw new Fail("no_order", "We could not find this order.", 404);
  return data as { id: string; phone: string; data: Record<string, any> };
}
async function saveOrder(id: string, data: Record<string, any>) {
  const { error } = await db.from("orders").update({ data }).eq("id", id);
  if (error) throw new Fail("save", "The payment went through, but the order could not be updated. Please message us with your order number.", 500);
}
// Mark paid once, from the browser check or the webhook, whichever comes first
async function markPaid(id: string, rzpOrderId: string, pay: Record<string, any>) {
  const row = await loadOrder(id);
  const o = row.data;
  if (o?.payment?.rzpOrder !== rzpOrderId) throw new Fail("mismatch", "This payment does not belong to this order.", 400);
  if (o.payment.status === "paid") return o;
  const amount = Number(pay.amount) / 100;
  if (Math.round(Number(o.total) * 100) !== Number(pay.amount)) {
    o.payment = { ...o.payment, status: "partial", paidAmount: amount, ref: pay.id, method: "razorpay" };
  } else {
    o.payment = { ...o.payment, status: "paid", paidAmount: amount, ref: pay.id, method: "razorpay", paidAt: Date.now(), via: String(pay.method ?? "") };
  }
  o.editLog = [...(o.editLog ?? []), { at: Date.now(), by: "Razorpay", what: `Paid ₹${amount} online (${pay.method ?? "Razorpay"}, ${pay.id})` }];
  await saveOrder(id, o);
  return o;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST" }, 405, origin);
  try {
    // ---------- webhook from Razorpay ----------
    const hookSig = req.headers.get("x-razorpay-signature");
    if (hookSig) {
      const raw = await req.text();
      if (!HOOK_SECRET() || !sameText(await hmacHex(HOOK_SECRET(), raw), hookSig)) return json({ ok: false }, 401);
      const ev = JSON.parse(raw);
      const pay = ev?.payload?.payment?.entity;
      if ((ev?.event === "payment.captured" || ev?.event === "order.paid") && pay?.order_id) {
        const id = String(pay.notes?.order_id ?? ev?.payload?.order?.entity?.receipt ?? "");
        if (/^KC-[A-Z0-9]{5,10}$/.test(id)) { try { await markPaid(id, pay.order_id, pay); } catch (e) { if (!(e instanceof Fail)) throw e; } }
      }
      return json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "status") {
      const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data } = jwt ? await db.auth.getUser(jwt) : { data: null };
      const uid = data?.user?.id;
      const { data: staff } = uid ? await db.from("staff").select("role").eq("user_id", uid).maybeSingle() : { data: null };
      if (!staff) throw new Fail("auth_staff", "Please log in to the staff area again.", 401);
      const configured = !!(KEY_ID() && KEY_SECRET());
      let works = false, problem = "";
      if (configured) { try { await rzp("/orders?count=1"); works = true; } catch (e) { problem = (e as Error).message; } }
      return json({ ok: true, configured, works, problem, mode: KEY_ID().startsWith("rzp_live_") ? "live" : configured ? "test" : "", webhook: !!HOOK_SECRET() }, 200, origin);
    }

    const id = String(body.order_id ?? "").toUpperCase().trim();
    if (!/^KC-[A-Z0-9]{5,10}$/.test(id)) throw new Fail("bad_order", "This order number does not look right.");

    if (action === "create") {
      const row = await loadOrder(id);
      if (digits(row.phone).slice(-10) !== digits(body.phone).slice(-10)) throw new Fail("no_order", "We could not find this order.", 404);
      const o = row.data;
      if (o.payment?.status === "paid") return json({ ok: true, paid: true }, 200, origin);
      if (o.status === "cancelled") throw new Fail("cancelled", "This order was cancelled.");
      if (o.intl) throw new Fail("intl", "Orders from abroad are paid another way. Please message us.");
      if (!["pending", "partial"].includes(o.payment?.status)) throw new Fail("not_due", "This order does not need an online payment.");
      const due = Math.round((Number(o.total) - (o.payment?.status === "partial" ? Number(o.payment?.paidAmount) || 0 : 0)) * 100);
      if (!(due >= 100)) throw new Fail("no_amount", "The price of this order is not confirmed yet.");
      let rzpOrder = o.payment?.rzpOrder, amount = Number(o.payment?.rzpAmount);
      if (!rzpOrder || amount !== due) {
        const r = await rzp("/orders", "POST", { amount: due, currency: "INR", receipt: id, notes: { order_id: id } });
        rzpOrder = r.id; amount = due;
        o.payment = { ...o.payment, rzpOrder, rzpAmount: due };
        await saveOrder(id, o);
      }
      const c = o.customer ?? {};
      return json({ ok: true, key_id: KEY_ID(), rzp_order_id: rzpOrder, amount, currency: "INR",
        prefill: { name: String(c.name ?? "").slice(0, 60), contact: digits(c.phone), email: String(c.email ?? "").slice(0, 80) } }, 200, origin);
    }

    if (action === "verify") {
      const rzpOrderId = String(body.razorpay_order_id ?? ""), payId = String(body.razorpay_payment_id ?? ""), sig = String(body.razorpay_signature ?? "");
      if (!KEY_SECRET()) throw new Fail("not_configured", "Online payment is not set up yet.", 503);
      if (!rzpOrderId || !payId || !sig || !sameText(await hmacHex(KEY_SECRET(), `${rzpOrderId}|${payId}`), sig)) throw new Fail("bad_signature", "We could not confirm this payment. If money was taken, message us with your order number.");
      let pay = await rzp(`/payments/${encodeURIComponent(payId)}`);
      if (pay.order_id !== rzpOrderId) throw new Fail("mismatch", "This payment does not belong to this order.");
      if (pay.status === "authorized") pay = await rzp(`/payments/${encodeURIComponent(payId)}/capture`, "POST", { amount: pay.amount, currency: pay.currency });
      if (pay.status !== "captured") throw new Fail("not_captured", "The payment is not complete yet. If money was taken, it will show here within a few minutes.");
      const o = await markPaid(id, rzpOrderId, pay);
      return json({ ok: true, paid: o.payment.status === "paid", payment: { status: o.payment.status, ref: o.payment.ref, paidAmount: o.payment.paidAmount } }, 200, origin);
    }
    throw new Fail("bad_request", "Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ ok: false, code: e.code, message: e.message }, e.status, origin);
    console.error("razorpay function failed", (e as Error)?.name ?? "error");   // never logs keys, signatures or customer details
    return json({ ok: false, code: "server", message: "Something went wrong. Please try again." }, 500, origin);
  }
});
