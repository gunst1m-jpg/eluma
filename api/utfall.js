// /api/utfall.js — kundens "hvordan gikk det?" etter fullført jobb.
// Fanger fornøydhet + sluttpris (bøtte) + valgfri testimonial i ÉN handling.
// KILDEN ER KUNDEN (det inhabile vitnet) — aldri montøren som skal føres tilsyn med (beslutning C3).
// Låser opp regionalt prisanker (C2), tilsyn (C4) og referanser/social proof — samme ping.
// Signert med HMAC via hensikten "utfall" (verifyPurpose) — kan ikke gjenbrukes som andre-vurderingslenke.
//
// Ruter:
//   GET  ?id=&sig=            → ett-trykk-siden (kunden)
//   POST {id,sig,fornoyd,sluttpris,testimonial}  → registrer (kunden)
//   POST {send:true, id, admin_token}            → send utfall-lenken på e-post (admin/cron)
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VARSEL_FRA, SITE_URL, PORTAL_SECRET, ADMIN_TOKEN
import { sbHeaders, signPurpose, verifyPurpose, TJENESTE_NAVN } from "./_leadhjelp.js";

// Bøtter, ikke kroner (beslutning C3): høyere svarprosent, mindre følsomt, og ankeret er uansett et spenn.
const PRIS_BOTTER = {
  "under-15k": "Under 15 000 kr",
  "15-25k": "15 000 – 25 000 kr",
  "25-40k": "25 000 – 40 000 kr",
  "over-40k": "Over 40 000 kr",
};
const FORNOYD = ["ja", "nei"];

export function utfallLenke(id) {
  const base = process.env.SITE_URL || "";
  return base ? `${base}/api/utfall?id=${encodeURIComponent(id)}&sig=${signPurpose(id, "utfall")}` : "";
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

      // --- Admin/cron: send utfall-lenken til kunden ---
      if (body.send === true) {
        if (!process.env.ADMIN_TOKEN || body.admin_token !== process.env.ADMIN_TOKEN)
          return res.status(401).json({ feil: "Ikke autorisert" });
        return res.json(await sendUtfallForesporsel(url, key, body.id));
      }

      // --- Kunden registrerer utfall ---
      res.setHeader("Content-Type", "application/json");
      const { id, sig } = body;
      if (!id || !verifyPurpose(id, sig, "utfall"))
        return res.status(400).json({ feil: "Ugyldig lenke" });

      const fornoyd = FORNOYD.includes(body.fornoyd) ? body.fornoyd : null;
      const sluttpris = PRIS_BOTTER[body.sluttpris] ? body.sluttpris : null;
      const testimonial = String(body.testimonial || "").trim().slice(0, 600) || null;
      if (!fornoyd && !sluttpris && !testimonial)
        return res.status(400).json({ feil: "Ingenting å lagre" });

      // Idempotent: allerede registrert? ikke overskriv.
      const r = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=id,utfall_tidspunkt`, { headers: sbHeaders(key) });
      const lead = (r.ok ? await r.json() : [])[0];
      if (!lead) return res.status(404).json({ feil: "Fant ikke saken" });
      if (lead.utfall_tidspunkt) return res.status(200).json({ ok: true, alt: true });

      const opp = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...sbHeaders(key), Prefer: "return=minimal" },
        body: JSON.stringify({ fornoyd, sluttpris, testimonial, utfall_tidspunkt: new Date().toISOString() }),
      });
      if (!opp.ok) {
        console.error("Utfall-lagring feilet:", await opp.text());
        return res.status(500).json({ feil: "Lagring feilet" });
      }
      return res.status(200).json({ ok: true });
    }

    // --- GET: vis ett-trykk-siden ---
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const id = searchParams.get("id");
    const sig = searchParams.get("sig");
    if (!id || !verifyPurpose(id, sig, "utfall"))
      return res.status(400).send(kort("Ugyldig lenke", "Denne lenken ser ikke riktig ut. Svar gjerne på e-posten vår, så hjelper vi deg."));

    const r = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=tjeneste,navn,utfall_tidspunkt`, { headers: sbHeaders(key) });
    const lead = (r.ok ? await r.json() : [])[0];
    if (!lead) return res.status(200).send(kort("Fant ikke saken", "Vi finner ikke denne henvendelsen. Svar på e-posten, så ser vi på det."));
    if (lead.utfall_tidspunkt) return res.status(200).send(kort("Takk — allerede registrert", "Du har allerede fortalt oss hvordan det gikk. Takk for at du hjalp neste huseier i Agder!"));

    return res.status(200).send(skjemaSide(id, sig, lead));
  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(kort("Noe gikk galt", "Prøv igjen om litt, eller svar på e-posten vår."));
  }
}

// Send lenken til kunden (manuelt fra admin, eller fra en Vercel Cron senere).
async function sendUtfallForesporsel(url, key, id) {
  const lenke = utfallLenke(id);
  if (!lenke) return { feil: "SITE_URL mangler" };
  const r = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=navn,epost,tjeneste&limit=1`, { headers: sbHeaders(key) });
  const lead = (r.ok ? await r.json() : [])[0];
  if (!lead?.epost) return { feil: "Kunden mangler e-post" };
  const tjeneste = TJENESTE_NAVN[lead.tjeneste] || lead.tjeneste || "jobben";
  const sendt = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.VARSEL_FRA,
      to: lead.epost,
      subject: "Hvordan gikk det med jobben?",
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#191C19">
        <h2 style="font-size:19px;margin:0 0 6px">Hei ${lead.navn || ""}!</h2>
        <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Hjalp fagpersonen deg med ${tjeneste}? Ett kjapt trykk hjelper neste huseier i Agder å vite hva som er riktig pris — og oss å holde fagfolkene ærlige.</p>
        <div style="margin:20px 0 4px">
          <a href="${lenke}" style="display:inline-block;background:#C6F24E;color:#191C19;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">Fortell oss hvordan det gikk</a>
        </div>
        <p style="margin:8px 0 0;font-size:12.5px;color:#7C7B72">Tar 20 sekunder. Anonymt for andre kunder.</p>
      </div>`,
    }),
  });
  return sendt.ok ? { ok: true } : { feil: "Sending feilet" };
}

