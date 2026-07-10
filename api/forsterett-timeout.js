// /api/forsterett-timeout.js — B1: førsterett er "første avslag", ikke evig monopol.
// Leads som er tildelt, men IKKE besvart innen FORSTERETT_TIMER, faller automatisk til benken.
// Meningen: en treg/uinteressert holder lekker leads og selvkorrigerer — det som skiller førsterett
// fra absolutt enerett. Finnes ingen benk (tynn kommune) beholder holderen leadet (ingen alternativ).
//
// Kjøres av en Vercel Cron (vercel.json → crons), eller manuelt. Auth: ADMIN_TOKEN.
//   Header 'x-eluma-token: <ADMIN_TOKEN>'  eller  ?token=<ADMIN_TOKEN>
//
// MERK: klokka er `opprettet` (vi lagrer ikke tildelingstidspunkt ennå). Presist nok for
// auto-tildelte førsterett-leads (tildeles ved innkomst). Egen `tildelt_tidspunkt` = senere forbedring.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN, RESEND_API_KEY, VARSEL_FRA
import { sbHeaders, omfordelTilBenk } from "./_leadhjelp.js";

const FORSTERETT_TIMER = 48; // timer uten svar før leadet faller til benken (samme SLA som montør-varselet)

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  // Manuelt: ADMIN_TOKEN (header x-eluma-token / ?token). Cron: Vercel sender Authorization: Bearer CRON_SECRET.
  const token = req.headers["x-eluma-token"] || searchParams.get("token");
  const adminOk = process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
  const cronOk = process.env.CRON_SECRET && req.headers["authorization"] === `Bearer ${process.env.CRON_SECRET}`;
  if (!adminOk && !cronOk) return res.status(401).json({ feil: "Ikke autorisert" });

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const grense = new Date(Date.now() - FORSTERETT_TIMER * 3600000).toISOString();
  try {
    // Tildelte, ubesvarte leads (svar_token != null) eldre enn grensen.
    const q = `${url}/rest/v1/leads?select=*&status=eq.tildelt&svar_token=not.is.null&opprettet=lt.${encodeURIComponent(grense)}`;
    const r = await fetch(q, { headers: sbHeaders(key) });
    if (!r.ok) return res.status(500).json({ feil: "Henting feilet" });
    const leads = await r.json();

    let omfordelt = 0, beholdt = 0;
    for (const lead of leads) {
      const utfall = await omfordelTilBenk(url, key, lead);
      if (utfall.ok) omfordelt++; else beholdt++; // beholdt = ingen benk (tynn kommune)
    }
    return res.json({ ok: true, grenseTimer: FORSTERETT_TIMER, behandlet: leads.length, omfordelt, beholdt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Feil" });
  }
}
