// /api/portal/forbruk.js — partnerens forbruk denne måneden.
// GET (sesjon): antall leads + kostnad inneværende måned, og enerett per måned.
//
// Belastes: leads partneren har TATT (akseptert/kontaktet/vunnet/tapt). Avslåtte
// leads krediteres (belastes ikke). Lead-pris = leadets `leadverdi`. Enerett/mnd =
// sum av kommunesats for hver kommune partneren har enerett i (telles én gang per kommune).
// Veiledende tall — endelig fakturering avtales.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_SECRET

import { sbHeaders, krevPartner } from "./_auth.js";

const STOR = ["Kristiansand", "Arendal"];
const MIDDELS = ["Grimstad", "Lillesand", "Lindesnes", "Vennesla"];
const enerettPris = (k) => (STOR.includes(k) ? 990 : MIDDELS.includes(k) ? 590 : 290);

const MND = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
const TATT = ["akseptert", "kontaktet", "vunnet", "tapt"]; // leads som belastes

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ feil: "Kun GET" });

  const pid = krevPartner(req, res);
  if (!pid) return; // 401 allerede sendt

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [leadsR, enerettR] = await Promise.all([
      fetch(`${url}/rest/v1/leads?montor=eq.${encodeURIComponent(pid)}&opprettet=gte.${start}&select=leadverdi,status&limit=1000`, { headers: sbHeaders(key) }),
      fetch(`${url}/rest/v1/enerett?partner_id=eq.${encodeURIComponent(pid)}&select=kommune`, { headers: sbHeaders(key) }),
    ]);
    const leads = leadsR.ok ? await leadsR.json() : [];
    const enerett = enerettR.ok ? await enerettR.json() : [];

    const tatt = leads.filter((l) => TATT.includes(l.status));
    const leadKostnad = tatt.reduce((s, l) => s + (Number(l.leadverdi) || 0), 0);

    const kommuner = [...new Set(enerett.map((e) => e.kommune))];
    const enerettMnd = kommuner.reduce((s, k) => s + enerettPris(k), 0);

    return res.status(200).json({
      maaned: `${MND[now.getMonth()]} ${now.getFullYear()}`,
      antallTotalt: leads.length,
      antallTatt: tatt.length,
      antallNye: leads.filter((l) => l.status === "tildelt").length,
      antallAvslatt: leads.filter((l) => l.status === "avslatt").length,
      leadKostnad,
      enerettMnd,
      total: leadKostnad + enerettMnd,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}
