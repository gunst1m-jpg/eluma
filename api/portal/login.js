// /api/portal/login.js — partner ber om innloggingslenke.
// POST { epost }. Finner partner på e-post, lager en engangs-token (30 min),
// lagrer KUN hashen, og sender en lenke via Resend. Svaret er alltid nøytralt
// (avslører ikke om e-posten finnes hos oss).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VARSEL_FRA, SITE_URL

import { sbHeaders, nyToken, hashToken } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ feil: "Kun POST" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const epost = String(body.epost || "").trim().toLowerCase();
  if (!epost || !epost.includes("@")) return res.status(400).json({ feil: "Oppgi en gyldig e-post." });

  const noytral = () =>
    res.status(200).json({ ok: true, melding: "Hvis e-posten er registrert hos oss, har vi sendt en innloggingslenke." });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const r = await fetch(
      `${url}/rest/v1/partnere?epost=eq.${encodeURIComponent(epost)}&select=id,firma&limit=1`,
      { headers: sbHeaders(key) }
    );
    const partner = (r.ok ? await r.json() : [])[0];
    if (!partner) return noytral(); // ikke avslør at e-posten ikke finnes

    const raw = nyToken();
    const utlop = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutter
    const lagre = await fetch(`${url}/rest/v1/partner_token`, {
      method: "POST",
      headers: { ...sbHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({ partner_id: partner.id, token_hash: hashToken(raw), utlop }),
    });
    if (!lagre.ok) {
      console.error("Token-lagring feilet:", await lagre.text());
      return res.status(500).json({ feil: "Noe gikk galt. Prøv igjen." });
    }

    const base = process.env.SITE_URL || "";
    const lenke = `${base}/api/portal/verifiser?token=${encodeURIComponent(raw)}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.VARSEL_FRA,
        to: epost,
        subject: "Logg inn på Eluma-portalen",
        html: epostHtml(partner.firma, lenke),
      }),
    });

    return noytral();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Noe gikk galt. Prøv igjen." });
  }
}

function epostHtml(firma, lenke) {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#191C19">
    <h2 style="font-size:19px;margin:0 0 6px">Logg inn på Eluma</h2>
    <p style="margin:0 0 18px;color:#7C7B72;font-size:14px;line-height:1.6">
      Hei ${firma || ""}! Trykk på knappen for å logge inn på partnerportalen.
      Lenken varer i 30 minutter og kan brukes én gang.
    </p>
    <a href="${lenke}" style="display:inline-block;background:#C6F24E;color:#191C19;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px">Logg inn</a>
    <p style="margin:18px 0 0;font-size:12.5px;color:#7C7B72">Ba du ikke om denne lenken? Da kan du se bort fra e-posten.</p>
  </div>`;
}
