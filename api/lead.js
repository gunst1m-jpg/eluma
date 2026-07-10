// /api/lead.js — Vercel serverless-funksjon (Node, ESM)
// Tar imot et kunde-lead, validerer, og REKALKULERER score + leadverdi PÅ SERVEREN
// (klientens tall stoles aldri på — de er kun for visning i nettleseren).
// Lagrer i Supabase og varsler deg på e-post. Ingen npm-avhengigheter — rene fetch-kall.
// Vercel oppdager /api/*.js som serverless automatisk i et Vite-prosjekt.
//
// Forventet Supabase-tabell (kjør én gang i SQL-editoren):
//   create table leads (
//     id uuid default gen_random_uuid() primary key,
//     opprettet timestamptz, kilde text,
//     tjeneste text, omfang text, kommune text,
//     navn text, mobil text, epost text, adresse text,
//     beskrivelse text, eierforhold text, tidshorisont text,
//     score numeric, intensjon text, kategori text, base_pris int, leadverdi int,
//     samtykke_tidspunkt timestamptz, samtykke_versjon text,
//     status text, montor text, svar_token text,   -- montor lagrer partner-id
//     tidligere_montorer jsonb default '[]'        -- montører som har hatt leadet (andre vurdering)
//   );
//
// Env-variabler (Vercel → Settings → Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VARSEL_FRA, VARSEL_TIL

import { finnMontor, varsleMontor, signLead } from "./_leadhjelp.js";

// --- Hold disse i synk med frontend (App.jsx): beregnScore, PRISBASE, basePris, intensjon ---
const TJENESTER = ["solceller", "elbillader", "batteri", "smarthus", "elektriker"];

const PRISBASE = {
  solceller: 800, batteri: 700, elbillader: 450,
  smarthus_strom: 550, smarthus_enkel: 300,
  elektriker_storre: 450, elektriker_mindre: 195,
};

function beregnScore({ tidshorisont, beskrivelse }) {
  const tid = { naa: 1.0, "6-mnd": 0.6, utforsker: 0.2 }[tidshorisont] ?? 0.2;
  const detalj = (beskrivelse || "").trim().length > 15 ? 1 : 0.5;
  return Math.round((tid * 0.7 + detalj * 0.3) * 100) / 100;
}

function basePris(tjeneste, omfang) {
  if (tjeneste === "elektriker") return omfang === "storre" ? PRISBASE.elektriker_storre : PRISBASE.elektriker_mindre;
  if (tjeneste === "smarthus") return omfang === "strom" ? PRISBASE.smarthus_strom : PRISBASE.smarthus_enkel;
  return PRISBASE[tjeneste] || 0;
}

