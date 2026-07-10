// /api/andre-vurdering.js — kundens "be om ny vurdering" fra bekreftelses-e-posten.
// Single-send bevart: leadet flyttes fra montør #1 til en ANNEN egnet montør — aldri begge samtidig.
// Montør #1 belastes ikke (forbruket følger gjeldende montør, og leadet forlater #1 her).
// Maks én ny vurdering per lead (MAKS_VURDERINGER). Enerett-kommuner: finnes ingen alternativ
// montør (eneretten ER eksklusiv), så funksjonen fyrer ikke der — det er helt med vilje.
// Sikret med HMAC-signatur over lead-id (verifyLead) — ingen innlogging for kunden.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VARSEL_FRA, SITE_URL, PORTAL_SECRET
import crypto from "node:crypto";
import { sbHeaders, finnMontor, varsleMontor, verifyLead, TJENESTE_NAVN } from "./_leadhjelp.js";
import { beregnAnker } from "./anker.js";

const MIN_TIMER = 24;        // gi første montør minst et døgn på å gi tilbud før ny vurdering kan utløses
const MAKS_VURDERINGER = 1;  // én ekstra vurdering (totalt to montører på samme lead)

function side(tittel, tekst) {
  return `<!doctype html><html lang="no"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tittel} · Eluma</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0F120D;font-family:system-ui,-apple-system,sans-serif;color:#F4F3EE;padding:24px}
  .kort{max-width:400px;text-align:center;background:#15180F;border:1px solid rgba(255,255,255,.08);
    border-radius:22px;padding:40px 32px}
  .merke{font-weight:800;letter-spacing:-.02em;color:#C6F24E;font-size:22px;margin:0 0 20px}
  h1{font-size:20px;margin:0 0 10px;font-weight:700}
  p{color:#9AA093;font-size:15px;line-height:1.6;margin:0}
</style></head>
<body><div class="kort"><p class="merke">eluma</p><h1>${tittel}</h1><p>${tekst}</p></div></body></html>`;
}

