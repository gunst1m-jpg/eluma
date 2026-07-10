// /api/lead-svar.js — montørens svar fra e-posten: ta leadet (svar=ja) eller takk nei (svar=nei).
// Offentlig (montøren har ingen innlogging) — sikret med en engangs svar-token lagret på leadet.
// "ja" → status akseptert. "nei" → B1: leadet faller AUTOMATISK til benken (omfordelTilBenk);
// finnes ingen benk (tynn kommune) settes status avslatt for manuell håndtering. Token er engangsbruk.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VARSEL_FRA
import { omfordelTilBenk } from "./_leadhjelp.js";

function sbHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

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
</style></head>
<body><div class="kort"><p class="merke">eluma</p><h1>${tittel}</h1><p>${tekst}</p></div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  try {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const id = searchParams.get("id");
    const token = searchParams.get("token");
    const svar = searchParams.get("svar");

    if (!id || !token || (svar !== "ja" && svar !== "nei"))
      return res.status(400).send(side("Ugyldig lenke", "Denne lenken ser ikke riktig ut. Ta kontakt med oss om du lurer på noe."));

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Hent HELE leadet (trengs for omfordeling ved avslag) og sjekk token
    const r = await fetch(
      `${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: sbHeaders(key) }
    );
    const rader = r.ok ? await r.json() : [];
    const lead = rader[0];
    if (!lead || !lead.svar_token || lead.svar_token !== token)
      return res.status(200).send(side("Allerede besvart", "Dette leadet er allerede behandlet, eller lenken er utløpt."));

    // --- "ja": montøren tar leadet ---
    if (svar === "ja") {
      const opp = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...sbHeaders(key), Prefer: "return=minimal" },
        body: JSON.stringify({ status: "akseptert", svar_token: null }),
      });
      if (!opp.ok) {
        console.error("Supabase-feil:", await opp.text());
        return res.status(500).send(side("Noe gikk galt", "Prøv igjen om litt, eller ta kontakt med oss."));
      }
      return res.status(200).send(side("Leadet er ditt", "Takk! Vi har notert at du tar dette leadet. Ta kontakt med kunden så snart du kan."));
    }

    // --- "nei": forbruk token (montørens lenke dør) og la leadet falle til benken (B1) ---
    await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...sbHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({ svar_token: null }),
    }).catch((e) => console.error("Token-nulling feilet:", e));

    const omf = await omfordelTilBenk(url, key, lead);
    if (omf.ok)
      return res.status(200).send(side("Helt greit", "Takk for raskt svar. Vi har sendt leadet videre til en annen fagperson — uten kostnad for deg."));

    // Ingen benk (tynn kommune) → sett avslatt for manuell håndtering i admin
    await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...sbHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({ status: "avslatt" }),
    }).catch((e) => console.error("Status-oppdatering feilet:", e));
    return res.status(200).send(side("Helt greit", "Takk for raskt svar. Vi finner noen andre som kan hjelpe kunden — uten kostnad for deg."));
  } catch (e) {
    console.error(e);
    return res.status(500).send(side("Noe gikk galt", "Prøv igjen om litt."));
  }
}
