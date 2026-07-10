// /api/portal/abonnement.js — partnerens egne områder + enerett-forespørsler.
// GET    (sesjon): { dekning, fag, enerett (egne aktive), foresporsler (egne ventende),
//                    opptatt ({fag,kommune} som andre har — uten å røpe hvem) }.
// POST   (sesjon): { kommune, fag|null, helkommune } → lager en forespørsel (status "forespurt")
//                    og varsler deg. Du bekrefter ved å gi enerett i admin (Områder-fanen).
// DELETE (sesjon): { id } → trekk tilbake egen ventende forespørsel.
//
// Samtykke-modellen: partner BER OM, du BEKREFTER. Selve enerett-raden (med unique-vernet
// på fag+kommune) opprettes først når du gir enerett i admin — da blir den aktiv her.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_SECRET, RESEND_API_KEY, VARSEL_FRA, VARSEL_TIL

import { sbHeaders, krevPartner } from "./_auth.js";

const STOR = ["Kristiansand", "Arendal"];
const MIDDELS = ["Grimstad", "Lillesand", "Lindesnes", "Vennesla"];
const KOMMUNER = ["Arendal","Birkenes","Bygland","Bykle","Evje og Hornnes","Farsund","Flekkefjord","Froland","Gjerstad","Grimstad","Hægebostad","Iveland","Kristiansand","Kvinesdal","Lillesand","Lindesnes","Lyngdal","Risør","Sirdal","Tvedestrand","Valle","Vegårshei","Vennesla","Åmli","Åseral"];
const enerettPris = (k) => (STOR.includes(k) ? 990 : MIDDELS.includes(k) ? 590 : 290);

const FAG_NAVN = { solceller: "Solceller", elbillader: "Elbillader", batteri: "Batteri", smarthus: "Smarthus", elektriker: "Elektriker" };
const parseFag = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const nok = (n) => Number(n || 0).toLocaleString("nb-NO") + " kr";

async function hentPartner(url, key, pid) {
  const r = await fetch(
    `${url}/rest/v1/partnere?id=eq.${encodeURIComponent(pid)}&select=id,firma,fag,dekning&limit=1`,
    { headers: sbHeaders(key) }
  );
  return (r.ok ? await r.json() : [])[0] || null;
}

