import { useState, useEffect, useRef } from "react";


/* ------------------------------------------------------------------ *
 *  Eluma — landingsside for KUNDER (etterspørselssiden) · v3
 *  Samme visuelle identitet som fagfolk-siden: lyst papir + mørke
 *  fokus-paneler, Unbounded display, glass-header, current-line.
 *  Vertikal-agnostisk lead-trakt. Stub til BRUK_EKTE_API = true.
 * ------------------------------------------------------------------ */

const TJENESTER = [
  { v: "solceller", t: "Solceller", d: "Strøm fra eget tak" },
  { v: "elbillader", t: "Elbillader", d: "Lading hjemme" },
  { v: "batteri", t: "Batteri", d: "Lagring og nødstrøm" },
  { v: "smarthus", t: "Smarthus", d: "Lavere strømregning og styring" },
  { v: "elektriker", t: "Elektriker", d: "Alt annet elektrisk" },
];

const TIDSHORISONT = [
  { v: "naa", t: "Så snart som mulig" },
  { v: "6-mnd", t: "Innen et halvår" },
  { v: "utforsker", t: "Bare utforsker" },
];

const STEG = ["Jobben", "Bolig", "Når", "Kontakt"];
const BRUK_EKTE_API = false;

function beregnScore({ tidshorisont, beskrivelse }) {
  const tid = { naa: 1.0, "6-mnd": 0.6, utforsker: 0.2 }[tidshorisont] ?? 0.2;
  const detalj = (beskrivelse || "").trim().length > 15 ? 1 : 0.5;
  return Math.round((tid * 0.7 + detalj * 0.3) * 100) / 100;
}

/* ---- Leadprising: kategori-base × intensjon (oppstarts­hypotese — valideres med installatører) ---- */
const PRISBASE = {
  solceller: 800, batteri: 700, elbillader: 450,
  smarthus_strom: 550, smarthus_enkel: 300,
  elektriker_storre: 450, elektriker_mindre: 195,
};
function basePris(tjeneste, omfang) {
  if (tjeneste === "elektriker") return omfang === "storre" ? PRISBASE.elektriker_storre : PRISBASE.elektriker_mindre;
  if (tjeneste === "smarthus") return omfang === "strom" ? PRISBASE.smarthus_strom : PRISBASE.smarthus_enkel;
  return PRISBASE[tjeneste] || 0;
}
const OMFANG = {
  elektriker: [{ v: "mindre", t: "Mindre / service" }, { v: "storre", t: "Større arbeid / oppgradering" }],
  smarthus: [{ v: "strom", t: "Smart strømstyring" }, { v: "enkel", t: "Smarthus (lys, varme, styring)" }],
};
const HAR_OMFANG = (tj) => tj in OMFANG;
function intensjon(score) {
  if (score >= 0.7) return { navn: "varm", faktor: 1 };
  if (score >= 0.4) return { navn: "lunken", faktor: 0.7 };
  return { navn: "kald", faktor: 0.5 };
}

const KOMMUNER = [
  "Arendal", "Birkenes", "Bygland", "Bykle", "Evje og Hornnes", "Farsund",
  "Flekkefjord", "Froland", "Gjerstad", "Grimstad", "Hægebostad", "Iveland",
  "Kristiansand", "Kvinesdal", "Lillesand", "Lindesnes", "Lyngdal", "Risør",
  "Sirdal", "Tvedestrand", "Valle", "Vegårshei", "Vennesla", "Åmli", "Åseral",
];


/* ---- ElumaLogo: offisiell animert logo (Charge & Connect), Unbounded 700 ---- */
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


