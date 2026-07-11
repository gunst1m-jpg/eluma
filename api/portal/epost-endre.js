// /api/portal/epost-endre.js — partneren ber om å endre innloggings-/varsel-e-posten sin.
// POST { nyEpost }. Krever gyldig sesjon. Sender en BEKREFTELSESLENKE til den NYE adressen;
// e-posten byttes først når lenken klikkes (epost-bekreft) — så en typo eller uvedkommende ikke
// kan låse ut / kapre kontoen. Varsler også den GAMLE adressen (så et bytte aldri skjer stille).
// Egen tabell epost_endring (ikke innloggings-tokenene) → en endrings-token kan aldri logge inn.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VARSEL_FRA, SITE_URL, PORTAL_SECRET
import { sbHeaders, nyToken, hashToken, krevPartner } from "./_auth.js";

const EPOST_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ feil: "Kun POST" });
  const pid = krevPartner(req, res);
  if (!pid) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const nyEpost = String(body.nyEpost || "").trim().toLowerCase();
  if (!EPOST_RE.test(nyEpost)) return res.status(400).json({ feil: "Oppgi en gyldig e-post." });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const meg = (await (await fetch(`${url}/rest/v1/partnere?id=eq.${encodeURIComponent(pid)}&select=firma,epost&limit=1`, { headers: sbHeaders(key) })).json())[0];
    if (!meg) return res.status(404).json({ feil: "Fant ikke partneren" });
    if (meg.epost && meg.epost.toLowerCase() === nyEpost) return res.status(400).json({ feil: "Dette er allerede e-posten din." });

    // Ikke la to partnere ende med samme innloggings-e-post
    const opptatt = (await (await fetch(`${url}/rest/v1/partnere?epost=eq.${encodeURIComponent(nyEpost)}&select=id&limit=1`, { headers: sbHeaders(key) })).json())[0];
    if (opptatt) return res.status(409).json({ feil: "Denne e-posten er allerede i bruk hos en annen partner." });

    const raw = nyToken();
    const utlop = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const lagre = await fetch(`${url}/rest/v1/epost_endring`, {
      method: "POST", headers: { ...sbHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify({ partner_id: pid, ny_epost: nyEpost, token_hash: hashToken(raw), utlop }),
    });
    if (!lagre.ok) { console.error("Endrings-token feilet:", await lagre.text()); return res.status(500).json({ feil: "Noe gikk galt. Prøv igjen." }); }

    const base = process.env.SITE_URL || "";
    const lenke = `${base}/api/portal/epost-bekreft?token=${encodeURIComponent(raw)}`;

    // 1) Bekreftelse til NY adresse (byttet skjer først når denne klikkes)
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.VARSEL_FRA, to: nyEpost,
        subject: "Bekreft ny e-post for Eluma-portalen",
        html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#191C19">
          <h2 style="font-size:19px;margin:0 0 6px">Bekreft ny e-post</h2>
          <p style="margin:0 0 18px;color:#7C7B72;font-size:14px;line-height:1.6">${meg.firma || "En Eluma-partner"} vil bruke denne adressen for innlogging og leads. Trykk for å bekrefte — lenken varer i 30 minutter.</p>
          <a href="${lenke}" style="display:inline-block;background:#C6F24E;color:#191C19;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px">Bekreft e-post</a>
          <p style="margin:18px 0 0;font-size:12.5px;color:#7C7B72">Kjenner du ikke igjen dette? Se bort fra e-posten — ingenting endres uten at du bekrefter.</p>
        </div>`,
      }),
    }).catch((e) => console.error("Bekreftelse til ny e-post feilet:", e));

    // 2) Varsel til GAMMEL adresse (så et bytte aldri skjer stille — anti-kapring)
    if (meg.epost) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.VARSEL_FRA, to: meg.epost,
          subject: "Forespørsel om å endre e-post på Eluma",
          html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#191C19">
            <p style="font-size:14px;line-height:1.6;margin:0 0 12px">Det er bedt om å endre innloggings-e-posten for ${meg.firma || "kontoen din"} til <strong>${nyEpost}</strong>. Endringen skjer først når den nye adressen bekreftes.</p>
            <p style="font-size:13px;color:#7C7B72;margin:0">Var ikke dette deg? Ta kontakt med oss med en gang — den gamle adressen er gyldig til den nye er bekreftet.</p>
          </div>`,
        }),
      }).catch((e) => console.error("Varsel til gammel e-post feilet:", e));
    }

    return res.status(200).json({ ok: true, melding: `Vi har sendt en bekreftelseslenke til ${nyEpost}. Den nye adressen tas i bruk når den bekreftes.` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Noe gikk galt. Prøv igjen." });
  }
}
