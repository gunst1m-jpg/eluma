// /api/territorier.js — intern admin: forvalt dekningsområder og enerett per kommune,
// og behandle enerett-forespørsler fra partnerportalen.
// Token-beskyttet (header 'x-eluma-token' mot ADMIN_TOKEN). service_role brukes kun her.
//
// DB-garantien mot dobbel enerett ligger i tabellen (unique (fag, kommune)) — selv om
// noe skulle gå galt i UI-et, kan to partnere ALDRI få samme fag-enerett i samme kommune.
//
// Skjema: se eluma-drift-oppsett.md (tabellene `enerett` og `enerett_foresporsel`).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN

const FAG_KEYS = ["solceller", "elbillader", "batteri", "smarthus", "elektriker"];

function sbHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

// Gir enerett (ett fag, eller hele kommunen). Returnerer { status, json } — gjenbrukes
// både av vanlig tildeling og av godkjenning av en forespørsel.
async function girEnerett(url, key, { partnerId, firma, fag, kommune, helkommune }) {
  if (helkommune) {
    const iK = await fetch(
      `${url}/rest/v1/enerett?select=partner_id,firma&kommune=eq.${encodeURIComponent(kommune)}`,
      { headers: sbHeaders(key) }
    );
    const rader = iK.ok ? await iK.json() : [];
    const annen = rader.find((r) => r.partner_id !== partnerId);
    if (annen) return { status: 409, json: { feil: `Opptatt — ${annen.firma} har allerede enerett i ${kommune}.`, holder: annen.firma } };

    await fetch(`${url}/rest/v1/enerett?partner_id=eq.${encodeURIComponent(partnerId)}&kommune=eq.${encodeURIComponent(kommune)}`,
      { method: "DELETE", headers: { ...sbHeaders(key), Prefer: "return=minimal" } });
    const nye = FAG_KEYS.map((ff) => ({ partner_id: partnerId, firma: firma || null, fag: ff, kommune, helkommune: true }));
    const ins = await fetch(`${url}/rest/v1/enerett`, {
      method: "POST", headers: { ...sbHeaders(key), Prefer: "return=representation" }, body: JSON.stringify(nye),
    });
    if (!ins.ok) { console.error("Supabase-feil:", await ins.text()); return { status: 500, json: { feil: "Kunne ikke låse hele kommunen" } }; }
    const lagt = await ins.json().catch(() => []);
    return { status: 200, json: { ok: true, rader: lagt } };
  }

  if (!fag) return { status: 400, json: { feil: "Mangler fag" } };
  const sjekk = await fetch(
    `${url}/rest/v1/enerett?select=firma,partner_id&fag=eq.${encodeURIComponent(fag)}&kommune=eq.${encodeURIComponent(kommune)}&limit=1`,
    { headers: sbHeaders(key) }
  );
  const fins = sjekk.ok ? await sjekk.json() : [];
  if (fins[0]) {
    if (fins[0].partner_id === partnerId) return { status: 200, json: { ok: true } };
    return { status: 409, json: { feil: `Opptatt — ${fins[0].firma} har allerede denne eneretten.`, holder: fins[0].firma } };
  }
  const r = await fetch(`${url}/rest/v1/enerett`, {
    method: "POST", headers: { ...sbHeaders(key), Prefer: "return=representation" },
    body: JSON.stringify({ partner_id: partnerId, firma: firma || null, fag, kommune, helkommune: false }),
  });
  if (r.status === 409) return { status: 409, json: { feil: "Opptatt — denne eneretten er allerede tatt." } };
  if (!r.ok) { console.error("Supabase-feil:", await r.text()); return { status: 500, json: { feil: "Kunne ikke gi enerett" } }; }
  const rad = (await r.json())[0] || null;
  return { status: 200, json: { ok: true, rad } };
}

// Sørger for at kommunen ligger i partnerens dekning (enerett krever dekning).
async function sikreDekning(url, key, partnerId, kommune) {
  const r = await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(partnerId)}&select=dekning&limit=1`, { headers: sbHeaders(key) });
  const p = (r.ok ? await r.json() : [])[0];
  const dekning = Array.isArray(p?.dekning) ? p.dekning : [];
  if (dekning.includes(kommune)) return;
  await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(partnerId)}`, {
    method: "PATCH", headers: { ...sbHeaders(key), Prefer: "return=minimal" },
    body: JSON.stringify({ dekning: [...dekning, kommune] }),
  });
}