export default function App() {
  const [steg, setSteg] = useState(0);
  const [d, setD] = useState({
    tjeneste: "", omfang: "", beskrivelse: "", kommune: "", adresse: "", eierforhold: "",
    tidshorisont: "", navn: "", mobil: "", epost: "", samtykke: false,
  });
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState(false);
  const [scrollet, setScrollet] = useState(false);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onScroll = () => setScrollet(window.scrollY > 16);
    const onResize = () => setVw(window.innerWidth);
    onScroll(); onResize();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);
  // Logo-høyde som alltid får plass i det mørke kortet (kvantisert for å unngå churn ved resize)
  const bigLogoH = Math.max(40, Math.min(80, Math.round((Math.round(vw / 20) * 20 - 96) * 0.17)));
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  const score = beregnScore(d);
  const tjeneste = TJENESTER.find((x) => x.v === d.tjeneste) || {};
  const intens = intensjon(score);
  const base = basePris(d.tjeneste, d.omfang);
  const leadverdi = Math.round(base * intens.faktor);

  const lead = {
    id: "lead-forhåndsvisning", kilde: "direkte", tjeneste: d.tjeneste,
    kommune: d.kommune || null,
    kontakt: { navn: d.navn, mobil: d.mobil, epost: d.epost || null, adresse: d.adresse },
    kvalifisering: { beskrivelse: d.beskrivelse, eierforhold: d.eierforhold, tidshorisont: d.tidshorisont, omfang: HAR_OMFANG(d.tjeneste) ? (d.omfang || null) : null },
    score, samtykke: { markedsforing: d.samtykke, tekstVersjon: "v1" },
    prising: { kategori: d.tjeneste === "elektriker" ? "elektriker_" + (d.omfang || "mindre") : d.tjeneste === "smarthus" ? "smarthus_" + (d.omfang || "enkel") : d.tjeneste, base, intensjon: intens.navn, faktor: intens.faktor, leadverdi },
    status: "ny", levering: { montor: null, sendtTidspunkt: null },
  };

  const tilForsiden = () => { setSteg(0); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const velgTjeneste = (v) => { setD((p) => ({ ...p, tjeneste: v, omfang: "" })); setSteg(1); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const kanVidere = {
    1: !!d.tjeneste && (!HAR_OMFANG(d.tjeneste) || !!d.omfang),
    2: !!d.kommune && d.adresse.trim().length > 3 && !!d.eierforhold,
    3: !!d.tidshorisont,
    4: d.navn.trim() && /^\+?\d[\d\s]{6,}$/.test(d.mobil.trim()) && d.samtykke,
  }[steg];

  const send = async () => {
    setSender(true); setFeil(false);
    if (!BRUK_EKTE_API) { setTimeout(() => { setSender(false); setSteg(5); }, 900); return; }
    try {
      const r = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      if (!r.ok) throw new Error();
      setSteg(5);
    } catch { setFeil(true); } finally { setSender(false); }
  };

  const trakt = steg >= 1 && steg <= 4;

  return (
    <div className="el-root">
      <style>{css}</style>

      <header className={"el-topp" + (scrollet ? " scrollet" : "")}>
        <span className="el-merke" onClick={tilForsiden}>
          <ElumaLogo height={30} theme="dark" />
        </span>
        <button className="el-topp-cta" onClick={tilForsiden}>Kom i gang</button>
      </header>

      {/* LANDING */}
      {steg === 0 && (
        <>
          {/* HERO — mørk panel med rutenett + glød */}
          <main className="el-hero">
            <div className="el-hero-grid" aria-hidden />
            <div className="el-hero-glow" aria-hidden />
            <div className="el-hero-inner">
              <p className="el-kile">Lokalt · Agder</p>
              <h1 className="el-tittel">Riktig fagperson til jobben, <em>lokalt i Agder</em></h1>
              <p className="el-ingress">
                Velg hva du trenger nedenfor, så finner vi én lokal fagperson som passer jobben —
                gratis og uforpliktende for deg.
              </p>

              <div className="el-tjenester">
                {TJENESTER.map((s) => (
                  <button key={s.v} className="el-tjeneste" onClick={() => velgTjeneste(s.v)}>
                    <Ikon navn={s.v} />
                    <span className="el-tj-tittel">{s.t}</span>
                    <span className="el-tj-desc">{s.d}</span>
                  </button>
                ))}
              </div>

              <p className="el-eksklusiv"><strong>Én</strong> lokal fagperson — din alene.</p>
              <div className="el-trust">
                <span>Lokalt i Agder</span><i /><span>Godkjente, forsikrede fagfolk</span><i /><span>Gratis og uforpliktende</span>
              </div>
            </div>
          </main>
          <div className="el-current" aria-hidden />

          {/* SLIK FUNGERER DET */}
          <section className="el-seksjon">
            <h2 className="el-sek-tittel">Slik fungerer det</h2>
            <div className="el-stepper">
              <div className="el-step"><span className="el-step-nr">1</span><strong>Velg tjeneste</strong><p>Sol, lader, batteri, smarthus eller elektriker.</p></div>
              <div className="el-step"><span className="el-step-nr">2</span><strong>Fortell om jobben</strong><p>Noen spørsmål om behovet — under et minutt.</p></div>
              <div className="el-step"><span className="el-step-nr">3</span><strong>Vi kobler deg</strong><p>Én lokal fagperson — din alene.</p></div>
              <div className="el-step"><span className="el-step-nr">4</span><strong>Få tilbud</strong><p>Gratis og uten forpliktelser.</p></div>
            </div>
          </section>


          {/* CASE */}
          <section className="el-seksjon el-case">
            <p className="el-case-sitat">Vi starter i Agder, med fagfolk vi selv kjenner og går god for — og vokser område for område, aldri raskere enn vi klarer å holde kvaliteten.</p>
            <p className="el-case-navn">— Slik jobber vi i Eluma</p>
          </section>

          {/* FAQ */}
          <section className="el-seksjon">
            <h2 className="el-sek-tittel">Spørsmål og svar</h2>
            <div className="el-faq-liste">
              <details className="el-faq"><summary>Hva koster det å bruke Eluma?</summary><p>Ingenting for deg. Fagpersonen betaler for å få seriøse, lokale henvendelser — du får tilbudet gratis og uforpliktende.</p></details>
              <details className="el-faq"><summary>Blir jeg oppringt av mange selgere?</summary><p>Nei — bare én. Du kobles med én kvalitetssikret lokal fagperson som tar kontakt for et uforpliktende tilbud, i ditt tempo.</p></details>
              <details className="el-faq"><summary>Hvilke områder dekker dere?</summary><p>Hele Agder. Vi bruker bare lokale fagfolk som kjenner området.</p></details>
              <details className="el-faq"><summary>Får jeg Enova-støtte på solceller?</summary><p>Ja — Enova støtter solceller med 25 % av kostnaden, maks 2 500 kr per kWp. Viktig: søk forhåndsgodkjenning fra Enova <strong>før</strong> du signerer kontrakt — signerer du for tidlig, mister du støtten. Fagpersonen hjelper deg gjennom det.</p></details>
            </div>
          </section>

          {/* SLUTT-CTA — mørkt panel med logo-øyeblikk */}
          <section className="el-seksjon el-sluttcta">
            <div className="el-sluttcta-glow" aria-hidden />
            <div className="el-logo-moment"><ElumaLogo height={bigLogoH} theme="dark" /></div>
            <h2 className="el-sek-tittel">Klar for å komme i gang?</h2>
            <button className="el-cta" onClick={tilForsiden}>Velg tjeneste</button>
          </section>
        </>
      )}

      {/* TRAKT — mørkt fokus-panel */}
      {trakt && (
        <main className="el-kort">
          <div className="el-fremdrift">
            {STEG.map((s, i) => (<div key={s} className={"el-prikk" + (i < steg ? " ferdig" : "")} />))}
          </div>

          <div key={steg} className="el-stegfade">
            {steg === 1 && (
              <>
                <h2 className="el-h2">{tjeneste.t}</h2>
                {HAR_OMFANG(d.tjeneste) && (
                  <>
                    <p className="el-sporsmal">{d.tjeneste === "smarthus" ? "Hva slags løsning?" : "Hva slags jobb?"}</p>
                    <div className="el-valg el-valg-2">
                      {OMFANG[d.tjeneste].map((o) => (
                        <button key={o.v} className={"el-pille" + (d.omfang === o.v ? " valgt" : "")} onClick={() => set("omfang", o.v)}>{o.t}</button>
                      ))}
                    </div>
                  </>
                )}
                <p className="el-sporsmal">Fortell kort hva du trenger hjelp med</p>
                <textarea className="el-input el-textarea" rows={4}
                  placeholder={`F.eks. "${tjenesteEksempel(d.tjeneste)}"`}
                  value={d.beskrivelse} onChange={(e) => set("beskrivelse", e.target.value)} />
                <p className="el-hint">Jo mer konkret, desto bedre tilbud — men et par setninger holder.</p>
              </>
            )}
            {steg === 2 && (
              <>
                <h2 className="el-h2">Hvor skal jobben gjøres?</h2>
                <label className="el-felt"><span>Kommune</span>
                  <select className="el-input" value={d.kommune} onChange={(e) => set("kommune", e.target.value)}>
                    <option value="">Velg kommune …</option>
                    {KOMMUNER.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select></label>
                <label className="el-felt"><span>Adresse</span>
                  <input className="el-input" placeholder="Gateadresse, poststed" value={d.adresse} onChange={(e) => set("adresse", e.target.value)} /></label>
                <p className="el-sporsmal">Eier eller leier du boligen?</p>
                <div className="el-valg el-valg-2">
                  {[{ v: "eier", t: "Jeg eier" }, { v: "leier", t: "Jeg leier" }].map((o) => (
                    <button key={o.v} className={"el-pille" + (d.eierforhold === o.v ? " valgt" : "")} onClick={() => set("eierforhold", o.v)}>{o.t}</button>
                  ))}
                </div>
              </>
            )}
            {steg === 3 && (
              <>
                <h2 className="el-h2">Når er det aktuelt?</h2>
                <div className="el-valg">
                  {TIDSHORISONT.map((o) => (
                    <button key={o.v} className={"el-pille" + (d.tidshorisont === o.v ? " valgt" : "")} onClick={() => set("tidshorisont", o.v)}>{o.t}</button>
                  ))}
                </div>
              </>
            )}
            {steg === 4 && (
              <>
                <h2 className="el-h2">Hvor sender vi tilbudet?</h2>
                <Anker tjeneste={d.tjeneste} omfang={d.omfang} kommune={d.kommune} />
                <label className="el-felt"><span>Navn</span><input className="el-input" value={d.navn} onChange={(e) => set("navn", e.target.value)} /></label>
                <label className="el-felt"><span>Mobil</span><input className="el-input" inputMode="tel" value={d.mobil} onChange={(e) => set("mobil", e.target.value)} /></label>
                <label className="el-felt"><span>E-post <em>(valgfritt)</em></span><input className="el-input" inputMode="email" value={d.epost} onChange={(e) => set("epost", e.target.value)} /></label>
                <label className="el-samtykke">
                  <input type="checkbox" checked={d.samtykke} onChange={(e) => set("samtykke", e.target.checked)} />
                  <span>Jeg samtykker til at kontaktinfoen min deles med én lokal fagperson som kan gi meg et tilbud. Se <a className="el-inline-link" href="/personvern" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>personvern</a>.</span>
                </label>
              </>
            )}
          </div>

          {steg === 4 && feil && <p className="el-feil">Noe gikk galt under sendingen. Prøv igjen, eller ring oss.</p>}
          <div className="el-nav">
            <button className="el-tekstknapp" onClick={() => setSteg((s) => (s === 1 ? 0 : s - 1))}>← Tilbake</button>
            {steg < 4 ? (
              <button className="el-cta liten" disabled={!kanVidere} onClick={() => setSteg((s) => s + 1)}>Neste</button>
            ) : (
              <button className="el-cta liten" disabled={!kanVidere || sender} onClick={send}>{sender ? "Sender …" : "Send forespørsel"}</button>
            )}
          </div>
        </main>
      )}

      {/* TAKK — mørkt panel */}
      {steg === 5 && (
        <main className="el-kort el-slutt">
          <div className="el-hake"><Hake /></div>
          <h2 className="el-h2">Takk, {d.navn.split(" ")[0] || "da er det sendt"}!</h2>
          <p className="el-brod">En lokal fagperson tar kontakt med deg om {tjeneste.t ? tjeneste.t.toLowerCase() : "jobben"} for et uforpliktende tilbud. Du hører fra én — din alene.</p>
          <details className="el-intern">
            <summary>Internt · lead-objektet (vises ikke til kunden)</summary>
            <div className="el-intern-nokkel"><span>tjeneste</span><code className="premium">{d.tjeneste}{HAR_OMFANG(d.tjeneste) && d.omfang ? " · " + d.omfang : ""}</code><span>score</span><code className={score >= 0.7 ? "varm" : ""}>{score}</code><span>intensjon</span><code>{intens.navn}</code><span>leadverdi</span><code className="premium">{leadverdi} kr</code></div>
            <pre>{JSON.stringify(lead, null, 2)}</pre>
          </details>
          <button className="el-tekstknapp el-tilbake-midt" onClick={tilForsiden}>← Til forsiden</button>
        </main>
      )}

      {steg !== 0 && <footer className="el-bunn">Eluma · lokal fagperson-formidling i Agder · <a className="el-inline-link" href="/personvern" target="_blank" rel="noopener">Personvern</a></footer>}
    </div>
  );
}

// Prisanker (beslutning C1/C2): vis verdi FØR vi ber om kontaktinfo (resiprositet).
// Regionalt som default; datadrevet fra /api/anker, statisk estimat-gulv som fallback (også i stub/dev).
// Hold ANKER_SEED i synk med SEED i api/anker.js.
const ANKER_SEED = {
  solceller: [100000, 250000], batteri: [40000, 90000], elbillader: [12000, 22000], // solceller kalibrert mot Agder Tak (100–300k, 15 kr/W)
  smarthus_strom: [8000, 25000], smarthus_enkel: [5000, 20000],
  elektriker_storre: [15000, 60000], elektriker_mindre: [2000, 12000],
};
function ankerKategori(tjeneste, omfang) {
  if (tjeneste === "elektriker") return "elektriker_" + (omfang || "mindre");
  if (tjeneste === "smarthus") return "smarthus_" + (omfang || "enkel");
  return tjeneste;
}
function Anker({ tjeneste, omfang, kommune }) {
  const seed = ANKER_SEED[ankerKategori(tjeneste, omfang)];
  const [a, setA] = useState(seed ? { lav: seed[0], hoy: seed[1], kilde: "estimat", omrade: "Agder" } : null);
  useEffect(() => {
    if (!tjeneste) return;
    let av = false;
    const p = new URLSearchParams({ tjeneste });
    if (omfang) p.set("omfang", omfang);
    if (kommune) p.set("kommune", kommune);
    fetch("/api/anker?" + p.toString())
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!av && j && !j.feil) setA(j); })
      .catch(() => {});
    return () => { av = true; };
  }, [tjeneste, omfang, kommune]);
  if (!a) return null;
  const kr = (n) => Number(n).toLocaleString("nb-NO");
  return (
    <div style={{ background: "rgba(198,242,78,.08)", border: "1px solid rgba(198,242,78,.25)", borderRadius: 14, padding: "13px 16px", margin: "0 0 18px" }}>
      <div style={{ fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "#C6F24E", marginBottom: 3 }}>Typisk i {a.omrade || "Agder"}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#F4F3EE", marginBottom: 6 }}>{kr(a.lav)}–{kr(a.hoy)} kr</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(244,243,238,.6)" }}>
        {a.kilde === "faktiske" ? "Basert på faktiske Agder-jobber. " : "Anslag. "}
        Ferdig montert, varierer med jobben — endelig pris settes ved gratis befaring.
        {tjeneste === "solceller" ? " Enova-støtte kommer i tillegg." : ""}
      </div>
    </div>
  );
}