// ---- HTML ----
function skall(tittel, innmat) {
  return `<!doctype html><html lang="no"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tittel} · Eluma</title>
<style>
  :root{--lime:#C6F24E;--ink:#F4F3EE;--dim:#9AA093}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0F120D;font-family:system-ui,-apple-system,sans-serif;color:var(--ink);padding:24px}
  .kort{max-width:440px;width:100%;background:#15180F;border:1px solid rgba(255,255,255,.08);
    border-radius:22px;padding:36px 30px}
  .merke{font-weight:800;letter-spacing:-.02em;color:var(--lime);font-size:22px;margin:0 0 22px;text-align:center}
  h1{font-size:20px;margin:0 0 6px;font-weight:700;text-align:center}
  .lead{color:var(--dim);font-size:14.5px;line-height:1.6;margin:0 0 22px;text-align:center}
  .sp{font-size:13px;color:var(--dim);margin:20px 0 8px;text-transform:uppercase;letter-spacing:.04em}
  .rad{display:flex;flex-wrap:wrap;gap:8px}
  button.v{flex:1 1 auto;min-width:calc(50% - 4px);background:#1D2116;color:var(--ink);border:1px solid rgba(255,255,255,.1);
    border-radius:12px;padding:12px 10px;font-size:14.5px;cursor:pointer;transition:.12s}
  button.v[aria-pressed="true"]{background:var(--lime);color:#191C19;border-color:var(--lime);font-weight:700}
  textarea{width:100%;margin-top:8px;background:#1D2116;color:var(--ink);border:1px solid rgba(255,255,255,.1);
    border-radius:12px;padding:12px;font:inherit;font-size:14px;resize:vertical;min-height:70px}
  .send{width:100%;margin-top:24px;background:var(--lime);color:#191C19;border:0;border-radius:12px;
    padding:14px;font-size:15px;font-weight:700;cursor:pointer}
  .send:disabled{opacity:.5;cursor:default}
  p.fin{color:var(--dim);font-size:15px;line-height:1.6;margin:0;text-align:center}
</style></head>
<body><div class="kort"><p class="merke">eluma</p>${innmat}</div></body></html>`;
}

function kort(tittel, tekst) {
  return skall(tittel, `<h1>${tittel}</h1><p class="fin">${tekst}</p>`);
}

function skjemaSide(id, sig, lead) {
  const tjeneste = TJENESTE_NAVN[lead.tjeneste] || lead.tjeneste || "jobben";
  const prisKnapper = Object.entries(PRIS_BOTTER)
    .map(([v, t]) => `<button type="button" class="v" data-felt="sluttpris" data-verdi="${v}" aria-pressed="false">${t}</button>`)
    .join("");
  const innmat = `
    <h1>Hvordan gikk det?</h1>
    <p class="lead">Takk for at du brukte Eluma til ${tjeneste}. To kjappe spørsmål hjelper neste huseier i Agder.</p>

    <div class="sp">Ble du fornøyd med fagpersonen?</div>
    <div class="rad">
      <button type="button" class="v" data-felt="fornoyd" data-verdi="ja" aria-pressed="false">Ja, fornøyd</button>
      <button type="button" class="v" data-felt="fornoyd" data-verdi="nei" aria-pressed="false">Nei</button>
    </div>

    <div class="sp">Hva endte jobben på, omtrent?</div>
    <div class="rad">${prisKnapper}</div>

    <div class="sp">Vil du dele et par ord? (valgfritt)</div>
    <textarea id="testimonial" maxlength="600" placeholder="F.eks. rask, ryddig, ga et ærlig tilbud …"></textarea>

    <button class="send" id="send" disabled>Send</button>
    <script>
      var valg={fornoyd:null,sluttpris:null};
      document.querySelectorAll("button.v").forEach(function(b){
        b.addEventListener("click",function(){
          var felt=b.dataset.felt;
          document.querySelectorAll('button.v[data-felt="'+felt+'"]').forEach(function(x){x.setAttribute("aria-pressed","false")});
          b.setAttribute("aria-pressed","true"); valg[felt]=b.dataset.verdi;
          document.getElementById("send").disabled=!(valg.fornoyd||valg.sluttpris);
        });
      });
      document.getElementById("send").addEventListener("click",function(){
        var btn=this; btn.disabled=true; btn.textContent="Sender …";
        fetch(location.pathname+location.search,{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({id:${JSON.stringify(id)},sig:${JSON.stringify(sig)},
            fornoyd:valg.fornoyd,sluttpris:valg.sluttpris,testimonial:document.getElementById("testimonial").value})})
        .then(function(r){return r.json()})
        .then(function(){document.querySelector(".kort").innerHTML='<p class="merke">eluma</p><h1>Takk!</h1><p class="fin">Du hjalp nettopp neste huseier i Agder til et riktigere prisbilde. Det betyr mye.</p>'})
        .catch(function(){btn.disabled=false;btn.textContent="Prøv igjen"});
      });
    </script>`;
  return skall("Hvordan gikk det?", innmat);
}
