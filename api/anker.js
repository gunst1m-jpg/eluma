// /api/anker.js — regionalt prisanker (beslutning C2). GET ?tjeneste=&omfang=&kommune=
// Fallback-stige (lån styrke): faktiske Agder-jobber (fra C3 `sluttpris`) → statisk estimat-gulv (N=0).
// Default nivå = REGION (Agder). Kommune-nivå kun når N ≥ K_MIN — kjernekostnaden er regional,
// kommune-anker er falsk presisjon under tynn N. Robust (bøtte-IQR), ikke snitt.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { sbHeaders } from "./_leadhjelp.js";

// N=0-gulvet: OPPSTARTSHYPOTESER, «ferdig montert, varierer». Kalibreres mot faktiske tall (C3-dataen).
// Hold nøklene i synk med `kategori` i lead.js (elektriker_*, smarthus_*, ellers tjeneste),
// og med ANKER_SEED i App.jsx.
export const SEED = {
  solceller: [100000, 250000],  // kalibrert mot Agder Tak: 100–300k inkl. montering (15 kr/W); topp trimmet til «typisk»
  batteri: [40000, 90000],
  elbillader: [12000, 22000],
  smarthus_strom: [8000, 25000],
  smarthus_enkel: [5000, 20000],
  elektriker_storre: [15000, 60000],
  elektriker_mindre: [2000, 12000],
};

// Bøtte → representativt spenn (samme bøtter som C3 utfall.js).
const BOTTE = { "under-15k": [8000, 15000], "15-25k": [15000, 25000], "25-40k": [25000, 40000], "over-40k": [40000, 70000] };
const REKKE = ["under-15k", "15-25k", "25-40k", "over-40k"];
const K_MIN = 8; // færre reelle jobber enn dette → for tynt, fall til grovere nivå / estimat

export function kategoriKey(tjeneste, omfang) {
  if (tjeneste === "elektriker") return "elektriker_" + (omfang || "mindre");
  if (tjeneste === "smarthus") return "smarthus_" + (omfang || "enkel");
  return tjeneste;
}

// Robust IQR-aktig spenn over bøttene: lav = p25-bøttens bunn, høy = p75-bøttens topp.
// Én stor jobb kan ikke dra spennet slik et snitt ville blitt dratt.
export function spennFraBotter(rows) {
  const tell = Object.fromEntries(REKKE.map((b) => [b, 0]));
  let n = 0;
  for (const r of rows) if (r.sluttpris in tell) { tell[r.sluttpris]++; n++; }
  if (n < K_MIN) return null;
  let c = 0; const kum = REKKE.map((b) => { c += tell[b]; return [b, c]; });
  const at = (p) => { const mal = p * n; for (const [b, cc] of kum) if (cc >= mal) return b; return REKKE[REKKE.length - 1]; };
  return { lav: BOTTE[at(0.25)][0], hoy: BOTTE[at(0.75)][1], n };
}

// Gjenbrukbar anker-beregning (brukes av dette endepunktet OG av andre-vurdering.js sin D1-gren).
// Returnerer { tjeneste, kategori, lav, hoy, kilde, nivaa, omrade, n } eller null (ukjent tjeneste).
export async function beregnAnker(tjeneste, omfang, kommune) {
  const key = kategoriKey(tjeneste, omfang);
  const seed = SEED[key];
  if (!seed) return null;
  const base = { tjeneste, kategori: key };
  const url = process.env.SUPABASE_URL, sk = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && sk) {
    const q = `${url}/rest/v1/leads?select=sluttpris,kommune&kategori=eq.${encodeURIComponent(key)}&sluttpris=not.is.null`;
    // 1) Kommune-nivå — kun hvis nok N (ellers falsk presisjon)
    if (kommune) {
      const r = await fetch(`${q}&kommune=eq.${encodeURIComponent(kommune)}`, { headers: sbHeaders(sk) }).catch(() => null);
      const s = spennFraBotter(r && r.ok ? await r.json() : []);
      if (s) return { ...base, ...s, kilde: "faktiske", nivaa: "kommune", omrade: kommune };
    }
    // 2) Region-nivå (Agder)
    const r = await fetch(q, { headers: sbHeaders(sk) }).catch(() => null);
    const s = spennFraBotter(r && r.ok ? await r.json() : []);
    if (s) return { ...base, ...s, kilde: "faktiske", nivaa: "region", omrade: "Agder" };
  }
  // 3) N=0-gulv: statisk estimat
  return { ...base, lav: seed[0], hoy: seed[1], kilde: "estimat", nivaa: "region", omrade: "Agder", n: 0 };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const a = await beregnAnker(searchParams.get("tjeneste"), searchParams.get("omfang") || null, searchParams.get("kommune") || null);
    if (!a) return res.status(400).json({ feil: "Ukjent tjeneste" });
    return res.json(a);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Feil" });
  }
}