function tjenesteEksempel(v) {
  return {
    solceller: "Vil ha solceller på et sørvendt tak på ca. 60 m².",
    elbillader: "Trenger hjemmelader i garasjen, har trefase.",
    batteri: "Ønsker batteri for nødstrøm ved strømbrudd.",
    smarthus: "Vil styre lys og varme via app.",
    elektriker: "Trenger flere stikkontakter og nytt sikringsskap.",
  }[v] || "Beskriv behovet ditt.";
}

function Ikon({ navn }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  if (navn === "solceller") return (<svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
  if (navn === "elbillader") return (<svg {...p}><path d="M7 4h7a2 2 0 0 1 2 2v13H5V6a2 2 0 0 1 2-2z" /><path d="M16 9h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 1-3 0v-3" /><path d="M10 8l-2 4h3l-2 4" /></svg>);
  if (navn === "batteri") return (<svg {...p}><rect x="3" y="8" width="16" height="9" rx="2" /><path d="M19 11h2v3h-2" /><path d="M11 10l-2 3h3l-2 3" /></svg>);
  if (navn === "smarthus") return (<svg {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><circle cx="12" cy="14" r="1.5" /></svg>);
  return (<svg {...p}><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" /></svg>);
}
function Hake() { return (<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>); }

const css = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Unbounded:wght@600;700&display=swap');

*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#F4F3EE;}
body{display:block;min-height:auto;place-items:initial;text-align:left;}
#root{max-width:none;margin:0;padding:0;display:block;text-align:left;min-height:auto;width:100%;}

.el-root{
  --paper:#F4F3EE; --ink:#191C19; --lime:#C6F24E; --lime-myk:#D4F566; --lime-dyp:#5c7d1a;
  --dark:#0F120D; --flate:#15211B; --natt-2:#0F1A15;
  --line:#E3E1D9; --sub:#7C7B72; --dempet:#9aa89f;
  --tekst:#191C19; --skall:1100px;
  position:relative; color:var(--ink);
  font-family:'Hanken Grotesk',sans-serif; -webkit-font-smoothing:antialiased;
  display:flex; flex-direction:column; align-items:center;
  padding:0 clamp(16px,4vw,40px) 0;
  background:var(--paper);
}
.el-root *{box-sizing:border-box;}
.el-root ::selection{background:var(--lime);color:var(--ink);}
.el-root :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:6px;}

/* ---------- header (flytende glass-pille) ---------- */
.el-topp{position:sticky;top:12px;z-index:40;width:100%;max-width:var(--skall);
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:10px 10px 10px 20px;margin:12px auto 0;
  color:var(--paper);border-radius:999px;overflow:hidden;
  background:rgba(15,18,13,.92);
  -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 8px 26px -16px rgba(15,18,13,.55), inset 0 1px 0 rgba(255,255,255,.07);
  transition:background .35s ease, box-shadow .35s ease, border-color .35s ease, backdrop-filter .35s ease;}
.el-topp::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0) 42%);}
.el-topp::after{content:'';position:absolute;left:18%;right:18%;bottom:0;height:1px;pointer-events:none;
  background:linear-gradient(90deg, transparent, rgba(198,242,78,.7), transparent);
  opacity:0;transition:opacity .35s ease;}