function intensjon(score) {
  if (score >= 0.7) return { navn: "varm", faktor: 1 };
  if (score >= 0.4) return { navn: "lunken", faktor: 0.7 };
  return { navn: "kald", faktor: 0.5 };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ feil: "Kun POST" });

  const lead = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const k = lead.kvalifisering || {};
  const kontakt = lead.kontakt || {};
  const samtykke = lead.samtykke || {};
  const tjeneste = lead.tjeneste;
  const kommune = lead.kommune || null;
  const omfang = tjeneste === "elektriker" ? (k.omfang || "mindre") : tjeneste === "smarthus" ? (k.omfang || "enkel") : null;

  // --- Validering ---
  if (!TJENESTER.includes(tjeneste)) return res.status(400).json({ feil: "Ukjent tjeneste" });
  if (samtykke.markedsforing !== true) return res.status(400).json({ feil: "Mangler samtykke" });
  if (!kontakt.navn || !/^\+?\d[\d\s]{6,}$/.test(String(kontakt.mobil || "").trim()))
    return res.status(400).json({ feil: "Mangler gyldig kontaktinfo" });

  // --- Fasiten beregnes her, ikke i klienten ---
  const score = beregnScore({ tidshorisont: k.tidshorisont, beskrivelse: k.beskrivelse });
  const intens = intensjon(score);
  const base = basePris(tjeneste, omfang);
  const leadverdi = Math.round(base * intens.faktor);
  const kategori = tjeneste === "elektriker" ? "elektriker_" + omfang : tjeneste === "smarthus" ? "smarthus_" + omfang : tjeneste;
  const naa = new Date().toISOString();

  // --- Auto-tildeling (score >= 0.4): først enerett-holder for fag+kommune; finnes ingen,
  //     en partner som dekker kommunen for faget (lastbalansert). Kalde leads venter på manuell. ---
  let autoMontorId = null; // partner-id som leadet ev. auto-tildeles
  let autoFirma = null;    // kun til visning i varsel-emnet
  if (kommune && score >= 0.4) {
    try {
      const m = await finnMontor(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, tjeneste, kommune);
      if (m) { autoMontorId = m.partnerId; autoFirma = m.firma; }
    } catch (err) { console.error("Auto-tildeling feilet:", err); }
  }
  const svarToken = autoMontorId ? globalThis.crypto.randomUUID() : null;

  const rad = {
    opprettet: naa,
    kilde: lead.kilde || "direkte",
    tjeneste,
    omfang,
    kommune,
    navn: kontakt.navn,
    mobil: kontakt.mobil,
    epost: kontakt.epost || null,
    adresse: kontakt.adresse || null,
    beskrivelse: k.beskrivelse || null,
    eierforhold: k.eierforhold || null,
    tidshorisont: k.tidshorisont || null,
    score,
    intensjon: intens.navn,
    kategori,
    base_pris: base,
    leadverdi,
    samtykke_tidspunkt: naa,
    samtykke_versjon: samtykke.tekstVersjon || "v1",
    status: autoMontorId ? "tildelt" : "ny",
    montor: autoMontorId,
    svar_token: svarToken,
  };

  try {
    // 1) Lagre i Supabase
    const lagre = await fetch(`${process.env.SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(rad),
    });
    if (!lagre.ok) {
      console.error("Supabase-feil:", await lagre.text());
      return res.status(500).json({ feil: "Lagring feilet" });
    }
    const lagretRad = (await lagre.json().catch(() => []))[0] || rad;

    // 2) Varsle på e-post (Resend) — feiler dette, er leadet likevel lagret
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.VARSEL_FRA, // f.eks. 'Eluma <onboarding@resend.dev>' til å starte
        to: process.env.VARSEL_TIL,
        subject: `Ny lead — ${rad.navn} · ${tjeneste}` + (score >= 0.7 ? " [VARM]" : "") + ` · ${leadverdi} kr` + (autoFirma ? ` \u2192 ${autoFirma}` : ""),
        html: epostHtml(rad),
      }),
    }).catch((e) => console.error("Resend-feil (lead er lagret):", e));

    // 3) Auto-tildelt? Varsle montøren direkte med ta/takk-nei-knapper
    if (autoMontorId) {
      await varsleMontor(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, autoMontorId, lagretRad)
        .catch((e) => console.error("Montør-varsel feilet (lead lagret):", e));
    }

    // 4) Bekreft til kunden + tilby "be om ny vurdering" (kun når en montør er koblet)
    if (autoMontorId && lagretRad.epost) {
      await sendKundebekreftelse(lagretRad.epost, lagretRad)
        .catch((e) => console.error("Kundebekreftelse feilet (lead lagret):", e));
    }

    return res.status(200).json({ ok: true, tildelt: autoFirma || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}

function epostHtml(r) {
  const rad = (key, v) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#7C7B72">${key}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`;
  const tjenesteTekst = r.omfang ? `${r.tjeneste} (${r.omfang})` : r.tjeneste;
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#191C19">
    <h2 style="font-size:19px;margin:0 0 4px">Ny lead — ${r.navn}</h2>
    <p style="margin:0 0 18px;color:#7C7B72;font-size:14px">
      ${tjenesteTekst} · ${r.intensjon} (score ${r.score}) · leadverdi ${r.leadverdi} kr
    </p>
    <table style="border-collapse:collapse;font-size:14px">
      ${rad("Tjeneste", tjenesteTekst)}
      ${rad("Behov", r.beskrivelse || "—")}
      ${rad("Kommune", r.kommune || "—")}
      ${rad("Eier/leier", r.eierforhold || "—")}
      ${rad("Tidshorisont", r.tidshorisont || "—")}
      ${rad("Mobil", r.mobil)}
      ${rad("E-post", r.epost || "—")}
      ${rad("Adresse", r.adresse || "—")}
      ${rad("Leadverdi", `${r.leadverdi} kr (${r.intensjon})`)}
    </table>
  </div>`;
}

// Bekreftelse til kunden: én vurdert fagperson tar kontakt, + signert lenke for "andre vurdering".
async function sendKundebekreftelse(epost, lead) {
  const base = process.env.SITE_URL || "";
  const lenke = base ? `${base}/api/andre-vurdering?id=${encodeURIComponent(lead.id)}&sig=${signLead(lead.id)}` : "";
  const knapp = lenke
    ? `<div style="margin:20px 0 4px">
         <a href="${lenke}" style="display:inline-block;background:#F4F3EE;color:#191C19;text-decoration:none;padding:11px 20px;border-radius:10px;border:1px solid #E4E2DA;font-weight:600">Be om en ny vurdering</a>
       </div>
       <p style="margin:6px 0 0;font-size:12.5px;color:#7C7B72">Bruk denne først når du har fått et tilbud du ikke er fornøyd med — så kobler vi deg med en annen fagperson, uten kostnad for deg.</p>`
    : "";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.VARSEL_FRA,
      to: epost,
      subject: "Takk — vi har koblet deg med en fagperson",
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#191C19">
        <h2 style="font-size:19px;margin:0 0 6px">Takk for henvendelsen!</h2>
        <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Vi har koblet deg med én lokal, vurdert fagperson som tar kontakt snart. Du får ett tilbud — ingen mas fra fem firmaer.</p>
        ${knapp}
      </div>`,
    }),
  });
}
