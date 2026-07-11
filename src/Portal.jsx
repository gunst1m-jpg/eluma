import { useState, useRef, useEffect } from "react";

const BOLT = 'M38,4 L8,56 L26,56 L20,96 L48,42 L30,42 Z';
const PAL = { lime: '#C6F24E', ink: '#191C19', paper: '#F4F3EE' };

const LOGO_CSS = `
.eluma-logo{--el-h:40px;--el-bolt:#C6F24E;--el-text:#191C19;--el-glowA:.16;display:inline-flex;align-items:center;gap:calc(var(--el-h)*.30);line-height:0}
.eluma-logo .el-icon{position:relative;width:calc(var(--el-h)*.56);height:var(--el-h);overflow:visible;flex:0 0 auto}
.eluma-logo .el-glow{position:absolute;left:50%;top:48%;width:calc(var(--el-h)*2.4);height:calc(var(--el-h)*2.4);transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;filter:blur(calc(var(--el-h)*.06));background:radial-gradient(circle,rgba(198,242,78,var(--el-glowA)) 0%,rgba(198,242,78,0) 64%);animation:el-breathe 3.4s ease-in-out infinite}
.eluma-logo .el-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.eluma-logo .el-word{position:relative;display:inline-block;font-family:'Unbounded',sans-serif;font-weight:700;font-size:var(--el-h);letter-spacing:-.02em;line-height:1;color:var(--el-text);white-space:nowrap}
.eluma-logo .el-ltr{position:absolute;top:0}
.eluma-logo.is-playing .el-half.top{animation:el-slideTop .6s cubic-bezier(.5,.02,.28,1.3) .1s both}
.eluma-logo.is-playing .el-half.bot{animation:el-slideBot .6s cubic-bezier(.5,.02,.28,1.3) .1s both}
.eluma-logo.is-playing .el-icon{animation:el-flicker 1.05s linear .62s both}
.eluma-logo.is-playing .el-glow{animation:el-bloom .8s ease-out .62s both,el-breathe 3.4s ease-in-out 1.8s infinite}
.eluma-logo.is-playing .el-ltr{animation:el-ltrFlicker .55s linear var(--el-ld,1s) both}
@keyframes el-slideTop{0%{transform:translate(calc(var(--el-dx)*-1),calc(var(--el-dy)*-1));opacity:0}55%{opacity:1}100%{transform:translate(0,0);opacity:1}}
@keyframes el-slideBot{0%{transform:translate(var(--el-dx),var(--el-dy));opacity:0}55%{opacity:1}100%{transform:translate(0,0);opacity:1}}
@keyframes el-flicker{0%{opacity:1;filter:brightness(1)}5%{opacity:.08;filter:brightness(.35)}9%{opacity:1;filter:brightness(1.9) drop-shadow(0 0 14px rgba(198,242,78,.95))}13%{opacity:.18;filter:brightness(.45)}19%{opacity:1;filter:brightness(1.4)}24%{opacity:.06;filter:brightness(.3)}31%{opacity:1;filter:brightness(2.1) drop-shadow(0 0 22px rgba(198,242,78,1))}37%{opacity:.4;filter:brightness(.6)}45%{opacity:1;filter:brightness(1.35)}53%{opacity:.7}61%{opacity:1;filter:brightness(1.75) drop-shadow(0 0 13px rgba(198,242,78,.85))}72%{opacity:.9}84%{opacity:1;filter:brightness(1.2)}100%{opacity:1;filter:brightness(1)}}
@keyframes el-bloom{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}42%{opacity:.95;transform:translate(-50%,-50%) scale(1.18)}100%{opacity:.16;transform:translate(-50%,-50%) scale(1)}}
@keyframes el-breathe{0%,100%{opacity:.12;transform:translate(-50%,-50%) scale(1)}50%{opacity:.2;transform:translate(-50%,-50%) scale(1.04)}}
@keyframes el-ltrFlicker{0%{opacity:0}12%{opacity:1}17%{opacity:.1}28%{opacity:1}35%{opacity:.3}47%{opacity:1}58%{opacity:.72}100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.eluma-logo.is-playing .el-half,.eluma-logo.is-playing .el-icon,.eluma-logo.is-playing .el-ltr{animation:none!important}}
`;

let logoInjected = false;
function injectLogoCSS() {
  if (logoInjected || typeof document === 'undefined') return;
  logoInjected = true;
  const s = document.createElement('style');
  s.id = 'eluma-logo-css';
  s.textContent = LOGO_CSS;
  document.head.appendChild(s);
}

function letterGeom(F) {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '700 ' + F + 'px Unbounded';
    ctx.fontKerning = 'normal';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (-0.02 * F) + 'px';
    const lefts = [];
    for (let i = 0; i < 5; i++) lefts.push(ctx.measureText('eluma'.slice(0, i)).width);
    return { lefts, total: ctx.measureText('eluma').width };
  } catch (e) {
    const l = [], step = F * 0.62;
    for (let j = 0; j < 5; j++) l.push(j * step);
    return { lefts: l, total: 5 * step };
  }
}

