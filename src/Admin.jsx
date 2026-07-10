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

const TJENESTE_NAVN = {
  solceller: "Solceller", elbillader: "Elbillader", batteri: "Batteri",
  smarthus: "Smarthus", elektriker: "Elektriker",
};

const STATUSER = [
  { v: "ny", t: "Ny" },
  { v: "tildelt", t: "Tildelt" },
  { v: "akseptert", t: "Akseptert" },
  { v: "kontaktet", t: "Kontaktet" },
  { v: "vunnet", t: "Vunnet" },
  { v: "tapt", t: "Tapt" },
  { v: "avslatt", t: "Avslått" },
];

const FILTRE = [
  { v: "alle", t: "Alle" },
  { v: "ny", t: "Nye" },
  { v: "tildelt", t: "Tildelt" },
  { v: "avslatt", t: "Avslått" },
  { v: "vunnet", t: "Vunnet" },
];

const nok = (n) => Number(n || 0).toLocaleString("nb-NO") + " kr";
const dato = (s) =>
  s ? new Date(s).toLocaleString("nb-NO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const DEMO_LEADS = [
  { id: "demo-1", opprettet: new Date().toISOString(), tjeneste: "elbillader", kommune: "Kristiansand", navn: "Kari Demo", mobil: "400 00 001", adresse: "Eksempelveien 1", beskrivelse: "Ønsker hjemmelader i garasjen.", intensjon: "varm", score: 1, leadverdi: 450, status: "ny", montor: null },
  { id: "demo-2", opprettet: new Date(Date.now() - 6e6).toISOString(), tjeneste: "solceller", kommune: "Grimstad", navn: "Per Demo", mobil: "400 00 002", adresse: "Testgata 4", beskrivelse: "Vurderer solceller på taket.", intensjon: "lunken", score: 0.55, leadverdi: 560, status: "tildelt", montor: "demo-p2", tidligere_montorer: ["demo-p1"] },
];
const DEMO_PARTNERE = [
  { id: "demo-p1", firma: "Demo Elektro AS", orgnr: "999 888 777", fag: "elbillader, elektriker", status: "interessert", dekning: ["Kristiansand", "Lillesand"] },
  { id: "demo-p2", firma: "Sol & Energi AS", orgnr: "111 222 333", fag: "solceller, batteri", status: "interessert", dekning: ["Grimstad"] },
];
const DEMO_ENERETT = [
  { id: "demo-e1", partner_id: "demo-p1", firma: "Demo Elektro AS", fag: "elbillader", kommune: "Kristiansand", helkommune: false },
];
const DEMO_FORESPORSLER = [
  { id: "demo-f1", partner_id: "demo-p2", firma: "Sol & Energi AS", fag: "solceller", kommune: "Grimstad", helkommune: false, status: "forespurt" },
];

// Test-bypass vises overalt UNNTATT på produksjonsdomenet eluma.no (PII er synlig i admin).
const VIS_TEST_BYPASS = typeof window !== "undefined" && !/(^|\.)eluma\.no$/.test(window.location.hostname);

const KOMMUNER = [
  "Arendal", "Birkenes", "Bygland", "Bykle", "Evje og Hornnes", "Farsund",
  "Flekkefjord", "Froland", "Gjerstad", "Grimstad", "Hægebostad", "Iveland",
  "Kristiansand", "Kvinesdal", "Lillesand", "Lindesnes", "Lyngdal", "Risør",
  "Sirdal", "Tvedestrand", "Valle", "Vegårshei", "Vennesla", "Åmli", "Åseral",
];

const FAG_NAVN = TJENESTE_NAVN;
const parseFag = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