.el-topp.scrollet{background:rgba(15,18,13,.55);border-color:rgba(198,242,78,.20);
  -webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);
  box-shadow:0 18px 44px -16px rgba(15,18,13,.7), inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 1px rgba(198,242,78,.10);}
.el-topp.scrollet::after{opacity:1;}
.el-merke{position:relative;display:inline-flex;align-items:center;gap:11px;cursor:pointer;}
.el-topp-cta{position:relative;font-family:'Hanken Grotesk',sans-serif;font-size:14px;font-weight:700;white-space:nowrap;
  color:var(--ink);background:var(--lime);border:none;border-radius:999px;padding:10px 20px;cursor:pointer;transition:transform .12s, background .2s, box-shadow .2s;}
.el-topp-cta:hover{background:var(--lime-myk);box-shadow:0 0 22px -6px rgba(198,242,78,.6);}
.el-topp-cta:active{transform:scale(.97);}

/* ---------- HERO som mørkt panel ---------- */
.el-hero{position:relative;width:100%;max-width:var(--skall);overflow:hidden;
  background:var(--dark);color:var(--paper);border-radius:28px;margin-top:8px;text-align:center;
  padding:clamp(54px,8vw,104px) clamp(24px,5vw,80px) clamp(58px,8vw,92px);}
