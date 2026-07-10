// /api/leads.js — intern admin: hent leads + partnere (GET), tildel montør / sett status (PATCH).
// montor lagrer partner-id (ikke firmanavn). Når en lead tildeles, slår vi opp montørens e-post i `partnere` på id og sender
// montøren et varsel med lead-detaljene (Resend). Varslet er best-effort: feiler det,
// blir tildelingen likevel lagret, og svaret sier { varslet: false }.
// Beskyttet med en delt kode (env ADMIN_TOKEN) i header 'x-eluma-token'.
// service_role-nøkkelen brukes KUN her på serveren.
//
// Env-variabler: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN,
//                RESEND_API_KEY, VARSEL_FRA
// Forutsetning for varsel: partneren må ha en e-post lagret i `partnere.epost`.

import { varsleMontor, sbHeaders } from "./_leadhjelp.js";

export default async function handler(req, res) {
  const token = req.headers["x-eluma-token"];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)
    return res.status(401).json({ feil: "Ikke autorisert" });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (req.method === "GET") {
      const [leadsR, partnereR, enerettR] = await Promise.all([
        fetch(`${url}/rest/v1/leads?select=*&order=opprettet.desc&limit=200`, { headers: sbHeaders(key) }),
        fetch(`${url}/rest/v1/partnere?select=id,firma,fag,omrade,status&order=opprettet.desc`, { headers: sbHeaders(key) }),
        fetch(`${url}/rest/v1/enerett?select=partner_id,firma,fag,kommune,helkommune`, { headers: sbHeaders(key) }),
      ]);
      if (!leadsR.ok) {
        console.error("Supabase-feil:", await leadsR.text());
        return res.status(500).json({ feil: "Kunne ikke hente leads" });
      }
      const leads = await leadsR.json();
      const partnere = partnereR.ok ? await partnereR.json() : [];
      const enerett = enerettR.ok ? await enerettR.json() : [];
      return res.status(200).json({ leads, partnere, enerett });
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { id } = body;
      if (!id) return res.status(400).json({ feil: "Mangler id" });

      const felt = {};
      if ("montor" in body) felt.montor = body.montor || null;
      if ("status" in body) felt.status = body.status;
      if (Object.keys(felt).length === 0) return res.status(400).json({ feil: "Ingenting å oppdatere" });

      // Tildeling: lag en fersk engangs svar-token som montøren bruker for å ta/avslå fra e-posten
      if (felt.montor) felt.svar_token = globalThis.crypto.randomUUID();

      // Oppdater og få den oppdaterte raden tilbake (trenger detaljene + token til varselet)
      const oppdater = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...sbHeaders(key), Prefer: "return=representation" },
        body: JSON.stringify(felt),
      });
      if (!oppdater.ok) {
        console.error("Supabase-feil:", await oppdater.text());
        return res.status(500).json({ feil: "Oppdatering feilet" });
      }
      const rader = await oppdater.json().catch(() => []);
      const lead = Array.isArray(rader) ? rader[0] : null;

      // Varsle montøren — kun når vi faktisk tildeler (montør satt til noe)
      let varslet = false;
      if (felt.montor && lead) varslet = await varsleMontor(url, key, felt.montor, lead);

      return res.status(200).json({ ok: true, varslet });
    }

    return res.status(405).json({ feil: "Kun GET eller PATCH" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}