export default async function handler(req, res) {
  const pid = krevPartner(req, res);
  if (!pid) return; // 401 allerede sendt

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const p = await hentPartner(url, key, pid);
    if (!p) return res.status(404).json({ feil: "Fant ikke partneren" });

    if (req.method === "GET") {
      const [egenR, foresporslerR, alleR] = await Promise.all([
        fetch(`${url}/rest/v1/enerett?partner_id=eq.${encodeURIComponent(pid)}&select=fag,kommune,helkommune`, { headers: sbHeaders(key) }),
        fetch(`${url}/rest/v1/enerett_foresporsel?partner_id=eq.${encodeURIComponent(pid)}&status=eq.forespurt&select=id,fag,kommune,helkommune,status&order=opprettet.desc`, { headers: sbHeaders(key) }),
        fetch(`${url}/rest/v1/enerett?select=fag,kommune,partner_id`, { headers: sbHeaders(key) }),
      ]);
      const enerett = egenR.ok ? await egenR.json() : [];
      const foresporsler = foresporslerR.ok ? await foresporslerR.json() : [];
      const alle = alleR.ok ? await alleR.json() : [];
      const opptatt = alle.filter((e) => e.partner_id !== pid).map((e) => ({ fag: e.fag, kommune: e.kommune }));
      return res.status(200).json({ dekning: p.dekning || [], fag: p.fag || "", enerett, foresporsler, opptatt });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const kommune = String(body.kommune || "").trim();
      const helkommune = !!body.helkommune;
      const fag = helkommune ? null : String(body.fag || "").trim();
      if (!kommune) return res.status(400).json({ feil: "Velg en kommune." });
      if (!helkommune && !fag) return res.status(400).json({ feil: "Velg et fag." });
      if (!helkommune && !parseFag(p.fag).includes(fag)) return res.status(400).json({ feil: "Du er ikke registrert med dette faget." });

      // Opptatt av en annen? (per fag, eller hele kommunen)
      const opptattR = await fetch(
        `${url}/rest/v1/enerett?kommune=eq.${encodeURIComponent(kommune)}` + (helkommune ? "" : `&fag=eq.${encodeURIComponent(fag)}`) + `&select=partner_id`,
        { headers: sbHeaders(key) }
      );
      const opptatt = (opptattR.ok ? await opptattR.json() : []).filter((e) => e.partner_id !== pid);
      if (opptatt.length) return res.status(409).json({ feil: `Opptatt i ${kommune} akkurat nå.` });

      // Allerede en ventende forespørsel på det samme?
      const dupR = await fetch(
        `${url}/rest/v1/enerett_foresporsel?partner_id=eq.${encodeURIComponent(pid)}&kommune=eq.${encodeURIComponent(kommune)}&helkommune=eq.${helkommune}&status=eq.forespurt` + (helkommune ? "" : `&fag=eq.${encodeURIComponent(fag)}`) + `&select=id&limit=1`,
        { headers: sbHeaders(key) }
      );
      if ((dupR.ok ? await dupR.json() : []).length) return res.status(409).json({ feil: "Du har allerede bedt om dette." });

      const lagre = await fetch(`${url}/rest/v1/enerett_foresporsel`, {
        method: "POST",
        headers: { ...sbHeaders(key), Prefer: "return=minimal" },
        body: JSON.stringify({ partner_id: pid, firma: p.firma, fag, kommune, helkommune, status: "forespurt" }),
      });
      if (!lagre.ok) { console.error("Forespørsel-lagring feilet:", await lagre.text()); return res.status(500).json({ feil: "Noe gikk galt. Prøv igjen." }); }

      varsleDeg(p.firma, fag, kommune, helkommune).catch(() => {}); // best-effort
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (!body.id) return res.status(400).json({ feil: "Mangler id" });
      const r = await fetch(
        `${url}/rest/v1/enerett_foresporsel?id=eq.${encodeURIComponent(body.id)}&partner_id=eq.${encodeURIComponent(pid)}&status=eq.forespurt`,
        { method: "DELETE", headers: { ...sbHeaders(key), Prefer: "return=minimal" } }
      );
      if (!r.ok) return res.status(500).json({ feil: "Kunne ikke trekke tilbake." });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      let dekning = Array.isArray(body.dekning) ? [...new Set(body.dekning.filter((k) => KOMMUNER.includes(k)))] : null;
      if (!dekning) return res.status(400).json({ feil: "Mangler dekning" });
      // Kan ikke fjerne en kommune der partneren har enerett
      const eR = await fetch(`${url}/rest/v1/enerett?partner_id=eq.${encodeURIComponent(pid)}&select=kommune`, { headers: sbHeaders(key) });
      const eKom = [...new Set((eR.ok ? await eR.json() : []).map((e) => e.kommune))];
      const mangler = eKom.filter((k) => !dekning.includes(k));
      if (mangler.length) return res.status(409).json({ feil: `Du har enerett i ${mangler.join(", ")} — fjern eneretten først.` });
      const r = await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(pid)}`, {
        method: "PATCH", headers: { ...sbHeaders(key), Prefer: "return=minimal" }, body: JSON.stringify({ dekning }),
      });
      if (!r.ok) { console.error("Dekning-lagring feilet:", await r.text()); return res.status(500).json({ feil: "Kunne ikke lagre dekning" }); }
      return res.status(200).json({ ok: true, dekning });
    }

    return res.status(405).json({ feil: "Kun GET, POST, PATCH eller DELETE" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}

async function varsleDeg(firma, fag, kommune, helkommune) {
  const til = process.env.VARSEL_TIL;
  if (!til || !process.env.RESEND_API_KEY) return;
  const hva = helkommune ? "hele kommunen (alle sine fag)" : (FAG_NAVN[fag] || fag);
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.VARSEL_FRA,
      to: til,
      subject: `Enerett-forespørsel: ${firma} — ${kommune}`,
      html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#191C19">
        <h2 style="font-size:18px;margin:0 0 6px">Ny enerett-forespørsel</h2>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6">
          <strong>${firma}</strong> ønsker enerett på <strong>${hva}</strong> i <strong>${kommune}</strong>
          (veil. ${nok(enerettPris(kommune))}/mnd).
        </p>
        <p style="margin:0;font-size:14px;line-height:1.6">
          Bekreft ved å gi enerett i admin → fanen <strong>Områder &amp; enerett</strong>. Da blir den aktiv i portalen deres.
        </p>
      </div>`,
    }),
  });
}
