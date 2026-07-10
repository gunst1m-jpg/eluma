// /api/portal/leads.js — partnerens egne leads + ta/takk-nei fra portalen.
// GET   (krever sesjon): leads som er tildelt nettopp denne partneren.
// PATCH (krever sesjon): { id, svar:"ja"|"nei" } → status "akseptert"/"avslatt".
//
// Eierskap sjekkes alltid på serveren: leadet må ha montor = partnerens id (fra sesjonen),
// og være i tilstanden "tildelt". Samme statusoverganger som montør-e-posten
// (lead-svar.js): "ja" → akseptert, "nei" → avslatt, og svar-token nulles.
//
// montør lagres som partner-id, så vi matcher direkte på sesjonens partner-id.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_SECRET

import { sbHeaders, krevPartner } from "./_auth.js";

export default async function handler(req, res) {
  const pid = krevPartner(req, res);
  if (!pid) return; // 401 allerede sendt

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (req.method === "GET") {
      const r = await fetch(
        `${url}/rest/v1/leads?montor=eq.${encodeURIComponent(pid)}` +
          `&select=id,opprettet,tjeneste,omfang,kommune,navn,mobil,adresse,beskrivelse,tidshorisont,intensjon,leadverdi,status` +
          `&order=opprettet.desc&limit=200`,
        { headers: sbHeaders(key) }
      );
      if (!r.ok) {
        console.error("Supabase-feil:", await r.text());
        return res.status(500).json({ feil: "Kunne ikke hente leads" });
      }
      return res.status(200).json({ leads: await r.json() });
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { id, svar } = body;
      if (!id || (svar !== "ja" && svar !== "nei"))
        return res.status(400).json({ feil: "Mangler id eller svar" });

      // Eierskap + tilstand: leadet må være tildelt nettopp denne partneren
      const sjekk = await fetch(
        `${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=montor,status&limit=1`,
        { headers: sbHeaders(key) }
      );
      const lead = (sjekk.ok ? await sjekk.json() : [])[0];
      if (!lead || lead.montor !== pid) return res.status(403).json({ feil: "Ikke ditt lead" });
      if (lead.status !== "tildelt") return res.status(409).json({ feil: "Leadet er allerede behandlet." });

      const nyStatus = svar === "ja" ? "akseptert" : "avslatt";
      const opp = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...sbHeaders(key), Prefer: "return=minimal" },
        body: JSON.stringify({ status: nyStatus, svar_token: null }),
      });
      if (!opp.ok) {
        console.error("Supabase-feil:", await opp.text());
        return res.status(500).json({ feil: "Lagring feilet" });
      }
      return res.status(200).json({ ok: true, status: nyStatus });
    }

    return res.status(405).json({ feil: "Kun GET eller PATCH" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}