export default async function handler(req, res) {
  const token = req.headers["x-eluma-token"];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)
    return res.status(401).json({ feil: "Ikke autorisert" });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (req.method === "GET") {
      const [pR, eR, fR] = await Promise.all([
        fetch(`${url}/rest/v1/partnere?select=id,firma,orgnr,fag,status,dekning&order=firma.asc`, { headers: sbHeaders(key) }),
        fetch(`${url}/rest/v1/enerett?select=*&order=fag.asc`, { headers: sbHeaders(key) }),
        fetch(`${url}/rest/v1/enerett_foresporsel?status=eq.forespurt&select=*&order=opprettet.desc`, { headers: sbHeaders(key) }),
      ]);
      if (!pR.ok) {
        console.error("Supabase-feil:", await pR.text());
        return res.status(500).json({ feil: "Kunne ikke hente partnere" });
      }
      const partnere = await pR.json();
      const enerett = eR.ok ? await eR.json() : [];
      const foresporsler = fR.ok ? await fR.json() : [];
      return res.status(200).json({ partnere, enerett, foresporsler });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    // Sett dekningsområde for en partner
    if (req.method === "PATCH") {
      const { partnerId, dekning } = body;
      if (!partnerId || !Array.isArray(dekning)) return res.status(400).json({ feil: "Mangler partnerId/dekning" });
      const r = await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(partnerId)}`, {
        method: "PATCH", headers: { ...sbHeaders(key), Prefer: "return=minimal" }, body: JSON.stringify({ dekning }),
      });
      if (!r.ok) { console.error("Supabase-feil:", await r.text()); return res.status(500).json({ feil: "Kunne ikke lagre dekning" }); }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "POST") {
      // --- Behandle en forespørsel fra portalen (godkjenn/avslå) ---
      if (body.foresporselId) {
        const { foresporselId, handling } = body;
        const fr = await fetch(`${url}/rest/v1/enerett_foresporsel?id=eq.${encodeURIComponent(foresporselId)}&select=*&limit=1`, { headers: sbHeaders(key) });
        const f = (fr.ok ? await fr.json() : [])[0];
        if (!f) return res.status(404).json({ feil: "Fant ikke forespørselen" });
        if (f.status !== "forespurt") return res.status(409).json({ feil: "Forespørselen er allerede behandlet." });

        if (handling === "avsla") {
          const up = await fetch(`${url}/rest/v1/enerett_foresporsel?id=eq.${encodeURIComponent(foresporselId)}`, {
            method: "PATCH", headers: { ...sbHeaders(key), Prefer: "return=minimal" }, body: JSON.stringify({ status: "avslatt" }),
          });
          if (!up.ok) return res.status(500).json({ feil: "Kunne ikke avslå" });
          return res.status(200).json({ ok: true, status: "avslatt" });
        }

        // Godkjenn: dekning → enerett → marker godkjent (stopper hvis enerett er opptatt)
        await sikreDekning(url, key, f.partner_id, f.kommune);
        const g = await girEnerett(url, key, { partnerId: f.partner_id, firma: f.firma, fag: f.fag, kommune: f.kommune, helkommune: f.helkommune });
        if (g.status >= 400) return res.status(g.status).json(g.json);
        await fetch(`${url}/rest/v1/enerett_foresporsel?id=eq.${encodeURIComponent(foresporselId)}`, {
          method: "PATCH", headers: { ...sbHeaders(key), Prefer: "return=minimal" }, body: JSON.stringify({ status: "godkjent" }),
        });
        return res.status(200).json({ ok: true, status: "godkjent", ...g.json });
      }

      // --- Vanlig tildeling fra Områder-fanen ---
      const { partnerId, firma, fag, kommune, helkommune } = body;
      if (!partnerId || !kommune) return res.status(400).json({ feil: "Mangler felt" });
      const g = await girEnerett(url, key, { partnerId, firma, fag, kommune, helkommune });
      return res.status(g.status).json(g.json);
    }

    // Fjern enerett: id (ett fag) ELLER partnerId+kommune (hele kommunen)
    if (req.method === "DELETE") {
      const { id, partnerId, kommune } = body;
      let q = null;
      if (id) q = `id=eq.${encodeURIComponent(id)}`;
      else if (partnerId && kommune) q = `partner_id=eq.${encodeURIComponent(partnerId)}&kommune=eq.${encodeURIComponent(kommune)}`;
      else return res.status(400).json({ feil: "Mangler id eller partnerId+kommune" });
      const r = await fetch(`${url}/rest/v1/enerett?${q}`, { method: "DELETE", headers: { ...sbHeaders(key), Prefer: "return=minimal" } });
      if (!r.ok) { console.error("Supabase-feil:", await r.text()); return res.status(500).json({ feil: "Kunne ikke fjerne enerett" }); }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ feil: "Metode ikke støttet" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}