.el-hero-grid{position:absolute;inset:0;opacity:.55;pointer-events:none;
  background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
  background-size:60px 60px;-webkit-mask-image:radial-gradient(circle at 32% 22%,#000,transparent 78%);mask-image:radial-gradient(circle at 32% 22%,#000,transparent 78%);}
.el-hero-glow{position:absolute;width:760px;height:760px;left:50%;top:-360px;transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(circle,rgba(198,242,78,.20),rgba(198,242,78,0) 60%);filter:blur(18px);}
.el-hero-inner{position:relative;max-width:760px;margin:0 auto;}
.el-kile{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--lime);font-weight:600;margin:0 0 18px;}
.el-tittel{font-family:'Unbounded',sans-serif;font-weight:700;font-size:clamp(33px,6vw,66px);line-height:1.03;letter-spacing:-.025em;margin:0 0 22px;}
.el-tittel em{font-style:normal;color:var(--lime);}
.el-ingress{font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:#C8CCC3;max-width:560px;margin:0 auto 8px;}
.el-eksklusiv{font-size:14px;color:#AEB2A8;margin:26px auto 0;}
.el-eksklusiv strong{font-weight:700;color:var(--lime);}
@keyframes opp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}

/* tjeneste-velger (kort i hero) */
.el-tjenester{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:700px;margin:34px auto 4px;}
.el-tjeneste{flex:0 1 calc(33.333% - 8px);min-width:140px;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px 18px 16px;cursor:pointer;color:var(--paper);
  transition:transform .2s cubic-bezier(.2,.7,.3,1),border-color .2s,background .2s,box-shadow .2s;}
.el-tjeneste:hover{transform:translateY(-3px);border-color:var(--lime);background:rgba(198,242,78,.06);box-shadow:0 0 30px -10px rgba(198,242,78,.5);}
.el-tjeneste svg{color:var(--lime);margin-bottom:4px;}
.el-tj-tittel{font-family:'Unbounded',sans-serif;font-weight:600;font-size:15px;letter-spacing:-.01em;}
.el-tj-desc{font-size:12.5px;color:#AEB2A8;line-height:1.35;}
/* Elektriker vises likestilt med de andre tjenestene. */
.el-tjeneste:last-child:hover .el-tj-tittel{color:var(--paper);}

.el-trust{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:14px;margin:24px auto 0;font-size:13px;color:#AEB2A8;}
.el-trust i{width:4px;height:4px;border-radius:50%;background:var(--lime);opacity:.7;flex:none;}

/* current-line under hero */
.el-current{width:100%;max-width:520px;height:2px;margin:26px auto 0;
  background:linear-gradient(90deg,transparent,var(--lime) 42%,var(--lime-myk) 50%,var(--lime) 58%,transparent);
  background-size:220% 100%;animation:flow 4.5s linear infinite;opacity:.85;}
@keyframes flow{0%{background-position:160% 0}100%{background-position:-160% 0}}

/* ---------- CTA ---------- */
.el-cta{font-family:'Hanken Grotesk',sans-serif;font-size:16px;font-weight:700;color:var(--ink);
  background:var(--lime);border:none;border-radius:999px;padding:15px 34px;cursor:pointer;
  box-shadow:0 0 28px -6px rgba(198,242,78,.55);transition:transform .15s, box-shadow .15s, background .15s;}
.el-cta:hover{transform:translateY(-2px);background:var(--lime-myk);box-shadow:0 0 36px -4px rgba(198,242,78,.85);}
.el-cta:disabled{background:#cfcec6;color:#8a897f;box-shadow:none;cursor:not-allowed;transform:none;}
.el-cta.liten{padding:13px 26px;font-size:15px;}

/* ---------- seksjoner (papir) ---------- */
.el-seksjon{width:100%;max-width:var(--skall);margin:0 auto;padding:clamp(48px,6vw,86px) 0;border-top:1px solid var(--line);}
.el-sek-tittel{font-family:'Unbounded',sans-serif;font-weight:700;font-size:clamp(24px,3vw,40px);letter-spacing:-.02em;text-align:center;line-height:1.06;margin:0 0 clamp(28px,3vw,46px);color:var(--ink);}

/* stepper — offset-kort */
.el-stepper{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;max-width:980px;margin:0 auto;}
.el-step{position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px 22px;
  transition:transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .25s;}
.el-step:hover{transform:translate(3px,-3px);box-shadow:-6px 8px 0 var(--ink);border-color:var(--ink);}
.el-step-nr{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;
  background:var(--lime);color:var(--ink);font-weight:800;font-size:14px;font-family:'Unbounded',sans-serif;margin-bottom:14px;}
.el-step strong{display:block;font-family:'Unbounded',sans-serif;font-weight:600;font-size:16px;color:var(--ink);margin-bottom:7px;letter-spacing:-.01em;}
.el-step p{font-size:14px;line-height:1.5;color:var(--sub);margin:0;}


/* case */
.el-case{text-align:center;}
.el-case-sitat{font-size:clamp(20px,2.4vw,27px);line-height:1.4;font-weight:500;color:var(--ink);max-width:720px;margin:0 auto 16px;}
.el-case-navn{font-size:14px;color:var(--sub);font-weight:600;margin:0;}

/* faq */
.el-faq-liste{max-width:800px;margin:0 auto;}
.el-faq{border-bottom:1px solid var(--line);}
.el-faq summary{cursor:pointer;padding:18px 0;font-weight:600;font-size:16px;list-style:none;position:relative;padding-right:26px;color:var(--ink);}
.el-faq summary::-webkit-details-marker{display:none;}
.el-faq summary::after{content:'+';position:absolute;right:0;top:15px;color:var(--lime-dyp);font-size:21px;line-height:1;}
.el-faq[open] summary::after{content:'–';}
.el-faq p{font-size:15px;line-height:1.6;color:var(--sub);margin:0 0 18px;}

/* SLUTT-CTA — mørkt panel med logo-øyeblikk */
.el-sluttcta{position:relative;overflow:hidden;background:var(--dark);color:var(--paper);
  border-top:none;border-radius:28px;margin:clamp(20px,3vw,36px) auto 56px;padding:clamp(56px,7vw,92px) 20px;text-align:center;}
.el-sluttcta-glow{position:absolute;width:560px;height:560px;left:50%;top:-46%;transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(circle,rgba(198,242,78,.14),transparent 62%);}
.el-sluttcta .el-sek-tittel{position:relative;color:var(--paper);margin-bottom:clamp(22px,2.4vw,30px);}
.el-sluttcta .el-cta{position:relative;}
.el-logo-moment{position:relative;display:flex;justify-content:center;margin-bottom:22px;padding:0 24px;}

/* ---------- TRAKT / TAKK — mørkt fokus-panel ---------- */
.el-kort{position:relative;overflow:hidden;width:100%;max-width:560px;margin:clamp(24px,5vw,52px) auto 0;
  background:var(--dark);color:var(--paper);border-radius:28px;padding:clamp(30px,5vw,52px) clamp(22px,4vw,46px);
  box-shadow:0 30px 70px -40px rgba(15,18,13,.6);}
.el-kort::before{content:'';position:absolute;width:520px;height:520px;left:-160px;bottom:-300px;pointer-events:none;
  background:radial-gradient(circle,rgba(198,242,78,.12),transparent 62%);}
.el-kort>*{position:relative;}
.el-kort .el-felt>span,.el-kort .el-sporsmal{color:var(--paper);}

.el-fremdrift{display:flex;gap:8px;justify-content:center;margin-bottom:26px;}
.el-prikk{width:34px;height:4px;border-radius:99px;background:rgba(255,255,255,.14);transition:background .3s;}
.el-prikk.ferdig{background:var(--lime);}
.el-stegfade{animation:opp .4s ease both;}

.el-h2{font-family:'Unbounded',sans-serif;font-weight:700;font-size:clamp(22px,2.6vw,28px);letter-spacing:-.02em;margin:0 0 14px;color:var(--paper);line-height:1.1;}
.el-sporsmal{font-size:15px;font-weight:600;margin:14px 0 11px;}
.el-hint{font-size:13px;color:#AEB2A8;margin:10px 0 0;line-height:1.5;}
.el-felt{display:block;margin-bottom:16px;}
.el-felt>span{display:block;font-size:14px;font-weight:600;margin-bottom:7px;}
.el-felt em{color:#AEB2A8;font-weight:400;font-style:normal;}
.el-input{width:100%;font-family:inherit;font-size:16px;padding:12px 14px;border:1.5px solid rgba(255,255,255,.12);
  border-radius:11px;background:var(--natt-2);color:var(--paper);transition:border-color .15s;}
.el-input:focus{outline:none;border-color:var(--lime);}
.el-input::placeholder{color:#5d6f64;}
.el-textarea{resize:vertical;line-height:1.5;}
.el-valg{display:flex;flex-wrap:wrap;gap:9px;}
.el-valg-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.el-pille{font-family:inherit;font-size:15px;color:var(--paper);background:var(--natt-2);
  border:1.5px solid rgba(255,255,255,.12);border-radius:11px;padding:11px 16px;cursor:pointer;transition:all .14s;text-align:center;}
.el-pille:hover{border-color:var(--lime);}
.el-pille.valgt{background:var(--lime);border-color:var(--lime);color:var(--ink);font-weight:700;}
.el-samtykke{display:flex;gap:11px;align-items:flex-start;font-size:14px;line-height:1.5;color:#AEB2A8;margin-top:6px;}
.el-samtykke input{margin-top:3px;accent-color:var(--lime);width:17px;height:17px;flex:none;}
.el-inline-link{background:none;border:none;color:var(--lime);font:inherit;text-decoration:underline;cursor:pointer;padding:0;}
.el-feil{font-size:14px;color:#ff8b73;font-weight:500;margin:16px 0 0;}

.el-nav{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:28px;}
.el-tekstknapp{background:none;border:none;color:#AEB2A8;font:inherit;font-weight:600;cursor:pointer;padding:8px 4px;transition:color .15s;}
.el-tekstknapp:hover{color:var(--paper);}
.el-tilbake-midt{display:block;margin:22px auto 0;}

/* takk */
.el-slutt{text-align:center;}
.el-hake{width:54px;height:54px;border-radius:50%;background:rgba(198,242,78,.16);color:var(--lime);
  display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}
.el-brod{font-size:16px;line-height:1.6;color:#AEB2A8;margin:0 0 22px;}
.el-intern{text-align:left;background:#070D0A;color:#cfe6d8;border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:6px 16px 14px;font-size:13px;}
.el-intern summary{cursor:pointer;padding:10px 0;font-weight:600;color:var(--lime);}
.el-intern-nokkel{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;margin:8px 0 4px;font-size:12px;}
.el-intern-nokkel span{color:#9fb8a8;text-transform:uppercase;letter-spacing:.06em;font-weight:600;}
.el-intern-nokkel code{font-family:ui-monospace,Menlo,monospace;color:#cfe6d8;background:rgba(255,255,255,.05);padding:2px 8px;border-radius:6px;justify-self:start;}
.el-intern-nokkel code.premium{color:var(--lime);}
.el-intern-nokkel code.varm{color:var(--ink);background:var(--lime);font-weight:700;}
.el-intern pre{margin:8px 0 0;font-size:11.5px;line-height:1.5;overflow-x:auto;color:#9fb8a8;font-family:ui-monospace,Menlo,monospace;}

.el-bunn{font-size:12px;color:var(--sub);margin:34px auto 56px;text-align:center;max-width:560px;line-height:1.6;}

@media (max-width:520px){ .el-valg-2{grid-template-columns:1fr;gap:9px;} }
@media (prefers-reduced-motion: no-preference){
  .el-kile{animation:opp .6s .05s both;}
  .el-tittel{animation:opp .6s .12s both;}
  .el-ingress{animation:opp .6s .2s both;}
  .el-tjenester{animation:opp .6s .28s both;}
  .el-eksklusiv{animation:opp .6s .36s both;}
}
`;