let logoUid = 0;
function ElumaLogo({ height = 40, theme = 'light', bolt, text, glow, autoPlay = true, className = '', style = {} }) {
  const ref = useRef(null);
  const boltC = bolt || PAL.lime;
  const textC = text || (theme === 'dark' ? PAL.paper : PAL.ink);
  const glowA = glow != null ? glow : (theme === 'dark' ? 0.4 : 0.16);
  const idRef = useRef('el' + (logoUid++));
  const id = idRef.current;

  useEffect(() => { injectLogoCSS(); }, []);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const word = el.querySelector('.el-word');
    function build() {
      const g = letterGeom(height);
      word.style.width = g.total.toFixed(1) + 'px';
      word.style.height = height + 'px';
      word.innerHTML = '';
      'eluma'.split('').forEach((c, i) => {
        const sp = document.createElement('span');
        sp.className = 'el-ltr'; sp.textContent = c;
        sp.style.left = g.lefts[i].toFixed(2) + 'px';
        word.appendChild(sp);
      });
      if (autoPlay) {
        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver((ents) => {
            ents.forEach((e) => { if (e.isIntersecting) { play(); io.disconnect(); } });
          }, { threshold: 0.6 });
          io.observe(el);
        } else play();
      }
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(build, 20));
    else build();
  }, [height, autoPlay]);

  function play() {
    const el = ref.current; if (!el) return;
    el.classList.remove('is-playing');
    el.querySelectorAll('.el-ltr').forEach((l) => {
      l.style.setProperty('--el-ld', (0.92 + Math.random() * 0.7).toFixed(2) + 's');
    });
    void el.offsetWidth;
    el.classList.add('is-playing');
  }

  const vars = {
    '--el-h': height + 'px', '--el-bolt': boltC, '--el-text': textC, '--el-glowA': glowA,
    '--el-dx': (height * 0.20).toFixed(1) + 'px', '--el-dy': (height * 0.36).toFixed(1) + 'px',
    ...style,
  };

  return (
    <span ref={ref} className={'eluma-logo ' + className} style={vars} role="img" aria-label="Eluma" onClick={play}>
      <span className="el-icon">
        <span className="el-glow" />
        <svg className="el-svg" viewBox="0 0 56 100" aria-hidden="true">
          <defs>
            <mask id={'mt' + id}><rect width="56" height="100" fill="#000" /><rect x="-14" y="-14" width="84" height="60.5" transform="rotate(-30 28 50)" fill="#fff" /></mask>
            <mask id={'mb' + id}><rect width="56" height="100" fill="#000" /><rect x="-14" y="53.5" width="84" height="74" transform="rotate(-30 28 50)" fill="#fff" /></mask>
          </defs>
          <g className="el-half top"><path d={BOLT} fill={boltC} mask={`url(#mt${id})`} /></g>
          <g className="el-half bot"><path d={BOLT} fill={boltC} mask={`url(#mb${id})`} /></g>
        </svg>
      </span>
      <span className="el-word" />
    </span>
  );
}


/* ------------------------------------------------------------------
 * Eluma — intern oversikt: se innkomne leads og tildel dem en montør.
 * Snakker med /api/leads (GET liste + partnere, PATCH montør/status).
 * Beskyttet med en delt kode (env ADMIN_TOKEN på serveren).
 * Monter på en egen rute, f.eks. /admin, i ruteren din.
 * ------------------------------------------------------------------ */

// Test-bypass vises overalt UNNTATT på produksjonsdomenet eluma.no.
const VIS_TEST_BYPASS = typeof window !== "undefined" && !/(^|\.)eluma\.no$/.test(window.location.hostname);
// Forbruk-fanen er skjult til launch: et rent kostnadspanel ankrer på pris i isolasjon (anti-premium).
// Kommer tilbake som "Forbruk & resultat" (kostnad vs. vunne jobber = ROI) når C3-utfallsdata flyter.
// Sett true for å vise den igjen (render-grenen + henting står klar under).
const VIS_FORBRUK = false;

const KOMMUNER = [
  "Arendal", "Birkenes", "Bygland", "Bykle", "Evje og Hornnes", "Farsund",
  "Flekkefjord", "Froland", "Gjerstad", "Grimstad", "Hægebostad", "Iveland",
  "Kristiansand", "Kvinesdal", "Lillesand", "Lindesnes", "Lyngdal", "Risør",
  "Sirdal", "Tvedestrand", "Valle", "Vegårshei", "Vennesla", "Åmli", "Åseral",
];
const STOR = ["Kristiansand", "Arendal"];
const MIDDELS = ["Grimstad", "Lillesand", "Lindesnes", "Vennesla"];
const enerettPris = (k) => (STOR.includes(k) ? 990 : MIDDELS.includes(k) ? 590 : 290);

const FAG_NAVN = { solceller: "Solceller", elbillader: "Elbillader", batteri: "Batteri", smarthus: "Smarthus", elektriker: "Elektriker" };
const STATUS_TEKST = { tildelt: "Ny", akseptert: "Du tok dette", avslatt: "Du takket nei", kontaktet: "Kontaktet", vunnet: "Vunnet", tapt: "Tapt", ny: "Ny" };
const parseFag = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const nok = (n) => Number(n || 0).toLocaleString("nb-NO") + " kr";
const telLenke = (m) => "tel:" + String(m || "").replace(/\s/g, "");

