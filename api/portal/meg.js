// /api/portal/meg.js — hvem er jeg? Krever gyldig sesjon (cookie).
// Returnerer KUN den innloggede partnerens egne data. partner-id kommer
// alltid fra sesjonen, aldri fra forespørselen.
//
// Dette er det første beskyttede endepunktet — det bekrefter at hele
// login → sesjon-løkken virker. Senere utvides svaret med leads, enerett, forbruk.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_SECRET

import { sbHeaders, krevPartner } from "./_auth.js";

const SELECT = "id,firma,orgnr,navn,mobil,epost,fag,dekning,status";

export default async function handler(req, res) {
  const pid = krevPartner(req, res);
  if (!pid) return; // 401 allerede sendt

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (req.method === "GET") {
      const r = await fetch(
        `${url}/rest/v1/partnere?id=eq.${encodeURIComponent(pid)}&select=${SELECT}&limit=1`,
        { headers: sbHeaders(key) }
      );
      const partner = (r.ok ? await r.json() : [])[0];
      if (!partner) return res.status(404).json({ feil: "Fant ikke partneren" });
      return res.status(200).json({ partner });
    }

    if (req.method === "PATCH") {
      // Partneren kan KUN endre sine egne kontaktfelt (hvitliste). Firma/org.nr/status/e-post
      // endres ALDRI her: identitet/fakturering/innloggingsidentitet — går via oss / egen verifiseringsflyt.
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const oppdat = {};
      if (typeof body.navn === "string") oppdat.navn = body.navn.trim().slice(0, 80);
      if (typeof body.mobil === "string") oppdat.mobil = body.mobil.trim().slice(0, 20);
      if (oppdat.navn !== undefined && !oppdat.navn) return res.status(400).json({ feil: "Navn kan ikke være tomt" });
      if (oppdat.mobil !== undefined && !/^\+?\d[\d\s]{6,}$/.test(oppdat.mobil)) return res.status(400).json({ feil: "Ugyldig mobilnummer" });
      if (!Object.keys(oppdat).length) return res.status(400).json({ feil: "Ingenting å oppdatere" });

      const r = await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(pid)}&select=${SELECT}`, {
        method: "PATCH",
        headers: { ...sbHeaders(key), Prefer: "return=representation" },
        body: JSON.stringify(oppdat),
      });
      if (!r.ok) { console.error("Profil-oppdatering feilet:", await r.text()); return res.status(500).json({ feil: "Lagring feilet" }); }
      const partner = (await r.json().catch(() => []))[0];
      return res.status(200).json({ partner });
    }

    return res.status(405).json({ feil: "Kun GET/PATCH" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}
