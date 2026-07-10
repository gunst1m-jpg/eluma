// /api/partner.js — Vercel serverless-funksjon (Node, ESM)
// Tar imot interessemelding fra en fagperson/installatør (Fagfolk-siden),
// validerer, lagrer i Supabase og varsler deg på e-post. Ingen npm-avhengigheter.
//
// Forventet Supabase-tabell (kjør én gang i SQL-editoren):
//   create table partnere (
//     id uuid default gen_random_uuid() primary key,
//     opprettet timestamptz, type text,
//     firma text, orgnr text, navn text, mobil text, epost text,
//     fag text, omrade text, melding text,
//     samtykke_tidspunkt timestamptz, status text
//   );
//
// Env-variabler (samme som lead.js):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VARSEL_FRA, VARSEL_TIL

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ feil: "Kun POST" });

  const p = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const kontakt = p.kontakt || {};
  const samtykke = p.samtykke || {};
  const fag = Array.isArray(p.fag) ? p.fag : [];

  // --- Validering ---
  if (!p.firma || !p.firma.trim()) return res.status(400).json({ feil: "Mangler firma" });
  if (!kontakt.navn || !/^\+?\d[\d\s]{6,}$/.test(String(kontakt.mobil || "").trim()))
    return res.status(400).json({ feil: "Mangler gyldig kontaktinfo" });
  if (fag.length === 0) return res.status(400).json({ feil: "Velg minst ett fag" });
  if (samtykke.kontakt !== true) return res.status(400).json({ feil: "Mangler samtykke" });

  const naa = new Date().toISOString();

  const rad = {
    opprettet: naa,
    type: p.type || "fagperson",
    firma: p.firma.trim(),
    orgnr: p.orgnr || null,
    navn: kontakt.navn,
    mobil: kontakt.mobil,
    epost: kontakt.epost || null,
    fag: fag.join(", "),
    omrade: p.omrade || null,
    melding: p.melding || null,
    samtykke_tidspunkt: naa,
    status: p.status || "interessert",
  };

  try {
    // 1) Lagre i Supabase
    const lagre = await fetch(`${process.env.SUPABASE_URL}/rest/v1/partnere`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rad),
    });
    if (!lagre.ok) {
      console.error("Supabase-feil:", await lagre.text());
      return res.status(500).json({ feil: "Lagring feilet" });
    }

    // 2) Varsle på e-post (Resend) — feiler dette, er meldingen likevel lagret
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.VARSEL_FRA,
        to: process.env.VARSEL_TIL,
        subject: `Ny partner-interesse — ${rad.firma}`,
        html: epostHtml(rad),
      }),
    }).catch((e) => console.error("Resend-feil (meldingen er lagret):", e));

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ feil: "Uventet feil" });
  }
}

function epostHtml(r) {
  const rad = (key, v) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#7C7B72">${key}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`;
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#191C19">
    <h2 style="font-size:19px;margin:0 0 4px">Ny partner-interesse — ${r.firma}</h2>
    <p style="margin:0 0 18px;color:#7C7B72;font-size:14px">${r.fag}${r.omrade ? " · " + r.omrade : ""}</p>
    <table style="border-collapse:collapse;font-size:14px">
      ${rad("Firma", r.firma)}
      ${rad("Org.nr", r.orgnr || "—")}
      ${rad("Kontakt", r.navn)}
      ${rad("Mobil", r.mobil)}
      ${rad("E-post", r.epost || "—")}
      ${rad("Fag", r.fag)}
      ${rad("Område", r.omrade || "—")}
      ${rad("Melding", r.melding || "—")}
    </table>
  </div>`;
}