const DEMO_PARTNER = { firma: "Demo Elektro AS", orgnr: "999 888 777", navn: "Ola Demo", mobil: "400 00 000", epost: "ola@demoelektro.no", fag: "elbillader, elektriker", dekning: ["Kristiansand", "Lillesand"], status: "interessert" };
const DEMO_LEADS = [
  { id: "d1", opprettet: new Date().toISOString(), tjeneste: "elbillader", omfang: null, kommune: "Kristiansand", navn: "Kari Demo", mobil: "400 00 001", adresse: "Eksempelveien 1", beskrivelse: "Ønsker hjemmelader i garasjen.", tidshorisont: "Så snart som mulig", intensjon: "varm", leadverdi: 450, status: "tildelt" },
  { id: "d2", opprettet: new Date(Date.now() - 9e7).toISOString(), tjeneste: "elektriker", omfang: "Større jobb", kommune: "Lillesand", navn: "Per Demo", mobil: "400 00 002", adresse: "Testgata 4", beskrivelse: "Trenger nytt sikringsskap.", tidshorisont: "Innen en måned", intensjon: "lunken", leadverdi: 450, status: "akseptert" },
];
const DEMO_ABO = {
  dekning: ["Kristiansand", "Lillesand"], fag: "elbillader, elektriker",
  enerett: [{ fag: "elbillader", kommune: "Kristiansand", helkommune: false }],
  foresporsler: [{ id: "f1", fag: "elektriker", kommune: "Lillesand", helkommune: false, status: "forespurt" }],
  opptatt: [{ fag: "solceller", kommune: "Kristiansand" }],
};
const DEMO_FORBRUK = { maaned: "juni 2026", antallTotalt: 2, antallTatt: 1, antallNye: 1, antallAvslatt: 0, leadKostnad: 450, enerettMnd: 990, total: 1440 };

