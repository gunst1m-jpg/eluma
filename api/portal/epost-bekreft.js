// /api/portal/epost-bekreft.js — den nye adressen klikker bekreftelseslenken.
// GET ?token=... . Forbruker token (engangs) og bytter partnerens e-post til den nye.
// Logger IKKE inn automatisk — den nye eieren logger inn selv med den nye adressen (bevis på kontroll).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { sbHeaders, hashToken } from "./_auth.js";

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
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const raw = searchParams.get("token");
    if (!raw) return res.status(400).send(side("Ugyldig lenke", "Denne lenken ser ikke riktig ut."));

    const hash = hashToken(raw);
    const rad = (await (await fetch(`${url}/rest/v1/epost_endring?token_hash=eq.${hash}&select=id,partner_id,ny_epost,utlop,brukt&limit=1`, { headers: sbHeaders(key) })).json())[0];
    if (!rad || rad.brukt || new Date(rad.utlop).getTime() < Date.now())
      return res.status(200).send(side("Lenken er utløpt", 'Denne bekreftelseslenken er allerede brukt eller utløpt. Be om en ny i <a href="/portal">portalen</a>.'));

    // Ble adressen opptatt av en annen i mellomtiden?
    const opptatt = (await (await fetch(`${url}/rest/v1/partnere?epost=eq.${encodeURIComponent(rad.ny_epost)}&id=neq.${encodeURIComponent(rad.partner_id)}&select=id&limit=1`, { headers: sbHeaders(key) })).json())[0];
    if (opptatt) return res.status(200).send(side("Kan ikke bekrefte", "Denne e-posten er nå i bruk hos en annen. Ta kontakt med oss."));

    const opp = await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(rad.partner_id)}`, {
      method: "PATCH", headers: { ...sbHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({ epost: rad.ny_epost }),
    });
    if (!opp.ok) { console.error("E-post-bytte feilet:", await opp.text()); return res.status(500).send(side("Noe gikk galt", "Prøv igjen om litt.")); }
    await fetch(`${url}/rest/v1/epost_endring?id=eq.${rad.id}`, { method: "PATCH", headers: { ...sbHeaders(key), Prefer: "return=minimal" }, body: JSON.stringify({ brukt: true }) });

    return res.status(200).send(side("E-posten er bekreftet", 'Den nye adressen er nå innloggings-e-post for kontoen. <a href="/portal">Logg inn</a> med den.'));
  } catch (e) {
    console.error(e);
    return res.status(500).send(side("Noe gikk galt", "Prøv igjen om litt."));
  }
}
