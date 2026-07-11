// /api/portal/meg.js — hvem er jeg? Krever gyldig sesjon (cookie).
// Returnerer KUN den innloggede partnerens egne data. partner-id kommer
// alltid fra sesjonen, aldri fra forespørselen.
//
// Dette er det første beskyttede endepunktet — det bekrefter at hele
// login → sesjon-løkken virker. Senere utvides svaret med leads, enerett, forbruk.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_SECRET

import { sbHeaders, krevPartner } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ feil: "Kun GET" });

  const pid = krevPartner(req, res);
  if (!pid) return; // 401 allerede sendt

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const r = await fetch(
      `${url}/rest/v1/partnere?id=eq.${encodeURIComponent(pid)}&select=id,firma,orgnr,navn,mobil,epost,fag,dekning,status&limit=1`,
      { headers: sbHeaders(key) }
    );
    const partner = (r.ok ? await r.json() : [])[0];
    if (!partner) return res.status(404).json({ feil: "Fant ikke partneren" });
    return res.status(200).json({ partner });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}