export default function Admin() {
  const [kode, setKode] = useState("");
  const [aktiv, setAktiv] = useState(false);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState("");
  const [info, setInfo] = useState("");
  const [leads, setLeads] = useState([]);
  const [partnere, setPartnere] = useState([]);
  const [enerett, setEnerett] = useState([]);
  const [filter, setFilter] = useState("alle");
  const [fane, setFane] = useState("leads");
  const [foresporsler, setForesporsler] = useState([]);
  const [demo, setDemo] = useState(false);

  const hodere = () => ({ "Content-Type": "application/json", "x-eluma-token": kode });

  const last = async () => {
    if (demo) return;
    setLaster(true); setFeil("");
    try {
      const [rl, rt] = await Promise.all([
        fetch("/api/leads", { headers: hodere() }),
        fetch("/api/territorier", { headers: hodere() }),
      ]);
      if (rl.status === 401 || rt.status === 401) { setFeil("Feil kode. Prøv igjen."); setAktiv(false); return; }
      if (!rl.ok || !rt.ok) { setFeil("Kunne ikke hente data."); return; }
      const dl = await rl.json();
      const dt = await rt.json();
      setLeads(dl.leads || []);
      setPartnere(dt.partnere || []);   // territorier gir partnere med dekning
      setEnerett(dt.enerett || []);
      setForesporsler(dt.foresporsler || []);
      setAktiv(true);
    } catch { setFeil("Nettverksfeil. Prøv igjen."); }
    finally { setLaster(false); }
  };

  const bypass = () => { setDemo(true); setLeads(DEMO_LEADS); setPartnere(DEMO_PARTNERE); setEnerett(DEMO_ENERETT); setForesporsler(DEMO_FORESPORSLER); setFeil(""); setAktiv(true); };

  const oppdater = async (id, felt) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...felt } : l))); // optimistisk
    try {
      const r = await fetch("/api/leads", { method: "PATCH", headers: hodere(), body: JSON.stringify({ id, ...felt }) });
      if (!r.ok) { setFeil("Lagring feilet — last inn på nytt."); return null; }
      return await r.json().catch(() => ({}));
    } catch { setFeil("Lagring feilet — last inn på nytt."); return null; }
  };

  const settMontor = async (lead, verdi) => {
    setFeil(""); setInfo("");
    const felt = { montor: verdi || null };
    if (verdi && (lead.status === "ny" || lead.status === "avslatt")) felt.status = "tildelt";
    const svar = await oppdater(lead.id, felt);
    if (!verdi || !svar) return;
    if (svar.varslet) setInfo(`${verdi} er varslet på e-post.`);
    else setInfo(`Tildelt ${verdi}, men fant ingen e-post å varsle på — legg inn e-post på partneren.`);
  };

  const aapen = leads.filter((l) => l.status !== "vunnet" && l.status !== "tapt");
  const stats = {
    nye: leads.filter((l) => l.status === "ny").length,
    aapenVerdi: aapen.reduce((s, l) => s + (l.leadverdi || 0), 0),
    vunnetVerdi: leads.filter((l) => l.status === "vunnet").reduce((s, l) => s + (l.leadverdi || 0), 0),
  };

  const synlige = filter === "alle" ? leads : leads.filter((l) => l.status === filter);
  const enerettHolder = (l) => (l.kommune ? enerett.find((e) => e.fag === l.tjeneste && e.kommune === l.kommune) : null);



  const fjernEnerett = async (e) => {
    setFeil(""); setInfo("");
    setEnerett((prev) => prev.filter((x) => x.id !== e.id)); // optimistisk
    if (demo) return;
    const r = await fetch("/api/territorier", { method: "DELETE", headers: hodere(), body: JSON.stringify({ id: e.id }) });
    if (!r.ok) setFeil("Kunne ikke fjerne enerett — last inn på nytt.");
  };

  const fjernKommune = async (p, kommune) => {
    setFeil(""); setInfo("");
    setEnerett((prev) => prev.filter((e) => !(e.partner_id === p.id && e.kommune === kommune))); // optimistisk
    if (demo) return;
    const r = await fetch("/api/territorier", { method: "DELETE", headers: hodere(), body: JSON.stringify({ partnerId: p.id, kommune }) });
    if (!r.ok) setFeil("Kunne ikke fjerne enerett — last inn på nytt.");
  };


  const behandleForesporsel = async (f, handling) => {
    setFeil(""); setInfo("");
    if (demo) {
      setForesporsler((prev) => prev.filter((x) => x.id !== f.id));
      if (handling === "godkjenn") setEnerett((prev) => [...prev, { partner_id: f.partner_id, firma: f.firma, fag: f.fag, kommune: f.kommune, helkommune: !!f.helkommune }]);
      setInfo(handling === "godkjenn" ? `${f.firma} fikk enerett i ${f.kommune} (demo).` : "Avslått (demo).");
      return;
    }
    try {
      const r = await fetch("/api/territorier", { method: "POST", headers: hodere(), body: JSON.stringify({ foresporselId: f.id, handling }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFeil(d.feil || "Kunne ikke behandle forespørselen."); return; }
      setInfo(handling === "godkjenn" ? `${f.firma} har nå enerett i ${f.kommune}.` : `Forespørselen fra ${f.firma} er avslått.`);
      last();
    } catch { setFeil("Nettverksfeil. Prøv igjen."); }
  };

  /* ---- Innlogging ---- */
  if (!aktiv) {
    return (
      <div className="ad-root ad-port">
        <style>{css}</style>
        <div className="ad-login">
          <div className="ad-merke"><ElumaLogo height={26} theme="dark" /></div>
          <h1 className="ad-login-tit">Intern oversikt</h1>
          <p className="ad-login-und">Skriv inn admin-koden.</p>
          <input
            className="ad-input" type="password" placeholder="Admin-kode" value={kode}
            onChange={(e) => setKode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && kode && last()}
            autoFocus
          />
          <button className="ad-knapp" onClick={last} disabled={!kode || laster}>
            {laster ? "Logger inn …" : "Logg inn"}
          </button>
          {feil && <p className="ad-feil">{feil}</p>}
          {VIS_TEST_BYPASS && (
            <button className="ad-bypass" onClick={bypass}>Hopp over innlogging (kun test · demo-data)</button>
          )}
        </div>
      </div>
    );
  }

  /* ---- Dashboard ---- */
  return (
    <div className="ad-root">
      <style>{css}</style>

      <div className="ad-topbar">
        <header className="ad-topp">
          <div className="ad-merke"><ElumaLogo height={18} theme="dark" /><span>· oversikt</span></div>
          <button className="ad-last" onClick={last} disabled={laster}>{laster ? "Oppdaterer …" : "Oppdater"}</button>
        </header>
        <nav className="ad-faner">
          <button className={"ad-fane" + (fane === "leads" ? " valgt" : "")} onClick={() => setFane("leads")}>Leads</button>
          <button className={"ad-fane" + (fane === "omrader" ? " valgt" : "")} onClick={() => setFane("omrader")}>Områder & enerett</button>
        </nav>
      </div>

      {fane === "leads" ? (
        <main className="ad-main">
        <div className="ad-stats">
          <div className="ad-stat"><span className="ad-stat-tall">{stats.nye}</span><span className="ad-stat-merk">Nye leads</span></div>
          <div className="ad-stat"><span className="ad-stat-tall">{nok(stats.aapenVerdi)}</span><span className="ad-stat-merk">Åpen verdi</span></div>
          <div className="ad-stat"><span className="ad-stat-tall ad-gronn">{nok(stats.vunnetVerdi)}</span><span className="ad-stat-merk">Vunnet</span></div>
        </div>

        <div className="ad-filtre">
          {FILTRE.map((f) => (
            <button key={f.v} className={"ad-chip" + (filter === f.v ? " valgt" : "")} onClick={() => setFilter(f.v)}>{f.t}</button>
          ))}
        </div>

        {feil && <p className="ad-feil ad-feil-rad">{feil}</p>}
        {info && <p className="ad-info ad-feil-rad">{info}</p>}

        {synlige.length === 0 ? (
          <div className="ad-tom">
            <p className="ad-tom-tit">Ingen leads her ennå</p>
            <p className="ad-tom-und">De dukker opp så snart noen sender inn skjemaet på forsiden.</p>
          </div>
        ) : (
          <ul className="ad-liste">
            {synlige.map((l) => { const holder = enerettHolder(l); return (
              <li key={l.id} className="ad-lead">
                <div className="ad-lead-topp">
                  <span className="ad-tjeneste">
                    {TJENESTE_NAVN[l.tjeneste] || l.tjeneste}
                    {l.omfang ? <span className="ad-omfang"> · {l.omfang}</span> : null}
                  </span>
                  <span className={"ad-intens ad-" + l.intensjon}>{l.intensjon}</span>
                </div>

                <div className="ad-lead-rad">
                  <div className="ad-lead-info">
                    <p className="ad-navn">{l.navn}</p>
                    <p className="ad-meta">
                      <a href={"tel:" + (l.mobil || "").replace(/\s/g, "")} className="ad-tlf">{l.mobil}</a>
                      {l.adresse ? <span> · {l.adresse}</span> : null}
                      {l.kommune ? <span className="ad-kommune"> · {l.kommune}</span> : null}
                      <span className="ad-tid"> · {dato(l.opprettet)}</span>
                      {(l.tidligere_montorer || []).length > 0 ? <span className="ad-2vurd"> · 2. vurdering</span> : null}
                    </p>
                    {l.beskrivelse ? <p className="ad-besk">{l.beskrivelse}</p> : null}
                  </div>
                  <div className="ad-verdi">
                    <span className="ad-verdi-tall">{nok(l.leadverdi)}</span>
                    <span className="ad-verdi-merk">leadverdi</span>
                  </div>
                </div>

                {holder && (l.montor === holder.partner_id
                  ? <p className="ad-enerett-ok">✓ Tildelt enerett-holder{holder.helkommune ? " (hele kommunen)" : ""}</p>
                  : <div className="ad-enerett-forslag">
                      <span>Enerett{l.kommune ? " i " + l.kommune : ""}: <strong>{holder.firma}</strong>{holder.helkommune ? " (hele kommunen)" : ""}</span>
                      <button type="button" className="ad-enerett-btn" onClick={() => settMontor(l, holder.partner_id)}>Tildel</button>
                    </div>)}

                {l.status === "avslatt" && <p className="ad-avslag">Montøren takket nei — tildel en annen.</p>}

                <div className="ad-handling">
                  <label className="ad-velg">
                    <span>Montør</span>
                    <select value={l.montor || ""} onChange={(e) => settMontor(l, e.target.value)}>
                      <option value="">— ikke tildelt —</option>
                      {partnere.map((p) => (
                        <option key={p.id} value={p.id}>{p.firma}{holder && holder.partner_id === p.id ? " ★" : ""}</option>
                      ))}
                    </select>
                  </label>
                  <label className="ad-velg">
                    <span>Status</span>
                    <select value={l.status || "ny"} onChange={(e) => oppdater(l.id, { status: e.target.value })}>
                      {STATUSER.map((s) => <option key={s.v} value={s.v}>{s.t}</option>)}
                    </select>
                  </label>
                </div>
              </li>
            ); })}
          </ul>
        )}
</main>
      ) : (
        <main className="ad-main">
        <p className="ad-hjelp">Oversikt over partnernes dekning og enerett. Dekning styrer partnerne selv i portalen; enerett gir du ved å godkjenne forespørsler. Her kan du fjerne enerett ved mislighold eller oppsigelse.</p>
        {foresporsler.length > 0 && (
          <div className="ad-foresp">
            <p className="ad-foresp-tit">Forespørsler ({foresporsler.length})</p>
            <ul className="ad-foresp-liste">
              {foresporsler.map((f) => (
                <li key={f.id} className="ad-foresp-rad">
                  <div className="ad-foresp-info">
                    <span className="ad-foresp-firma">{f.firma}</span>
                    <span className="ad-foresp-hva">ønsker {f.helkommune ? "hele kommunen" : (FAG_NAVN[f.fag] || f.fag)} · {f.kommune}</span>
                  </div>
                  <div className="ad-foresp-knapper">
                    <button type="button" className="ad-foresp-ja" onClick={() => behandleForesporsel(f, "godkjenn")}>Godkjenn</button>
                    <button type="button" className="ad-foresp-nei" onClick={() => behandleForesporsel(f, "avsla")}>Avslå</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {feil && <p className="ad-feil ad-feil-rad">{feil}</p>}
        {info && <p className="ad-info ad-feil-rad">{info}</p>}

        {partnere.length === 0 ? (
          <div className="ad-tom"><p className="ad-tom-tit">Ingen partnere ennå</p><p className="ad-tom-und">De dukker opp her når noen melder interesse på Fagfolk-siden.</p></div>
        ) : (
          <ul className="ad-liste">
            {partnere.map((p) => {
              const fagListe = parseFag(p.fag);
              const dekning = p.dekning || [];
              const mineEnerett = enerett.filter((e) => e.partner_id === p.id);
              const helKommuner = [...new Set(mineEnerett.filter((e) => e.helkommune).map((e) => e.kommune))];
              const enkelt = mineEnerett.filter((e) => !e.helkommune);
              return (
                <li key={p.id} className="ad-pcard">
                  <div className="ad-pc-topp">
                    <span className="ad-pc-firma">{p.firma || "—"}{p.orgnr ? <small className="ad-pc-org"> · {p.orgnr}</small> : null}</span>
                    <span className="ad-pc-fag">{fagListe.map((f) => FAG_NAVN[f] || f).join(" · ") || "ingen fag"}</span>
                  </div>

                  <div className="ad-pc-blokk">
                    <p className="ad-pc-merk">Dekning</p>
                    {dekning.length === 0
                      ? <p className="ad-pc-tom">Ingen kommuner ennå — partneren velger dette selv i portalen.</p>
                      : <div className="ad-tagger">{dekning.map((k) => <span key={k} className="ad-tagg">{k}</span>)}</div>}
                  </div>

                  <div className="ad-pc-blokk">
                    <p className="ad-pc-merk">Enerett</p>
                    {mineEnerett.length === 0 ? (
                      <p className="ad-pc-tom">Ingen enerett.</p>
                    ) : (
                      <ul className="ad-eier">
                        {helKommuner.map((k) => (
                          <li key={"hel-" + k}>
                            <span className="ad-eier-navn">Hele kommunen · {k}</span>
                            <button type="button" className="ad-fjern" onClick={() => fjernKommune(p, k)}>Fjern</button>
                          </li>
                        ))}
                        {enkelt.map((e) => (
                          <li key={e.id}>
                            <span className="ad-eier-navn">{FAG_NAVN[e.fag] || e.fag} · {e.kommune}</span>
                            <button type="button" className="ad-fjern" onClick={() => fjernEnerett(e)}>Fjern</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
</main>
      )}
    </div>
  );
}

const css = `
:root{--ink:#191C19;--paper:#F4F3EE;--lime:#C6F24E;--dark:#0F120D;--sub:#6E726A;--line:#E4E2DA;}
*{box-sizing:border-box;}
.ad-root{min-height:100vh;background:var(--paper);color:var(--ink);
  font-family:'Hanken Grotesk',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.ad-merke{display:flex;align-items:center;justify-content:center;gap:.5em;font-family:'Unbounded','Hanken Grotesk',sans-serif;font-weight:700;letter-spacing:-.02em;margin:0;}
.ad-merke span{color:var(--sub);font-weight:600;}

/* Innlogging */
.ad-port{display:flex;align-items:center;justify-content:center;padding:24px;background:var(--dark);}
.ad-login{width:100%;max-width:360px;background:#15180F;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:34px 30px;text-align:center;}
.ad-login .ad-merke{color:var(--paper);font-size:22px;}
.ad-login-tit{font-family:'Unbounded',sans-serif;font-size:19px;margin:18px 0 6px;color:var(--paper);}
.ad-login-und{font-size:14px;color:#9AA093;margin:0 0 22px;line-height:1.5;}
.ad-input{width:100%;padding:13px 15px;border-radius:12px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.04);color:var(--paper);font-size:15px;outline:none;}
.ad-input:focus-visible{border-color:var(--lime);box-shadow:0 0 0 3px rgba(198,242,78,.25);}
.ad-knapp{width:100%;margin-top:12px;padding:13px;border:none;border-radius:12px;background:var(--lime);
  color:var(--ink);font-weight:700;font-size:15px;cursor:pointer;transition:filter .15s;}
.ad-knapp:hover:not(:disabled){filter:brightness(1.05);}
.ad-knapp:disabled{opacity:.5;cursor:default;}
.ad-bypass{width:100%;margin-top:10px;padding:11px;border:1px dashed rgba(255,255,255,.25);border-radius:12px;background:transparent;color:#9AA093;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;}
.ad-bypass:hover{border-color:rgba(198,242,78,.5);color:var(--lime);}

/* Topp */
.ad-topp{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;
  padding:16px 22px;background:var(--dark);color:var(--paper);}
.ad-topp .ad-merke{font-size:18px;color:var(--paper);}
.ad-last{padding:8px 16px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:transparent;
  color:var(--paper);font-size:13px;font-weight:600;cursor:pointer;}
.ad-last:hover:not(:disabled){border-color:var(--lime);color:var(--lime);}
.ad-last:disabled{opacity:.5;cursor:default;}

.ad-main{max-width:760px;margin:0 auto;padding:22px 18px 80px;}

/* Stats */
.ad-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
.ad-stat{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 14px;}
.ad-stat-tall{display:block;font-family:'Unbounded',sans-serif;font-weight:600;font-size:21px;letter-spacing:-.02em;}
.ad-stat-tall.ad-gronn{color:#3C6E1F;}
.ad-stat-merk{display:block;font-size:12px;color:var(--sub);margin-top:3px;text-transform:uppercase;letter-spacing:.05em;}

/* Filtre */
.ad-filtre{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;}
.ad-chip{padding:7px 15px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);
  font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;}
.ad-chip:hover{border-color:var(--ink);}
.ad-chip.valgt{background:var(--ink);color:var(--paper);border-color:var(--ink);}

/* Lead-kort */
.ad-liste{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;}
.ad-lead{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 17px;}
.ad-lead-topp{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
.ad-tjeneste{font-family:'Unbounded',sans-serif;font-weight:600;font-size:14px;}
.ad-omfang{color:var(--sub);font-weight:500;}
.ad-intens{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 10px;border-radius:999px;}
.ad-varm{background:var(--lime);color:var(--ink);}
.ad-lunken{background:#FBE7B8;color:#7A5A12;}
.ad-kald{background:#E7E6E0;color:#6E726A;}

.ad-lead-rad{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;}
.ad-lead-info{min-width:0;}
.ad-2vurd{color:#A8341F;font-weight:600;}
.ad-navn{font-size:16px;font-weight:600;margin:0 0 3px;}
.ad-meta{font-size:13px;color:var(--sub);margin:0;line-height:1.5;}
.ad-tlf{color:var(--ink);font-weight:600;text-decoration:none;border-bottom:1px solid var(--line);}
.ad-tlf:hover{border-color:var(--ink);}
.ad-besk{font-size:13.5px;color:#41463E;margin:8px 0 0;line-height:1.5;}
.ad-verdi{text-align:right;flex:none;}
.ad-verdi-tall{display:block;font-family:'Unbounded',sans-serif;font-weight:600;font-size:18px;letter-spacing:-.02em;white-space:nowrap;}
.ad-verdi-merk{display:block;font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;}

/* Handling */
.ad-handling{display:flex;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line);}
.ad-velg{flex:1;display:flex;flex-direction:column;gap:5px;}
.ad-velg span{font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;font-weight:600;}
.ad-velg select{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:#fff;
  color:var(--ink);font-size:14px;font-family:inherit;cursor:pointer;outline:none;}
.ad-velg select:focus-visible{border-color:var(--lime);box-shadow:0 0 0 3px rgba(198,242,78,.25);}

/* Tom / feil */
.ad-tom{text-align:center;padding:56px 20px;background:#fff;border:1px dashed var(--line);border-radius:16px;}
.ad-tom-tit{font-family:'Unbounded',sans-serif;font-size:16px;margin:0 0 6px;}
.ad-tom-und{font-size:14px;color:var(--sub);margin:0;}
.ad-feil{color:#A8341F;font-size:13.5px;margin:12px 0 0;}
.ad-info{color:#2F5E16;background:#EAF7D6;border:1px solid #CDE8A6;border-radius:10px;padding:9px 13px;font-size:13.5px;margin:12px 0 0;}
.ad-avslag{font-size:12.5px;color:#7A5A12;background:#FBE7B8;border-radius:8px;padding:7px 11px;margin:14px 0 0;}
.ad-enerett-forslag{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:#EAF7D6;border:1px solid #CDE8A6;border-radius:10px;padding:9px 13px;margin:12px 0 0;font-size:13.5px;color:#2F5E16;}
.ad-enerett-forslag strong{font-weight:700;}
.ad-enerett-btn{font-family:inherit;font-size:12.5px;font-weight:700;color:var(--ink);background:var(--lime);border:none;border-radius:8px;padding:6px 14px;cursor:pointer;white-space:nowrap;}
.ad-enerett-btn:hover{filter:brightness(1.05);}
.ad-enerett-ok{font-size:13px;color:#2F5E16;margin:12px 0 0;font-weight:600;}
.ad-kommune{font-weight:600;color:var(--ink);}
.ad-feil-rad{margin-bottom:14px;}

@media (max-width:560px){
  .ad-stats{grid-template-columns:1fr;}
  .ad-stat{display:flex;align-items:baseline;justify-content:space-between;}
  .ad-stat-merk{margin-top:0;}
  .ad-handling{flex-direction:column;}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;}}

/* Faner + topbar */
.ad-topbar{position:sticky;top:0;z-index:6;}
.ad-topp{position:static;}
.ad-faner{display:flex;gap:8px;padding:11px 18px;background:var(--dark);border-top:1px solid rgba(255,255,255,.07);overflow-x:auto;}
.ad-fane{flex:0 0 auto;padding:8px 16px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:transparent;color:#C9CEC2;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.ad-fane:hover{border-color:var(--lime);color:var(--lime);}
.ad-fane.valgt{background:var(--lime);border-color:var(--lime);color:var(--ink);}

/* Områder & enerett */
.ad-hjelp{font-size:13.5px;line-height:1.6;color:var(--sub);background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 15px;margin:0 0 18px;}
.ad-foresp{background:#fff;border:1px solid #CDE8A6;border-left:3px solid #C6F24E;border-radius:14px;padding:14px 16px;margin:0 0 18px;}
.ad-foresp-tit{font-family:'Unbounded',sans-serif;font-size:13px;font-weight:600;margin:0 0 10px;}
.ad-foresp-liste{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
.ad-foresp-rad{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.ad-foresp-info{display:flex;flex-direction:column;gap:2px;min-width:0;}
.ad-foresp-firma{font-weight:600;font-size:14.5px;}
.ad-foresp-hva{font-size:13px;color:var(--sub);}
.ad-foresp-knapper{display:flex;gap:8px;}
.ad-foresp-ja{font-family:inherit;font-size:12.5px;font-weight:700;color:var(--ink);background:var(--lime);border:none;border-radius:8px;padding:7px 14px;cursor:pointer;}
.ad-foresp-ja:hover{filter:brightness(1.05);}
.ad-foresp-nei{font-family:inherit;font-size:12.5px;font-weight:600;color:var(--sub);background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 14px;cursor:pointer;}
.ad-foresp-nei:hover{border-color:#A8341F;color:#A8341F;}
.ad-feil.ad-feil-rad{background:#FBEAE5;border:1px solid #F0C9BE;border-radius:10px;padding:9px 13px;}
.ad-pcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;}
.ad-pc-topp{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--line);}
.ad-pc-firma{font-family:'Unbounded',sans-serif;font-weight:600;font-size:16px;}
.ad-pc-org{font-family:'Hanken Grotesk',sans-serif;font-weight:500;font-size:12px;color:var(--sub);}
.ad-pc-fag{font-size:13px;color:var(--sub);text-align:right;}
.ad-pc-blokk{margin-top:14px;}
.ad-pc-merk{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--sub);margin:0 0 9px;}
.ad-pc-tom{font-size:13px;color:var(--sub);margin:0;font-style:italic;}
.ad-tagger{display:flex;flex-wrap:wrap;gap:6px;}
.ad-tagg{font-size:12.5px;font-weight:500;color:var(--ink);background:#F4F3EE;border:1px solid var(--line);border-radius:999px;padding:4px 11px;}
.ad-eier{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.ad-eier li{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.ad-eier-navn{font-size:14px;font-weight:600;}
.ad-fjern{font-family:inherit;font-size:12px;font-weight:600;color:var(--sub);background:#fff;border:1px solid var(--line);border-radius:8px;padding:5px 12px;cursor:pointer;white-space:nowrap;}
.ad-fjern:hover{border-color:#A8341F;color:#A8341F;}
@media (max-width:560px){
  .ad-pc-topp{flex-direction:column;gap:4px;}
  .ad-pc-fag{text-align:left;}
}
`;
