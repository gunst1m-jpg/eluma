// /api/portal/verifiser.js — partneren klikker på lenken fra e-posten.
// GET ?token=... . Slår opp hashen, sjekker at den ikke er brukt/utløpt,
// forbruker den (engangs), setter en signert sesjons-cookie og sender til /portal.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_SECRET

import { sbHeaders, hashToken, lagSesjon, settCookie, SESJON_DAGER } from "./_auth.js";

function side(tittel, tekst) {
  return `<!doctype html><html lang="no"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tittel} · Eluma</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0F120D;font-family:system-ui,-apple-system,sans-serif;color:#F4F3EE;padding:24px}
  .kort{max-width:380px;text-align:center;background:#15180F;border:1px solid rgba(255,255,255,.08);
    border-radius:22px;padding:40px 32px}
  .merke{font-weight:800;letter-spacing:-.02em;color:#C6F24E;font-size:22px;margin:0 0 20px}
  h1{font-size:20px;margin:0 0 10px;font-weight:700}
  p{color:#9AA093;font-size:15px;line-height:1.6;margin:0}
  a{color:#C6F24E}
</style></head>
<body><div class="kort"><p class="merke">eluma</p><h1>${tittel}</h1><p>${tekst}</p></div></body></html>`;
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const raw = searchParams.get("token");
    if (!raw) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(400).send(side("Ugyldig lenke", "Denne lenken ser ikke riktig ut."));
    }

    const hash = hashToken(raw);
    const r = await fetch(
      `${url}/rest/v1/partner_token?token_hash=eq.${hash}&select=id,partner_id,utlop,brukt&limit=1`,
      { headers: sbHeaders(key) }
    );
    const rad = (r.ok ? await r.json() : [])[0];

    if (!rad || rad.brukt || new Date(rad.utlop).getTime() < Date.now()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(side(
        "Lenken er utløpt",
        'Denne innloggingslenken er allerede brukt eller utløpt. Be om en ny på <a href="/portal">portalen</a>.'
      ));
    }

    // Forbruk token (engangs) — best-effort
    await fetch(`${url}/rest/v1/partner_token?id=eq.${rad.id}`, {
      method: "PATCH",
      headers: { ...sbHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({ brukt: true }),
    });

    // Sett sesjon og send videre til portalen
    settCookie(res, lagSesjon(rad.partner_id), SESJON_DAGER * 864e2);
    res.setHeader("Location", "/portal");
    return res.status(302).end();
  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(side("Noe gikk galt", "Prøv igjen om litt."));
  }
}