// D1 — tynn kommune: ankeret som målestokk (nøytralt spenn, ikke en dom over montøren).
function ankerSide(a) {
  if (!a)
    return side("Vi ser på det", "Vi har ingen annen lokal fagperson for dette i området ditt akkurat nå. Svar på e-posten, så hjelper vi deg videre.");
  const kr = (n) => Number(n).toLocaleString("nb-NO");
  const omrade = a.omrade || "Agder";
  const kildeNote = a.kilde === "faktiske" ? `Basert på faktiske jobber i ${omrade}.` : `Anslag for ${omrade}.`;
  const tekst =
    `Vi har foreløpig ingen annen lokal fagperson for dette i området ditt.<br><br>` +
    `Men her er hva denne jobben <strong>typisk koster i ${omrade}</strong>, så du kan vurdere tilbudet ditt selv:` +
    `<span style="display:block;margin:14px 0 6px;font-size:26px;font-weight:800;color:#C6F24E">${kr(a.lav)}–${kr(a.hoy)} kr</span>` +
    `<span style="display:block;font-size:13px;color:#7C7B72">${kildeNote} Ferdig montert, varierer med jobben.</span>` +
    `<br>Ligger tilbudet ditt langt over dette, svar på e-posten — så ser vi på det.`;
  return side("Til å sammenligne med", tekst);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  try {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const id = searchParams.get("id");
    const sig = searchParams.get("sig");
    if (!id || !verifyLead(id, sig))
      return res.status(400).send(side("Ugyldig lenke", "Denne lenken ser ikke riktig ut. Svar gjerne på e-posten vår, så hjelper vi deg."));

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const r = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=*`, { headers: sbHeaders(key) });
    const lead = (r.ok ? await r.json() : [])[0];
    if (!lead) return res.status(200).send(side("Fant ikke saken", "Vi finner ikke denne henvendelsen. Svar på e-posten, så ser vi på det."));

    const tidligere = Array.isArray(lead.tidligere_montorer) ? lead.tidligere_montorer : [];
    if (tidligere.length >= MAKS_VURDERINGER)
      return res.status(200).send(side("Du har allerede fått en ny vurdering", "Vi har allerede koblet en annen fagperson på denne saken. Trenger du mer hjelp, svar på e-posten så ordner vi det manuelt."));

    if (!lead.montor || !["tildelt", "akseptert", "kontaktet"].includes(lead.status))
      return res.status(200).send(side("Ikke klar ennå", "Denne saken er ikke koblet til en fagperson akkurat nå. Svar gjerne på e-posten, så hjelper vi deg videre."));

    const alderTimer = (Date.now() - new Date(lead.opprettet).getTime()) / 3600000;
    if (alderTimer < MIN_TIMER)
      return res.status(200).send(side("Gi det et lite øyeblikk", "Fagpersonen din har akkurat fått saken. Gi dem et døgn til å ta kontakt og gi et tilbud — kom tilbake til denne lenken etterpå hvis du ikke er fornøyd."));

    // Finn en ANNEN egnet montør (ekskluder alle som har hatt leadet)
    const ekskluder = [...tidligere, lead.montor];
    const m = await finnMontor(url, key, lead.tjeneste, lead.kommune, ekskluder);
    if (!m) {
      // D1 — tynn kommune (ingen benk): andrevurderingen ER ankeret gjengitt som en målestokk.
      // Ingen reise, ingen inhabilitet. Nøytralt spenn (ikke en dom over montøren, jf. D4) —
      // kunden sammenligner selv og kan flagge tilbake til oss (intern tilsyn).
      const a = await beregnAnker(lead.tjeneste, lead.omfang, lead.kommune).catch(() => null);
      return res.status(200).send(ankerSide(a));
    }

    // Flytt leadet: ny montør, fersk svar-token (gammel lenke dør), husk forrige montør(er)
    const nyToken = crypto.randomUUID();
    const opp = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...sbHeaders(key), Prefer: "return=representation" },
      body: JSON.stringify({ montor: m.partnerId, status: "tildelt", svar_token: nyToken, tidligere_montorer: ekskluder }),
    });
    if (!opp.ok) {
      console.error("Videresending feilet:", await opp.text());
      return res.status(500).send(side("Noe gikk galt", "Prøv igjen om litt, eller svar på e-posten vår."));
    }
    const nyLead = (await opp.json().catch(() => []))[0] || { ...lead, montor: m.partnerId, svar_token: nyToken };

    await varsleMontor(url, key, m.partnerId, nyLead).catch((e) => console.error("Varsel til ny montør feilet:", e));
    await varsleForrige(url, key, lead.montor, lead).catch((e) => console.error("Varsel til forrige montør feilet:", e));

    return res.status(200).send(side("Vi har koblet deg med en ny fagperson", "Takk! En annen lokal fagperson tar kontakt snart. Du betaler ingenting — dette er en del av tjenesten."));
  } catch (e) {
    console.error(e);
    return res.status(500).send(side("Noe gikk galt", "Prøv igjen om litt, eller svar på e-posten vår."));
  }
}

// Si fra til montøren som hadde leadet at det er sendt videre — og at de ikke belastes.
async function varsleForrige(url, key, montorId, lead) {
  const r = await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(montorId)}&select=firma,epost&limit=1`, { headers: sbHeaders(key) });
  const p = (r.ok ? await r.json() : [])[0];
  if (!p?.epost) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.VARSEL_FRA,
      to: p.epost,
      subject: `Kunden ba om en ny vurdering — ${TJENESTE_NAVN[lead.tjeneste] || lead.tjeneste}`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#191C19">
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Hei ${p.firma || ""},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Kunden på henvendelsen «${lead.navn || ""}» (${TJENESTE_NAVN[lead.tjeneste] || lead.tjeneste}) ba om en ny vurdering, så saken er sendt videre til en annen fagperson. <strong>Du belastes ikke for dette leadet.</strong></p>
        <p style="font-size:13px;color:#7C7B72;margin:0">Takk for innsatsen — nye leads er på vei.</p>
      </div>`,
    }),
  });
}
