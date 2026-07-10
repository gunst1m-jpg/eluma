// /api/portal/_auth.js — delt hjelpelogikk for partnerportalen.
// Understrek-prefiks => Vercel ruter den IKKE som et eget endepunkt; den importeres av de andre.
//
// Sesjon: en HMAC-signert httpOnly-cookie (ingen sesjonstabell). Innhold: { pid, exp }.
// Magisk lenke: en rå engangs-token sendes på e-post; KUN sha256-hashen lagres i databasen.
//
// Env som trengs: PORTAL_SECRET (lang tilfeldig streng — signerer cookien),
//                 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (brukes av de som importerer).

import crypto from "node:crypto";

export const COOKIE = "eluma_portal";
export const SESJON_DAGER = 30;

export function sbHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

// --- magisk token ---
export function nyToken() {
  return crypto.randomBytes(32).toString("base64url"); // rå token — havner kun i e-postlenken
}
export function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex"); // dette lagres
}

// --- sesjon (signert cookie) ---
export function lagSesjon(partnerId, dager = SESJON_DAGER) {
  const secret = process.env.PORTAL_SECRET;
  if (!secret) throw new Error("PORTAL_SECRET mangler");
  const payload = Buffer.from(JSON.stringify({ pid: partnerId, exp: Date.now() + dager * 864e5 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function lesSesjon(req) {
  try {
    const secret = process.env.PORTAL_SECRET;
    if (!secret) return null;
    const rad = (req.headers.cookie || "")
      .split(";").map((c) => c.trim()).find((c) => c.startsWith(COOKIE + "="));
    if (!rad) return null;
    const verdi = decodeURIComponent(rad.slice(COOKIE.length + 1));
    const [payload, sig] = verdi.split(".");
    if (!payload || !sig) return null;
    const forventet = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
    const a = Buffer.from(sig), b = Buffer.from(forventet);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.pid || !data.exp || data.exp < Date.now()) return null;
    return data.pid;
  } catch {
    return null;
  }
}

export function settCookie(res, verdi, maxAgeSek) {
  res.setHeader("Set-Cookie", [
    `${COOKIE}=${encodeURIComponent(verdi)}`,
    "Path=/", "HttpOnly", "SameSite=Lax", "Secure", `Max-Age=${maxAgeSek}`,
  ].join("; "));
}

export function slettCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`);
}

// Returnerer partner-id fra sesjonen, eller sender 401 og returnerer null.
export function krevPartner(req, res) {
  const pid = lesSesjon(req);
  if (!pid) { res.status(401).json({ feil: "Ikke innlogget" }); return null; }
  return pid;
}
