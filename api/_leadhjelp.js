// /api/_leadhjelp.js — delte hjelpere for lead-flyten (underscore => Vercel ruter den ikke).
// Brukes av lead.js, leads.js og andre-vurdering.js. Samler tidligere duplisert varsel-/matchekode ett sted.
// Env brukt her: SUPABASE_*, RESEND_API_KEY, VARSEL_FRA, SITE_URL, PORTAL_SECRET (for signerte kundelenker).
import crypto from "node:crypto";

export const TJENESTE_NAVN = {
  solceller: "Solceller", elbillader: "Elbillader", batteri: "Batteri",
  smarthus: "Smarthus", elektriker: "Elektriker",
};

export function sbHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

// --- Signerte kundelenker (HMAC over lead-id) — ingen egen kolonne nødvendig ---
function leadSecret() {
  return process.env.PORTAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "eluma-dev-secret";
}
export function signLead(id) {
  return crypto.createHmac("sha256", leadSecret()).update(`andre-vurdering:${id}`).digest("hex").slice(0, 32);
}
export function verifyLead(id, sig) {
  if (!id || !sig) return false;
  const a = Buffer.from(String(sig));
  const b = Buffer.from(signLead(id));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Finn montør for (auto)tildeling. Returnerer { partnerId, firma, kilde } eller null.
// 1) Enerett-holder for fag+kommune (eksklusiv).  2) Ellers en partner som DEKKER kommunen
//    for faget — lastbalansert på færrest leads denne måneden, eldste partner som tie-break.
// `ekskluder` = partner-id-er som IKKE skal velges (brukes ved "andre vurdering" så vi aldri
//    sender til samme montør to ganger). Viktig: finnes en enerett-holder og den er ekskludert,
//    returnerer vi null — eneretten ER eksklusiv, så det finnes ingen alternativ i den kommunen.
export async function finnMontor(url, key, tjeneste, kommune, ekskluder = []) {
  const headers = sbHeaders(key);
  const ekskl = new Set((ekskluder || []).filter(Boolean));

  // 1) Enerett-holder
  const eR = await fetch(
    `${url}/rest/v1/enerett?select=partner_id,firma&fag=eq.${encodeURIComponent(tjeneste)}&kommune=eq.${encodeURIComponent(kommune)}&limit=1`,
    { headers }
  );
  const e = eR.ok ? (await eR.json())[0] : null;
  if (e && e.partner_id) {
    if (ekskl.has(e.partner_id)) return null; // allerede prøvd → ingen andre vurdering i enerett-kommune
    return { partnerId: e.partner_id, firma: e.firma || null, kilde: "enerett" };
  }

  // 2) Deknings-partnere: dekning inneholder kommunen OG fag inneholder tjenesten
  const dekFilter = `dekning=cs.${encodeURIComponent(JSON.stringify([kommune]))}`;
  const pR = await fetch(
    `${url}/rest/v1/partnere?select=id,firma,opprettet&fag=ilike.*${tjeneste}*&${dekFilter}&order=opprettet.asc`,
    { headers }
  );
  const kandidater = (pR.ok ? await pR.json() : []).filter((k) => !ekskl.has(k.id));
  if (!kandidater.length) return null;
  if (kandidater.length === 1) return { partnerId: kandidater[0].id, firma: kandidater[0].firma || null, kilde: "dekning" };

  // Flere kandidater → lastbalanser på leads denne måneden
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const ids = kandidater.map((k) => k.id);
  const lR = await fetch(
    `${url}/rest/v1/leads?select=montor&opprettet=gte.${start}&montor=in.(${ids.join(",")})`,
    { headers }
  );
  const leads = lR.ok ? await lR.json() : [];
  const antall = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const l of leads) if (l.montor in antall) antall[l.montor]++;
  let best = kandidater[0]; // allerede sortert eldste først (stabil tie-break)
  for (const k of kandidater) if (antall[k.id] < antall[best.id]) best = k;
  return { partnerId: best.id, firma: best.firma || null, kilde: "dekning" };
}

export async function varsleMontor(url, key, montorId, lead) {
  try {
    const r = await fetch(
      `${url}/rest/v1/partnere?id=eq.${encodeURIComponent(montorId)}&select=firma,epost&limit=1`,
      { headers: sbHeaders(key) }
    );
    const rader = r.ok ? await r.json() : [];
    const epost = rader[0]?.epost;
    const firma = rader[0]?.firma || "";
    if (!epost) return false; // ingen e-post lagret — tildelingen er likevel lagret

    const varm = lead.intensjon === "varm";
    const sendt = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.VARSEL_FRA,
        to: epost,
        subject: `Ny lead — ${TJENESTE_NAVN[lead.tjeneste] || lead.tjeneste}` + (varm ? " [VARM]" : ""),
        html: montorHtml(lead, firma),
      }),
    });
    return sendt.ok;
  } catch (e) {
    console.error("Montør-varsel feilet (tildeling er lagret):", e);
    return false;
  }
}

export function montorHtml(lead, firma) {
  const rad = (k, v) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#7C7B72">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`;
  const nok = (n) => Number(n || 0).toLocaleString("nb-NO") + " kr";
  const tj = lead.omfang
    ? `${TJENESTE_NAVN[lead.tjeneste] || lead.tjeneste} (${lead.omfang})`
    : TJENESTE_NAVN[lead.tjeneste] || lead.tjeneste;
  const mobil = lead.mobil
    ? `<a href="tel:${String(lead.mobil).replace(/\s/g, "")}" style="color:#191C19">${lead.mobil}</a>`
    : "—";
  const base = process.env.SITE_URL || "";
  const lenke = (svar) =>
    `${base}/api/lead-svar?id=${encodeURIComponent(lead.id)}&token=${encodeURIComponent(lead.svar_token || "")}&svar=${svar}`;
  const knapper =
    base && lead.svar_token
      ? `<div style="margin:22px 0 6px">
           <a href="${lenke("ja")}" style="display:inline-block;background:#C6F24E;color:#191C19;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;margin:0 10px 8px 0">Ta leadet</a>
           <a href="${lenke("nei")}" style="display:inline-block;background:#F4F3EE;color:#191C19;text-decoration:none;padding:12px 22px;border-radius:10px;border:1px solid #E4E2DA">Takk nei</a>
         </div>
         <p style="margin:6px 0 0;font-size:12.5px;color:#7C7B72">Takker du nei, sender vi leadet videre til en annen — uten kostnad for deg.</p>`
      : "";
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#191C19">
    <h2 style="font-size:19px;margin:0 0 4px">Ny lead til ${firma}</h2>
    <p style="margin:0 0 16px;color:#7C7B72;font-size:14px">
      Eksklusiv henvendelse via Eluma${lead.intensjon === "varm" ? " · VARM — kunden er klar nå" : ""}.
    </p>
    <table style="border-collapse:collapse;font-size:14px">
      ${rad("Tjeneste", tj)}
      ${rad("Kunde", lead.navn || "—")}
      ${rad("Mobil", mobil)}
      ${rad("Adresse", lead.adresse || "—")}
      ${rad("Behov", lead.beskrivelse || "—")}
      ${rad("Tidshorisont", lead.tidshorisont || "—")}
      ${rad("Pris for dette leadet", nok(lead.leadverdi))}
    </table>
    <p style="margin:18px 0 0;font-size:14px;line-height:1.6">
      Dette leadet er <strong>ditt alene</strong> — ingen andre har fått det. Holder ikke leadet mål? Si fra innen 48 timer, så krediterer vi det.
    </p>
    ${knapper}
  </div>`;
}