export default function Portal() {
  const [modus, setModus] = useState("laster"); // laster | ut | sendt | inne
  const [partner, setPartner] = useState(null);
  const [epost, setEpost] = useState("");
  const [feil, setFeil] = useState("");
  const [info, setInfo] = useState("");
  const [sender, setSender] = useState(false);
  const [fane, setFane] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [lasterLeads, setLasterLeads] = useState(false);
  const [demo, setDemo] = useState(false);
  const [abo, setAbo] = useState(null);
  const [aboLaster, setAboLaster] = useState(false);
  const [reqKommune, setReqKommune] = useState("");
  const [reqFag, setReqFag] = useState("");
  const [reqHel, setReqHel] = useState(false);
  const [forbruk, setForbruk] = useState(null);
  const [forbrukLaster, setForbrukLaster] = useState(false);
  const [redigerer, setRedigerer] = useState(false);
  const [formNavn, setFormNavn] = useState("");
  const [formMobil, setFormMobil] = useState("");
  const [lagrer, setLagrer] = useState(false);

  useEffect(() => { sjekk(); }, []);

  const sjekk = async () => {
    try {
      const r = await fetch("/api/portal/meg", { credentials: "include" });
      if (r.ok) { const d = await r.json(); setPartner(d.partner); setModus("inne"); hentLeads(); return; }
      setModus("ut");
    } catch { setModus("ut"); }
  };

  const hentLeads = async () => {
    if (demo) return;
    setLasterLeads(true);
    try {
      const r = await fetch("/api/portal/leads", { credentials: "include" });
      if (r.ok) { const d = await r.json(); setLeads(d.leads || []); }
    } catch {} finally { setLasterLeads(false); }
  };

  const hentAbonnement = async () => {
    if (demo) return;
    setAboLaster(true);
    try { const r = await fetch("/api/portal/abonnement", { credentials: "include" }); if (r.ok) setAbo(await r.json()); }
    catch {} finally { setAboLaster(false); }
  };

  const hentForbruk = async () => {
    if (demo) return;
    setForbrukLaster(true);
    try { const r = await fetch("/api/portal/forbruk", { credentials: "include" }); if (r.ok) setForbruk(await r.json()); }
    catch {} finally { setForbrukLaster(false); }
  };

  const velgFane = (f) => { setFane(f); setFeil(""); setInfo(""); setRedigerer(false); if (f === "abonnement" && !abo && !demo) hentAbonnement(); if (f === "forbruk" && !forbruk && !demo) hentForbruk(); };

  // Profil: kun navn + mobil er redigerbare (hvitliste, speiler backend). Resten låst.
  const startRediger = () => { setFormNavn(partner?.navn || ""); setFormMobil(partner?.mobil || ""); setFeil(""); setInfo(""); setRedigerer(true); };
  const lagreProfil = async () => {
    const navn = formNavn.trim(), mobil = formMobil.trim();
    if (!navn) { setFeil("Navn kan ikke være tomt."); return; }
    if (!/^\+?\d[\d\s]{6,}$/.test(mobil)) { setFeil("Skriv et gyldig mobilnummer."); return; }
    setLagrer(true); setFeil("");
    if (demo) { setPartner((p) => ({ ...p, navn, mobil })); setRedigerer(false); setLagrer(false); setInfo("Profilen er oppdatert."); return; }
    try {
      const r = await fetch("/api/portal/meg", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ navn, mobil }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFeil(d.feil || "Kunne ikke lagre."); return; }
      if (d.partner) setPartner(d.partner);
      setRedigerer(false); setInfo("Profilen er oppdatert.");
    } catch { setFeil("Nettverksfeil. Prøv igjen."); }
    finally { setLagrer(false); }
  };

  const svarLead = async (l, svar) => {
    setFeil(""); setInfo("");
    const nyStatus = svar === "ja" ? "akseptert" : "avslatt";
    setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: nyStatus } : x))); // optimistisk
    if (demo) { setInfo(svar === "ja" ? "Demo: leadet er tatt." : "Demo: takket nei."); return; }
    try {
      const r = await fetch("/api/portal/leads", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: l.id, svar }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFeil(d.feil || "Noe gikk galt — last inn på nytt."); hentLeads(); return; }
      setInfo(svar === "ja" ? "Du har tatt leadet — ta kontakt med kunden så snart du kan." : "Takket nei. Vi sender det videre til en annen.");
    } catch { setFeil("Nettverksfeil. Prøv igjen."); hentLeads(); }
  };

  const sendForesporsel = async () => {
    if (!reqKommune || (!reqHel && !reqFag)) return;
    setFeil(""); setInfo("");
    if (demo) { setInfo("Demo: forespørsel sendt."); return; }
    try {
      const r = await fetch("/api/portal/abonnement", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kommune: reqKommune, fag: reqHel ? null : reqFag, helkommune: reqHel }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFeil(d.feil || "Kunne ikke sende forespørsel."); return; }
      setInfo("Forespørsel sendt — vi bekrefter så snart vi kan."); setReqKommune(""); setReqFag(""); setReqHel(false);
      hentAbonnement();
    } catch { setFeil("Nettverksfeil. Prøv igjen."); }
  };

  const trekkForesporsel = async (f) => {
    setFeil(""); setInfo("");
    if (demo) { setAbo((a) => ({ ...a, foresporsler: (a.foresporsler || []).filter((x) => x.id !== f.id) })); return; }
    try {
      const r = await fetch("/api/portal/abonnement", {
        method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: f.id }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setFeil(d.feil || "Kunne ikke trekke tilbake."); return; }
      hentAbonnement();
    } catch { setFeil("Nettverksfeil. Prøv igjen."); }
  };

  const vekslDekning = async (k) => {
    setFeil(""); setInfo("");
    const har = (abo?.dekning || []).includes(k);
    const eKom = new Set((abo?.enerett || []).map((e) => e.kommune));
    if (har && eKom.has(k)) { setFeil(`Du har førsterett i ${k} — fjern førsteretten først.`); return; }
    const ny = har ? abo.dekning.filter((x) => x !== k) : [...(abo.dekning || []), k];
    setAbo((a) => ({ ...a, dekning: ny })); // optimistisk
    if (demo) return;
    try {
      const r = await fetch("/api/portal/abonnement", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dekning: ny }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setFeil(d.feil || "Kunne ikke lagre dekning."); hentAbonnement(); }
    } catch { setFeil("Nettverksfeil. Prøv igjen."); hentAbonnement(); }
  };

  const sendLenke = async () => {
    setFeil(""); setSender(true);
    try {
      const r = await fetch("/api/portal/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epost }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFeil(d.feil || "Noe gikk galt. Prøv igjen."); return; }
      setModus("sendt");
    } catch { setFeil("Nettverksfeil. Prøv igjen."); }
    finally { setSender(false); }
  };

  const loggUt = async () => {
    try { await fetch("/api/portal/logg-ut", { method: "POST", credentials: "include" }); } catch {}
    setPartner(null); setEpost(""); setLeads([]); setAbo(null); setForbruk(null); setDemo(false); setFane("leads"); setModus("ut");
  };

  const bypass = () => { setDemo(true); setPartner(DEMO_PARTNER); setLeads(DEMO_LEADS); setAbo(DEMO_ABO); setForbruk(DEMO_FORBRUK); setFeil(""); setModus("inne"); };

  const opptattNa = !!reqKommune && (abo?.opptatt || []).some((o) => o.kommune === reqKommune && (reqHel || o.fag === reqFag));

  /* ---- Laster (sjekker sesjon) ---- */
  if (modus === "laster") {
    return (
      <div className="pt-root pt-port"><style>{css}</style>
        <div className="pt-laster"><ElumaLogo height={30} theme="dark" /></div>
      </div>
    );
  }

  /* ---- Innlogget ---- */
  if (modus === "inne" && partner) {
    const fag = parseFag(partner.fag);
    const dekning = partner.dekning || [];
    const aktiveNokler = new Set((abo?.enerett || []).map((e) => (e.fag || "") + "|" + e.kommune));
    const ventende = (abo?.foresporsler || []).filter((f) => !aktiveNokler.has((f.fag || "") + "|" + f.kommune));
    return (
      <div className="pt-root">
        <style>{css}</style>
        <div className="pt-topbar">
          <header className="pt-topp">
            <div className="pt-merke"><ElumaLogo height={18} theme="dark" /><span>· min side</span></div>
            <button className="pt-ut" onClick={loggUt}>Logg ut</button>
          </header>
          <nav className="pt-faner">
            <button className={"pt-fane" + (fane === "leads" ? " valgt" : "")} onClick={() => velgFane("leads")}>Mine leads</button>
            <button className={"pt-fane" + (fane === "abonnement" ? " valgt" : "")} onClick={() => velgFane("abonnement")}>Abonnement & områder</button>
            {VIS_FORBRUK && <button className={"pt-fane" + (fane === "forbruk" ? " valgt" : "")} onClick={() => velgFane("forbruk")}>Forbruk</button>}
            <button className={"pt-fane" + (fane === "profil" ? " valgt" : "")} onClick={() => velgFane("profil")}>Min profil</button>
          </nav>
        </div>

        <main className="pt-main">
          {fane === "leads" ? (
            <>
              <div className="pt-rad-topp">
                <h1 className="pt-hei">Mine leads</h1>
                {!demo && <button className="pt-mini" onClick={hentLeads} disabled={lasterLeads}>{lasterLeads ? "…" : "Oppdater"}</button>}
              </div>
              {info && <p className="pt-info">{info}</p>}
              {feil && <p className="pt-feil pt-feil-rad">{feil}</p>}
              {leads.length === 0 ? (
                <div className="pt-tom">
                  <p className="pt-tom-tit">Ingen leads ennå</p>
                  <p className="pt-tom-und">Når Eluma tildeler deg en henvendelse, dukker den opp her — og du får varsel på e-post.</p>
                </div>
              ) : (
                <ul className="pt-leads">
                  {leads.map((l) => (
                    <li key={l.id} className={"pt-lead" + (l.status === "avslatt" ? " avslatt" : "")}>
                      <div className="pt-lead-topp">
                        <span className="pt-tjeneste">{FAG_NAVN[l.tjeneste] || l.tjeneste}{l.omfang ? <span className="pt-omf"> · {l.omfang}</span> : null}</span>
                        <span className={"pt-intens pt-" + l.intensjon}>{l.intensjon}</span>
                      </div>
                      <p className="pt-navn">{l.navn}</p>
                      <p className="pt-meta">
                        <a href={telLenke(l.mobil)} className="pt-tlf">{l.mobil}</a>
                        {l.adresse ? <span> · {l.adresse}</span> : null}
                        {l.kommune ? <span> · {l.kommune}</span> : null}
                      </p>
                      {l.beskrivelse ? <p className="pt-besk">{l.beskrivelse}</p> : null}
                      <div className="pt-lead-bunn">
                        <span className="pt-verdi">{nok(l.leadverdi)}</span>
                        {l.status === "tildelt" ? (
                          <span className="pt-knapper">
                            <button className="pt-ta" onClick={() => svarLead(l, "ja")}>Ta leadet</button>
                            <button className="pt-nei" onClick={() => svarLead(l, "nei")}>Takk nei</button>
                          </span>
                        ) : (
                          <span className={"pt-status pt-st-" + l.status}>{STATUS_TEKST[l.status] || l.status}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="pt-fot">Et lead er <strong>ditt alene</strong> — ingen andre fagfolk har fått det. Holder det ikke mål, takk nei innen 48 timer, så krediterer vi det.</p>
            </>
          ) : fane === "abonnement" ? (
            <>
              <h1 className="pt-hei">Abonnement & områder</h1>
              <p className="pt-und">Be om førsterett i kommunene der du vil stå først i køen. Vi bekrefter forespørselen — da får du hvert nytt lead i faget ditt der først, og beholder forspranget ved å svare raskt.</p>
              {info && <p className="pt-info">{info}</p>}
              {feil && <p className="pt-feil pt-feil-rad">{feil}</p>}

              {!abo ? (
                <div className="pt-tom"><p className="pt-tom-und">{aboLaster ? "Laster …" : "Ingen data ennå."}</p></div>
              ) : (
                <>
                  <div className="pt-kort">
                    <p className="pt-merk">Dekningsområde</p>
                    <p className="pt-dek-hjelp">Velg kommunene du vil få leads i. Kommuner du har førsterett i er låst.</p>
                    <div className="pt-kommuner">
                      {KOMMUNER.map((k) => {
                        const valgt = (abo.dekning || []).includes(k);
                        const laast = (abo.enerett || []).some((e) => e.kommune === k);
                        return (
                          <button key={k} type="button" disabled={laast}
                            className={"pt-kchip" + (valgt ? " valgt" : "") + (laast ? " laast" : "")}
                            title={laast ? "Du har førsterett her — kan ikke fjernes" : ""}
                            onClick={() => vekslDekning(k)}>
                            {k}{laast ? " ✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pt-kort">
                    <p className="pt-merk">Dine områder med førsterett</p>
                    {abo.enerett.length === 0 ? (
                      <p className="pt-tom-und">Du har ingen førsterett ennå. Be om din første nedenfor.</p>
                    ) : (
                      <ul className="pt-omr">
                        {abo.enerett.map((e, i) => (
                          <li key={i}>
                            <span className="pt-omr-navn">{e.helkommune ? "Hele kommunen" : (FAG_NAVN[e.fag] || e.fag)} · {e.kommune}</span>
                            <span className="pt-omr-pris">{nok(enerettPris(e.kommune))}/mnd</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {ventende.length > 0 && (
                    <div className="pt-kort">
                      <p className="pt-merk">Under behandling</p>
                      <ul className="pt-omr">
                        {ventende.map((f) => (
                          <li key={f.id}>
                            <span className="pt-omr-navn">{f.helkommune ? "Hele kommunen" : (FAG_NAVN[f.fag] || f.fag)} · {f.kommune}<span className="pt-venter"> · venter på godkjenning</span></span>
                            <button className="pt-trekk" onClick={() => trekkForesporsel(f)}>Trekk tilbake</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-kort">
                    <p className="pt-merk">Be om førsterett</p>
                    <div className="pt-skjema">
                      <label className="pt-felt"><span>Kommune</span>
                        <select value={reqKommune} onChange={(e) => setReqKommune(e.target.value)}>
                          <option value="">Velg kommune</option>
                          {KOMMUNER.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </label>
                      <label className="pt-felt"><span>Fag</span>
                        <select value={reqFag} onChange={(e) => setReqFag(e.target.value)} disabled={reqHel}>
                          <option value="">Velg fag</option>
                          {fag.map((f) => <option key={f} value={f}>{FAG_NAVN[f] || f}</option>)}
                        </select>
                      </label>
                      <label className="pt-sjekk"><input type="checkbox" checked={reqHel} onChange={(e) => setReqHel(e.target.checked)} /> Lås hele kommunen (alle mine fag)</label>
                      {reqKommune && (opptattNa
                        ? <p className="pt-opptatt">Opptatt i {reqKommune} akkurat nå — ikke ledig.</p>
                        : <p className="pt-pris-prev">{nok(enerettPris(reqKommune))}/mnd{reqHel ? " · for alle dine fag i kommunen" : ""}</p>)}
                      <button className="pt-knapp-lys" onClick={sendForesporsel} disabled={!reqKommune || (!reqHel && !reqFag) || opptattNa}>Be om førsterett</button>
                    </div>
                  </div>
                  <p className="pt-fot">Prisene er veiledende og avtales endelig med oss. Førsterett er uten binding — du kan si den opp når som helst.</p>
                </>
              )}
            </>
          ) : fane === "forbruk" ? (
            <>
              <h1 className="pt-hei">Forbruk</h1>
              <p className="pt-und">Denne måneden{forbruk ? ` · ${forbruk.maaned}` : ""}.</p>
              {!forbruk ? (
                <div className="pt-tom"><p className="pt-tom-und">{forbrukLaster ? "Laster …" : "Ingen data ennå."}</p></div>
              ) : (
                <>
                  <div className="pt-kort pt-fbtotal">
                    <span className="pt-fb-label">Sum denne måneden</span>
                    <span className="pt-fb-sum">{nok(forbruk.total)}</span>
                  </div>
                  <div className="pt-kort">
                    <ul className="pt-omr">
                      <li><span className="pt-omr-navn">Leads tatt ({forbruk.antallTatt})</span><span className="pt-omr-pris">{nok(forbruk.leadKostnad)}</span></li>
                      <li><span className="pt-omr-navn">Førsterett</span><span className="pt-omr-pris">{nok(forbruk.enerettMnd)}/mnd</span></li>
                    </ul>
                  </div>
                  <p className="pt-fot">{forbruk.antallNye} venter på svar · {forbruk.antallAvslatt} avslått (ikke belastet). Tallene er veiledende — endelig faktura sendes månedlig.</p>
                </>
              )}
            </>
          ) : (
            <>
              <div className="pt-rad-topp">
                <h1 className="pt-hei">Min profil</h1>
                {!redigerer
                  ? <button className="pt-mini" onClick={startRediger}>Rediger</button>
                  : <button className="pt-mini" onClick={() => { setRedigerer(false); setFeil(""); }}>Avbryt</button>}
              </div>
              <p className="pt-und">Slik er firmaet ditt registrert hos Eluma.</p>
              {feil && <p className="pt-feil pt-feil-rad">{feil}</p>}
              {info && <p className="pt-info">{info}</p>}
              <div className="pt-kort">
                <dl className="pt-dl">
                  <div><dt>Firma</dt><dd>{partner.firma || "—"}</dd></div>
                  {partner.orgnr ? <div><dt>Org.nr</dt><dd>{partner.orgnr}</dd></div> : null}
                  <div><dt>Kontaktperson</dt><dd>{redigerer
                    ? <input className="pt-inline-input" value={formNavn} onChange={(e) => setFormNavn(e.target.value)} />
                    : (partner.navn || "—")}</dd></div>
                  <div><dt>Mobil</dt><dd>{redigerer
                    ? <input className="pt-inline-input" inputMode="tel" value={formMobil} onChange={(e) => setFormMobil(e.target.value)} />
                    : (partner.mobil || "—")}</dd></div>
                  <div><dt>E-post</dt><dd>{partner.epost || "—"}{redigerer ? <span className="pt-laas-note"> · endre? ta kontakt</span> : null}</dd></div>
                  <div><dt>Fag</dt><dd>{fag.map((f) => FAG_NAVN[f] || f).join(" · ") || "—"}</dd></div>
                  <div><dt>Dekning</dt><dd>{dekning.length ? dekning.join(", ") : "Ingen kommuner valgt ennå"}</dd></div>
                  <div><dt>Status</dt><dd>{partner.status ? partner.status.charAt(0).toUpperCase() + partner.status.slice(1) : "—"}</dd></div>
                </dl>
              </div>
              {redigerer
                ? <button className="pt-knapp-lys" onClick={lagreProfil} disabled={lagrer}>{lagrer ? "Lagrer …" : "Lagre endringer"}</button>
                : <p className="pt-fot">Fag og dekning endrer du under <strong>Abonnement &amp; områder</strong>. Firma, org.nr og e-post er låst — noe feil? Ta kontakt, så retter vi det.</p>}
            </>
          )}
        </main>
      </div>
    );
  }

  /* ---- Innlogging (ut / sendt) ---- */
  return (
    <div className="pt-root pt-port">
      <style>{css}</style>
      <div className="pt-login">
        <div className="pt-merke"><ElumaLogo height={26} theme="dark" /></div>
        {modus === "sendt" ? (
          <>
            <h1 className="pt-login-tit">Sjekk e-posten din</h1>
            <p className="pt-login-und">Vi har sendt en innloggingslenke til <strong>{epost}</strong>. Den varer i 30 minutter.</p>
            <button className="pt-lenke-knapp" onClick={() => setModus("ut")}>Bruk en annen e-post</button>
          </>
        ) : (
          <>
            <h1 className="pt-login-tit">Partnerportal</h1>
            <p className="pt-login-und">Skriv inn e-posten din, så sender vi deg en innloggingslenke.</p>
            <input
              className="pt-input" type="email" inputMode="email" placeholder="din@epost.no" value={epost}
              onChange={(e) => setEpost(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && epost && !sender && sendLenke()}
              autoFocus
            />
            <button className="pt-knapp" onClick={sendLenke} disabled={!epost || sender}>
              {sender ? "Sender …" : "Send innloggingslenke"}
            </button>
            {feil && <p className="pt-feil">{feil}</p>}
            {VIS_TEST_BYPASS && (
              <button className="pt-bypass" onClick={bypass}>Hopp over innlogging (kun test · demo)</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Unbounded:wght@600;700&display=swap');
:root{--ink:#191C19;--paper:#F4F3EE;--lime:#C6F24E;--dark:#0F120D;--sub:#6E726A;--line:#E4E2DA;}
*{box-sizing:border-box;}
.pt-root{min-height:100vh;background:var(--paper);color:var(--ink);font-family:'Hanken Grotesk',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.pt-merke{display:flex;align-items:center;justify-content:center;gap:.5em;font-family:'Unbounded','Hanken Grotesk',sans-serif;font-weight:700;letter-spacing:-.02em;margin:0;}
.pt-merke span{color:var(--sub);font-weight:600;}

/* Laster + innlogging */
.pt-port{display:flex;align-items:center;justify-content:center;padding:24px;background:var(--dark);}
.pt-laster{opacity:.9;}
.pt-login{width:100%;max-width:380px;background:#15180F;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:34px 30px;text-align:center;}
.pt-login .pt-merke{color:var(--paper);font-size:26px;}
.pt-login-tit{font-family:'Unbounded',sans-serif;font-size:20px;margin:18px 0 6px;color:var(--paper);}
.pt-login-und{font-size:14px;color:#9AA093;margin:0 0 22px;line-height:1.55;}
.pt-login-und strong{color:var(--paper);font-weight:600;}
.pt-input{width:100%;padding:13px 15px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:var(--paper);font-size:15px;outline:none;}
.pt-input:focus-visible{border-color:var(--lime);box-shadow:0 0 0 3px rgba(198,242,78,.25);}
.pt-knapp{width:100%;margin-top:12px;padding:13px;border:none;border-radius:12px;background:var(--lime);color:var(--ink);font-weight:700;font-size:15px;cursor:pointer;transition:filter .15s;}
.pt-knapp:hover:not(:disabled){filter:brightness(1.05);}
.pt-knapp:disabled{opacity:.5;cursor:default;}
.pt-lenke-knapp{margin-top:6px;background:transparent;border:none;color:#9AA093;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:underline;}
.pt-lenke-knapp:hover{color:var(--lime);}
.pt-feil{color:#F0A58F;font-size:13.5px;margin:12px 0 0;}
.pt-bypass{width:100%;margin-top:10px;padding:11px;border:1px dashed rgba(255,255,255,.25);border-radius:12px;background:transparent;color:#9AA093;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;}
.pt-bypass:hover{border-color:rgba(198,242,78,.5);color:var(--lime);}

/* Topbar + faner */
.pt-topbar{position:sticky;top:0;z-index:6;}
.pt-topp{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;background:var(--dark);color:var(--paper);}
.pt-topp .pt-merke{font-size:18px;color:var(--paper);}
.pt-ut{padding:8px 16px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:transparent;color:var(--paper);font-size:13px;font-weight:600;cursor:pointer;}
.pt-ut:hover{border-color:var(--lime);color:var(--lime);}
.pt-faner{display:flex;gap:8px;padding:11px 18px;background:var(--dark);border-top:1px solid rgba(255,255,255,.07);overflow-x:auto;}
.pt-fane{flex:0 0 auto;padding:8px 16px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:transparent;color:#C9CEC2;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.pt-fane:hover{border-color:var(--lime);color:var(--lime);}
.pt-fane.valgt{background:var(--lime);border-color:var(--lime);color:var(--ink);}

/* Innhold */
.pt-main{max-width:640px;margin:0 auto;padding:24px 18px 80px;}
.pt-rad-topp{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;}
.pt-hei{font-family:'Unbounded',sans-serif;font-size:22px;letter-spacing:-.02em;margin:0;}
.pt-und{color:var(--sub);font-size:14.5px;margin:0 0 20px;line-height:1.55;}
.pt-mini{padding:7px 14px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font-size:13px;font-weight:600;cursor:pointer;}
.pt-mini:hover:not(:disabled){border-color:var(--ink);}
.pt-mini:disabled{opacity:.5;cursor:default;}
.pt-info{color:#2F5E16;background:#EAF7D6;border:1px solid #CDE8A6;border-radius:10px;padding:9px 13px;font-size:13.5px;margin:12px 0;}
.pt-feil-rad{background:#FBEAE5;border:1px solid #F0C9BE;border-radius:10px;padding:9px 13px;color:#A8341F;margin:12px 0;}

/* Tom */
.pt-tom{text-align:center;padding:50px 22px;background:#fff;border:1px dashed var(--line);border-radius:16px;margin-top:14px;}
.pt-tom-tit{font-family:'Unbounded',sans-serif;font-size:16px;margin:0 0 6px;}
.pt-tom-und{font-size:14px;color:var(--sub);margin:0;line-height:1.55;}

/* Lead-kort */
.pt-leads{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:12px;}
.pt-lead{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 17px;}
.pt-lead.avslatt{opacity:.62;}
.pt-lead-topp{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;}
.pt-tjeneste{font-family:'Unbounded',sans-serif;font-weight:600;font-size:14px;}
.pt-omf{color:var(--sub);font-weight:500;}
.pt-intens{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 10px;border-radius:999px;}
.pt-varm{background:var(--lime);color:var(--ink);}
.pt-lunken{background:#FBE7B8;color:#7A5A12;}
.pt-kald{background:#E7E6E0;color:#6E726A;}
.pt-navn{font-size:16px;font-weight:600;margin:0 0 3px;}
.pt-meta{font-size:13px;color:var(--sub);margin:0;line-height:1.5;}
.pt-tlf{color:var(--ink);font-weight:600;text-decoration:none;border-bottom:1px solid var(--line);}
.pt-tlf:hover{border-color:var(--ink);}
.pt-besk{font-size:13.5px;color:#41463E;margin:8px 0 0;line-height:1.5;}
.pt-lead-bunn{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:13px;border-top:1px solid var(--line);flex-wrap:wrap;}
.pt-verdi{font-family:'Unbounded',sans-serif;font-weight:600;font-size:16px;letter-spacing:-.02em;}
.pt-knapper{display:flex;gap:8px;}
.pt-ta{font-family:inherit;font-size:13.5px;font-weight:700;color:var(--ink);background:var(--lime);border:none;border-radius:10px;padding:9px 18px;cursor:pointer;}
.pt-ta:hover{filter:brightness(1.05);}
.pt-nei{font-family:inherit;font-size:13.5px;font-weight:600;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 16px;cursor:pointer;}
.pt-nei:hover{border-color:var(--ink);}
.pt-status{font-size:12.5px;font-weight:700;padding:5px 12px;border-radius:999px;background:#EFEEE8;color:var(--sub);}
.pt-st-akseptert{background:#EAF7D6;color:#2F5E16;}
.pt-st-vunnet{background:#EAF7D6;color:#2F5E16;}
.pt-st-avslatt{background:#F1F0EA;color:#8A8E83;}
.pt-st-tapt{background:#F1F0EA;color:#8A8E83;}
.pt-fot{font-size:12.5px;color:var(--sub);line-height:1.6;margin:18px 2px 0;}
.pt-fot strong{color:var(--ink);}

/* Abonnement & områder */
.pt-omr{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
.pt-omr li{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14.5px;}
.pt-omr-navn{font-weight:600;}
.pt-venter{font-weight:500;color:#9A7A1E;}
.pt-omr-pris{font-family:'Unbounded',sans-serif;font-weight:600;font-size:14px;white-space:nowrap;}
.pt-trekk{font-family:inherit;font-size:12.5px;font-weight:600;color:var(--sub);background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 12px;cursor:pointer;white-space:nowrap;}
.pt-trekk:hover{border-color:#A8341F;color:#A8341F;}
.pt-skjema{display:flex;flex-direction:column;gap:12px;}
.pt-felt{display:flex;flex-direction:column;gap:5px;}
.pt-felt span{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--sub);}
.pt-felt select{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);font-size:14.5px;font-family:inherit;cursor:pointer;outline:none;}
.pt-felt select:focus-visible{border-color:var(--lime);box-shadow:0 0 0 3px rgba(198,242,78,.25);}
.pt-felt select:disabled{opacity:.5;cursor:default;}
.pt-inline-input{font:inherit;font-size:15px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);width:100%;max-width:240px;outline:none;}
.pt-inline-input:focus-visible{border-color:var(--lime);box-shadow:0 0 0 3px rgba(198,242,78,.2);}
.pt-laas-note{color:var(--sub);font-size:12.5px;}
.pt-sjekk{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ink);cursor:pointer;}
.pt-sjekk input{width:16px;height:16px;accent-color:#5d7a1f;}
.pt-pris-prev{font-size:14px;color:var(--ink);font-weight:600;margin:0;}
.pt-opptatt{font-size:13.5px;color:#A8341F;margin:0;}
.pt-knapp-lys{margin-top:4px;padding:12px;border:none;border-radius:10px;background:var(--ink);color:var(--paper);font-family:inherit;font-weight:700;font-size:14.5px;cursor:pointer;}
.pt-knapp-lys:hover:not(:disabled){filter:brightness(1.15);}
.pt-knapp-lys:disabled{opacity:.45;cursor:default;}

/* Profil */
.pt-kort{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin-bottom:14px;}
.pt-merk{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--sub);margin:0 0 12px;}
.pt-dl{margin:0;display:flex;flex-direction:column;gap:11px;}
.pt-dl > div{display:flex;justify-content:space-between;gap:16px;font-size:14.5px;}
.pt-dl dt{color:var(--sub);margin:0;}
.pt-dl dd{margin:0;font-weight:600;text-align:right;}
.pt-kommer ul{margin:0;padding-left:18px;color:var(--sub);font-size:14px;line-height:1.7;}
.pt-dek-hjelp{font-size:13px;color:var(--sub);margin:0 0 12px;line-height:1.5;}
.pt-kommuner{display:flex;flex-wrap:wrap;gap:6px;}
.pt-kchip{font-family:inherit;font-size:12.5px;font-weight:500;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 11px;cursor:pointer;transition:all .12s;}
.pt-kchip:hover:not(:disabled){border-color:var(--ink);}
.pt-kchip.valgt{background:var(--ink);color:var(--paper);border-color:var(--ink);}
.pt-kchip.laast{background:rgba(198,242,78,.18);border-color:var(--lime);color:var(--ink);cursor:not-allowed;font-weight:600;}
.pt-fbtotal{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--ink);border-color:var(--ink);}
.pt-fb-label{color:#C9CEC2;font-size:13px;font-weight:600;}
.pt-fb-sum{font-family:'Unbounded',sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;color:var(--lime);}
@media (prefers-reduced-motion:reduce){*{transition:none!important;}}
`;
