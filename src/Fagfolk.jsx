import { useState, useEffect, useRef } from "react";


/* ------------------------------------------------------------------ *
 *  Eluma — landingsside for FAGFOLK (tilbudssiden) · v3
 *  Ny visuell identitet: mørk hero + lyst papir, Unbounded display,
 *  diagonal-kutt / offset-kort / current-line — samme innhold & logikk.
 * ------------------------------------------------------------------ */

const PRISER = [
  { navn: "Solceller", lead: 800 },
  { navn: "Batteri", lead: 700 },
  { navn: "Elbillader", lead: 450 },
  { navn: "Elektriker – større arbeid", lead: 450 },
  { navn: "Smart strømstyring", lead: 550 },
  { navn: "Smarthus – lys, varme, styring", lead: 300 },
  { navn: "Elektriker – mindre / service", lead: 195 },
];
// Førsterett kjøpes per kommune, vektet etter kommunens lead-potensial (oppstartshypoteser — start lavt).
const ENERETT_TIERS = [
  { navn: "Stor kommune", eksempel: "Kristiansand, Arendal", mnd: 990 },
  { navn: "Middels kommune", eksempel: "Grimstad, Lillesand, Lindesnes, Vennesla", mnd: 590 },
  { navn: "Liten kommune", eksempel: "distriktskommuner", mnd: 290 },
];
const MIN_LEAD = Math.min(...PRISER.map((p) => p.lead));
const MAX_LEAD = Math.max(...PRISER.map((p) => p.lead));
const MIN_ENERETT_MND = Math.min(...ENERETT_TIERS.map((t) => t.mnd));

const FAG = [
  { v: "solceller", t: "Solceller" },
  { v: "elbillader", t: "Elbillader" },
  { v: "batteri", t: "Batteri" },
  { v: "smarthus", t: "Smarthus" },
  { v: "elektriker", t: "Elektriker" },
];

const BRUK_EKTE_API = false;


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
  const [d, setD] = useState({
    navn: "", firma: "", orgnr: "", fag: [], omrade: "", mobil: "", epost: "", melding: "", samtykke: false,
  });
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState(false);
  const [sendt, setSendt] = useState(false);
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
  const toggleFag = (v) => setD((p) => ({ ...p, fag: p.fag.includes(v) ? p.fag.filter((x) => x !== v) : [...p.fag, v] }));

  const partner = {
    id: "partner-forhåndsvisning", type: "fagperson",
    firma: d.firma, orgnr: d.orgnr || null, kontakt: { navn: d.navn, mobil: d.mobil, epost: d.epost || null },
    fag: d.fag, omrade: d.omrade, melding: d.melding || null,
    samtykke: { kontakt: d.samtykke }, status: "interessert",
  };

  const kanSende = d.navn.trim() && d.firma.trim() && d.fag.length > 0 &&
    /^\+?\d[\d\s]{6,}$/.test(d.mobil.trim()) && d.samtykke;

  const scrollTil = () => document.getElementById("meld")?.scrollIntoView({ behavior: "smooth" });
  const velgFag = (v) => { setD((p) => ({ ...p, fag: p.fag.includes(v) ? p.fag : [...p.fag, v] })); scrollTil(); };

  const send = async () => {
    setSender(true); setFeil(false);
    if (!BRUK_EKTE_API) { setTimeout(() => { setSender(false); setSendt(true); }, 900); return; }
    try {
      const r = await fetch("/api/partner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partner) });
      if (!r.ok) throw new Error();
      setSendt(true);
    } catch { setFeil(true); } finally { setSender(false); }
  };

  return (
    <div className="el-root">
      <style>{css}</style>

      <header className={"el-topp" + (scrollet ? " scrollet" : "")}>
        <span className="el-merke" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ElumaLogo height={30} theme="dark" />
        </span>
        <button className="el-topp-cta" onClick={scrollTil}>Bli partner</button>
      </header>

      {/* HERO — mørk panel med rutenett + glød */}
      <main className="el-hero">
        <div className="el-hero-grid" aria-hidden />
        <div className="el-hero-glow" aria-hidden />
        <div className="el-hero-inner">
          <p className="el-kile">For fagfolk i Agder</p>
          <h1 className="el-tittel">Leads som er <em>dine alene</em></h1>
          <p className="el-ingress">
            Eluma sender deg kvalifiserte, lokale henvendelser — hver eneste eksklusivt til deg.
            Ikke delt, ikke videresolgt, ingen budkrig.
          </p>
          <div className="el-fagstrip">
            <span className="el-fagstrip-merk">For deg som jobber med</span>
            <div className="el-fagstrip-liste">
              {FAG.filter((f) => f.v !== "elektriker").map((f) => (
                <button key={f.v} type="button" className="el-fag-pille" onClick={() => velgFag(f.v)}>{f.t}</button>
              ))}
            </div>
          </div>
          <button className="el-cta" onClick={scrollTil}>Meld interesse</button>
          <p className="el-eksklusiv"><strong>Sikre førsteretten din</strong> — kun én fagperson kan ha førsterett per fag i hver kommune.</p>
        </div>
      </main>
      <div className="el-current" aria-hidden />

      {/* PROBLEM */}
      <section className="el-seksjon">
        <h2 className="el-sek-tittel">Slik fungerer vanlige lead-tjenester</h2>
        <div className="el-problem">
          <div><span className="el-kryss">✕</span><p>Du betaler for en lead som selges til tre–fem andre samtidig.</p></div>
          <div><span className="el-kryss">✕</span><p>Halvparten svarer ikke, eller «sjekker bare priser».</p></div>
          <div><span className="el-kryss">✕</span><p>Du konkurrerer på pris fra første sekund.</p></div>
          <div><span className="el-kryss">✕</span><p>Du står i en endeløs, landsdekkende liste — sammen med alle slags fag.</p></div>
        </div>
      </section>

      {/* SLIK ER VI ANNERLEDES */}
      <section className="el-seksjon">
        <h2 className="el-sek-tittel">Slik gjør vi det annerledes</h2>
        <div className="el-fordeler">
          <div className="el-fordel"><span className="el-hjorne" aria-hidden /><h3>Eksklusivt</h3><p>Hver lead går til én fagperson — deg. Ingen budkrig, ingen delte henvendelser.</p></div>
          <div className="el-fordel"><span className="el-hjorne" aria-hidden /><h3>Kvalifisert</h3><p>Kunden har svart på hva, hvor og når. Du ser intensjonen før du løfter telefonen.</p></div>
          <div className="el-fordel"><span className="el-hjorne" aria-hidden /><h3>Lokalt og spesialisert</h3><p>Vi er lokale i Agder og kun innen energi og el — sol, lader, batteri, smarthus, elektriker. Du velger fagene og områdene dine, og får henvendelser der du allerede jobber.</p></div>
        </div>
      </section>

      {/* PRIS */}
      <section className="el-seksjon">
        <h2 className="el-sek-tittel">Hva det koster</h2>
        <p className="el-pris-ingress">Du betaler per kvalifiserte, eksklusive lead — og prisen følger jobbtypen. Et varmt solcelle-lead er verdt mer enn en liten servicejobb, så du betaler aldri flatt for alt.</p>
        <div className="el-priser">
          <div className="el-pris-kort">
            <span className="el-pris-navn">Uten binding</span>
            <p className="el-pris-stor">fra {MIN_LEAD} kr<small>/ lead</small></p>
            <p className="el-pris-under">0 kr i måneden · ingen binding</p>
            <div className="el-pris-delelinje" aria-hidden />
            <ul className="el-pris-liste">
              <li>Eksklusive leads i hele området du dekker</li>
              <li>Betal kun for leads du mottar — aldri delt</li>
              <li>Pris følger jobbtype og hvor varm kunden er</li>
            </ul>
            <button className="el-pris-cta" onClick={scrollTil}>Meld interesse</button>
          </div>
          <div className="el-pris-kort fram">
            <span className="el-pris-badge">Valgfritt</span>
            <span className="el-pris-navn">Førsterett per kommune</span>
            <p className="el-pris-stor">fra {MIN_ENERETT_MND} kr<small>/ mnd per kommune</small></p>
            <p className="el-pris-under">Først i køen på nye leads · beholdes ved respons</p>
            <div className="el-pris-delelinje" aria-hidden />
            <ul className="el-pris-liste">
              <li>Hvert nytt lead i kommunen går til deg først — før noen andre</li>
              <li>Svarer du raskt, er de i praksis dine; svarer du ikke, går de videre</li>
              <li>Førsterett i så mange kommuner du vil — pris per kommune</li>
            </ul>
            <button className="el-pris-cta fram" onClick={scrollTil}>Meld interesse</button>
          </div>
        </div>

        <div className="el-pristabell">
          {PRISER.map((p) => (
            <div className="el-pt-rad" key={p.navn}>
              <span className="el-pt-navn">{p.navn}</span>
              <span className="el-pt-pris">{p.lead} kr</span>
            </div>
          ))}
        </div>
        <p className="el-pt-note">Priser per eksklusive lead, uten binding. Varme leads (kunde klar nå) er full pris; lunkne og utforskende rabatteres automatisk.</p>

        <p className="el-pt-overskrift">Førsterett — pris per kommune / måned</p>
        <div className="el-pristabell el-enerett-tabell">
          {ENERETT_TIERS.map((t) => (
            <div className="el-pt-rad" key={t.navn}>
              <span className="el-pt-navn">{t.navn}<small className="el-pt-eks"> · {t.eksempel}</small></span>
              <span className="el-pt-pris">{t.mnd} kr</span>
            </div>
          ))}
        </div>
        <p className="el-pt-note">Du mottar eksklusive leads (én lead, én fagperson) i hele området du dekker — uten månedspris. Førsterett er valgfritt og kjøpes per kommune der du vil stå først i køen. Du beholder forspranget ved å svare raskt — svarer du ikke i tide, går leadet videre så kunden aldri blir stående. Så mange kommuner du vil; store koster mer enn små.</p>

        <p className="el-garanti">Holder ikke en lead mål? Si fra innen 48 timer, så krediterer vi den.</p>
        <p className="el-modell-note">Oppstartspriser for de første partnerne i Agder. Ingen oppstartskostnad, ingen skjulte gebyrer.</p>
      </section>

      {/* MELD INTERESSE / TAKK — mørkt fokus-panel */}
      <section className="el-seksjon el-skjema-sek" id="meld">
        {!sendt ? (
          <>
            <h2 className="el-sek-tittel">Bli partner</h2>
            <p className="el-skjema-ingress">Lås oppstartsprisen som en av de første partnerne i Agder.</p>
            <div className="el-skjema">
              <div className="el-rad-2">
                <label className="el-felt"><span>Navn</span><input className="el-input" value={d.navn} onChange={(e) => set("navn", e.target.value)} /></label>
                <label className="el-felt"><span>Firma</span><input className="el-input" value={d.firma} onChange={(e) => set("firma", e.target.value)} /></label>
              </div>
              <label className="el-felt"><span>Org.nr <em>(valgfritt — for verifisering)</em></span><input className="el-input" inputMode="numeric" value={d.orgnr} onChange={(e) => set("orgnr", e.target.value)} /></label>

              <p className="el-sporsmal">Hvilke fag tilbyr du?</p>
              <div className="el-valg">
                {FAG.map((f) => (
                  <button key={f.v} className={"el-pille" + (d.fag.includes(f.v) ? " valgt" : "")} onClick={() => toggleFag(f.v)}>{f.t}</button>
                ))}
              </div>

              <label className="el-felt el-rom"><span>Område <em>(kommuner du dekker)</em></span>
                <input className="el-input" placeholder="F.eks. Kristiansand, Lillesand, Vennesla" value={d.omrade} onChange={(e) => set("omrade", e.target.value)} /></label>

              <div className="el-rad-2">
                <label className="el-felt"><span>Mobil</span><input className="el-input" inputMode="tel" value={d.mobil} onChange={(e) => set("mobil", e.target.value)} /></label>
                <label className="el-felt"><span>E-post <em>(valgfritt)</em></span><input className="el-input" inputMode="email" value={d.epost} onChange={(e) => set("epost", e.target.value)} /></label>
              </div>

              <label className="el-felt"><span>Melding <em>(valgfritt)</em></span>
                <textarea className="el-input el-textarea" rows={3} placeholder="Noe vi bør vite om kapasitet, ønsket volum e.l.?" value={d.melding} onChange={(e) => set("melding", e.target.value)} /></label>

              <label className="el-samtykke">
                <input type="checkbox" checked={d.samtykke} onChange={(e) => set("samtykke", e.target.checked)} />
                <span>Det er greit at Eluma kontakter meg om partnerskap. Se <a href="/personvern" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} style={{ color: "var(--lime)", textDecoration: "underline" }}>personvern</a>.</span>
              </label>

              {feil && <p className="el-feil">Noe gikk galt under sendingen. Prøv igjen, eller ring oss.</p>}
              <button className="el-cta el-cta-full" disabled={!kanSende || sender} onClick={send}>
                {sender ? "Sender …" : "Meld interesse"}
              </button>
            </div>
          </>
        ) : (
          <div className="el-slutt">
            <div className="el-hake"><Hake /></div>
            <h2 className="el-h2">Takk, {d.navn.split(" ")[0] || "vi har notert det"}!</h2>
            <p className="el-brod">Vi tar kontakt for en uforpliktende prat om partnerskap i {d.omrade || "ditt område"}. Du hører fra oss snart.</p>
            <details className="el-intern">
              <summary>Internt · partner-objektet (vises ikke til fagpersonen)</summary>
              <pre>{JSON.stringify(partner, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="el-seksjon">
        <h2 className="el-sek-tittel">Spørsmål og svar</h2>
        <div className="el-faq-liste">
          <details className="el-faq"><summary>Deler dere leads med flere fagfolk?</summary><p>Nei. Én lead går til én fagperson. Det er hele poenget — du slipper budkrigen.</p></details>
          <details className="el-faq"><summary>Hva koster det?</summary><p>Du betaler per kvalifiserte, eksklusive lead — fra {MIN_LEAD} kr for en mindre jobb til {MAX_LEAD} kr for et varmt solcelle-lead. Du mottar leads i hele området du dekker uten månedspris. Vil du stå først i køen på leads i en kommune, kjøper du førsterett der — fra {MIN_ENERETT_MND} kr/mnd per kommune. Førsterett-partnere får hvert lead først og bedre kommersielle vilkår over tid. Ingen oppstartskostnad.</p></details>
          <details className="el-faq"><summary>Hva betyr førsterett i området?</summary><p>To ting henger sammen her. <strong>Dekningsområdet</strong> ditt er kommunene du tar leads i — der får du eksklusive leads (én lead, én fagperson) uansett, uten ekstra kostnad. <strong>Førsterett</strong> kjøper du per kommune, og gir deg hvert nytt lead i faget ditt der <em>først</em>: svarer du raskt, er det ditt; svarer du ikke i tide, går det videre til en annen så kunden aldri blir stående. Du beholder forspranget ved respons, ikke ved å låse ute andre. Andre fag kan ha egne partnere i samme kommune. Førsteretten gjelder så lenge du svarer og følger opp, og revideres jevnlig.</p></details>
              <details className="el-faq"><summary>Kan jeg ha førsterett i flere kommuner?</summary><p>Ja. Førsterett i så mange kommuner du vil, pris per kommune — store koster mer enn små. Du trenger ikke førsterett for å motta leads i en kommune; det holder at den er i dekningsområdet ditt. Førsterett er for der du vil stå fremst i køen.</p></details>
          <details className="el-faq"><summary>Hvor mange leads kan jeg vente meg?</summary><p>Det avhenger av fag og område, og vi er ærlige på at volumet er lavere i oppstart. Vi prioriterer kvalitet framfor kvantitet — varme henvendelser, ikke en bunke kalde.</p></details>
          <details className="el-faq"><summary>Hvordan kvalitetssikres en lead?</summary><p>Kunden svarer på behov, bolig og tidshorisont før vi sender. Vi scorer intensjonen, så du vet hvor varm henvendelsen er før du tar kontakt.</p></details>
        </div>
      </section>

      {/* SLUTT-BRAND — mørkt panel */}
      <section className="el-seksjon el-sluttbrand">
        <div className="el-sluttbrand-glow" aria-hidden />
        <div className="el-logo-moment"><ElumaLogo height={bigLogoH} theme="dark" /></div>
        <p className="el-omrade-tekst">Lokale <span className="el-tag-lime">energiløsninger</span> i Agder.</p>
      </section>

      <footer className="el-bunn">Eluma er i oppstart i Agder. Oppstartspriser for de første partnerne; prisene kan justeres etter lanseringsfasen.</footer>
    </div>
  );
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
/* glassaktig glans på toppen */
.el-topp::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0) 42%);}
/* svakt lime-skjær langs bunnkanten — toner inn ved scroll */
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
.el-hero-inner{position:relative;max-width:740px;margin:0 auto;}
.el-kile{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--lime);font-weight:600;margin:0 0 18px;}
.el-fagstrip{margin:30px 0;display:flex;flex-direction:column;align-items:center;gap:10px;}
.el-fagstrip-merk{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8C9286;font-weight:600;}
.el-fagstrip-liste{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;}
.el-fag-pille{font-family:inherit;font-size:12px;font-weight:500;color:#AEB2A8;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:999px;padding:4px 11px;cursor:pointer;transition:all .15s;}
.el-fag-pille:hover{color:var(--paper);border-color:rgba(198,242,78,.5);background:rgba(198,242,78,.08);}
.el-fag-pille:focus-visible{outline:none;border-color:var(--lime);box-shadow:0 0 0 3px rgba(198,242,78,.25);}
.el-tittel{font-family:'Unbounded',sans-serif;font-weight:700;font-size:clamp(33px,6vw,66px);line-height:1.03;letter-spacing:-.025em;margin:0 0 22px;}
.el-tittel em{font-style:normal;color:var(--lime);}
.el-ingress{font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:#C8CCC3;max-width:540px;margin:0 auto 32px;}
.el-eksklusiv{font-size:14px;color:#AEB2A8;margin:28px auto 0;}
.el-eksklusiv strong{font-weight:700;color:var(--lime);}
@keyframes opp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}

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
.el-cta-full{width:100%;margin-top:20px;animation:none;}

/* ---------- seksjoner (papir) ---------- */
.el-seksjon{width:100%;max-width:var(--skall);margin:0 auto;padding:clamp(48px,6vw,86px) 0;border-top:1px solid var(--line);}
.el-sek-tittel{font-family:'Unbounded',sans-serif;font-weight:700;font-size:clamp(24px,3vw,40px);letter-spacing:-.02em;text-align:center;line-height:1.06;margin:0 0 clamp(28px,3vw,46px);color:var(--ink);}

/* problem */
.el-problem{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px 30px;max-width:760px;margin:0 auto;}
.el-problem>div{display:flex;gap:13px;align-items:flex-start;}
.el-kryss{flex:none;width:24px;height:24px;border-radius:50%;background:rgba(192,73,46,.12);color:#c0492e;
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin-top:1px;}
.el-problem p{margin:0;font-size:16px;line-height:1.5;color:var(--ink);}

/* fordeler — offset-kort med lime-hjørne */
.el-fordeler{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;max-width:980px;margin:0 auto;}
.el-fordel{position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:16px;padding:26px;
  transition:transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .25s;}
.el-fordel:hover{transform:translate(3px,-3px);box-shadow:-6px 8px 0 var(--ink);border-color:var(--ink);}
.el-fordel h3{font-family:'Unbounded',sans-serif;font-weight:600;font-size:18px;color:var(--ink);margin:0 0 10px;letter-spacing:-.01em;}
.el-fordel p{font-size:15px;line-height:1.55;color:var(--sub);margin:0;}
.el-hjorne{position:absolute;top:0;right:0;width:42px;height:42px;background:var(--lime);
  clip-path:polygon(100% 0,0 0,100% 100%);opacity:0;transition:opacity .25s;}
.el-fordel:hover .el-hjorne,.el-pris-kort:hover .el-hjorne{opacity:1;}

.el-omrade-tekst{font-size:16px;line-height:1.55;color:#AEB2A8;max-width:480px;margin:0 auto 30px;}

/* pris — premium kort */
.el-priser{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:22px;max-width:790px;margin:0 auto;align-items:stretch;}
.el-pris-kort{position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:20px;padding:32px 30px;display:flex;flex-direction:column;
  transition:transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .25s;}
.el-pris-kort:hover{transform:translate(3px,-3px);box-shadow:-7px 9px 0 var(--ink);border-color:var(--ink);}
.el-pris-badge{position:absolute;top:18px;right:18px;background:var(--lime);color:var(--ink);font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:999px;z-index:2;}
.el-pris-navn{font-size:12.5px;font-weight:700;letter-spacing:.08em;color:var(--sub);text-transform:uppercase;}
.el-pris-stor{font-family:'Unbounded',sans-serif;font-weight:700;font-size:42px;color:var(--ink);margin:14px 0 3px;line-height:1;letter-spacing:-.02em;}
.el-pris-stor small{font-family:'Hanken Grotesk',sans-serif;font-size:15px;font-weight:500;color:var(--sub);margin-left:8px;}
.el-pris-under{font-size:14.5px;color:var(--lime-dyp);font-weight:600;margin:0;}
.el-pris-delelinje{height:1px;background:var(--line);margin:22px 0;}
.el-pris-liste{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;flex:1 0 auto;}
.el-pris-liste li{position:relative;padding-left:30px;font-size:14.5px;line-height:1.45;color:var(--ink);}
.el-pris-liste li::before{content:'';position:absolute;left:0;top:1px;width:19px;height:19px;border-radius:50%;background:rgba(140,177,58,.16);}
.el-pris-liste li::after{content:'✓';position:absolute;left:0;top:1px;width:19px;height:19px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--lime-dyp);}
.el-pris-cta{margin-top:26px;font-family:'Hanken Grotesk',sans-serif;font-size:15px;font-weight:700;cursor:pointer;
  border-radius:999px;padding:13px 22px;border:1.5px solid var(--ink);background:transparent;color:var(--ink);transition:background .18s, color .18s, transform .12s, box-shadow .2s;}
.el-pris-cta:hover{background:var(--ink);color:var(--paper);}
.el-pris-cta:active{transform:scale(.98);}

/* anbefalt-kort: mørkt, hever seg fram */
.el-pris-kort.fram{background:var(--dark);border-color:var(--dark);color:var(--paper);box-shadow:0 20px 44px -26px rgba(15,18,13,.65);}
.el-pris-kort.fram:hover{transform:translate(3px,-3px);border-color:rgba(198,242,78,.45);box-shadow:0 24px 54px -22px rgba(198,242,78,.45);}
.el-pris-kort.fram .el-pris-navn{color:var(--lime);}
.el-pris-kort.fram .el-pris-stor{color:var(--paper);}
.el-pris-kort.fram .el-pris-stor small{color:#AEB2A8;}
.el-pris-kort.fram .el-pris-under{color:var(--lime-myk);}
.el-pris-kort.fram .el-pris-delelinje{background:rgba(255,255,255,.12);}
.el-pris-kort.fram .el-pris-liste li{color:#D8DCD2;}
.el-pris-kort.fram .el-pris-liste li::before{background:rgba(198,242,78,.18);}
.el-pris-kort.fram .el-pris-liste li::after{color:var(--lime);}
.el-pris-cta.fram{border-color:var(--lime);background:var(--lime);color:var(--ink);}
.el-pris-cta.fram:hover{background:var(--lime-myk);border-color:var(--lime-myk);box-shadow:0 0 24px -6px rgba(198,242,78,.6);}
.el-garanti{text-align:center;font-size:14.5px;color:var(--lime-dyp);font-weight:600;margin:26px auto 8px;max-width:520px;}
.el-modell-note{text-align:center;font-size:13.5px;line-height:1.6;color:var(--sub);max-width:500px;margin:0 auto;}
.el-pris-ingress{text-align:center;font-size:15.5px;line-height:1.6;color:var(--sub);max-width:560px;margin:-18px auto 32px;}
.el-pristabell{max-width:520px;margin:34px auto 0;border-top:1px solid var(--line);}
.el-pt-rad{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:13px 4px;border-bottom:1px solid var(--line);}
.el-pt-navn{font-size:15px;color:var(--ink);font-weight:500;}
.el-pt-pris{font-family:'Unbounded',sans-serif;font-weight:600;font-size:16px;color:var(--ink);letter-spacing:-.01em;white-space:nowrap;}
.el-pt-note{text-align:center;font-size:13px;line-height:1.6;color:var(--sub);max-width:520px;margin:16px auto 0;}
.el-pt-overskrift{max-width:520px;margin:30px auto 8px;font-size:12.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--sub);}
.el-enerett-tabell{margin-top:0;}
.el-pt-eks{font-weight:400;color:var(--sub);font-size:12.5px;}

/* SKJEMA — mørkt fokus-panel */
.el-skjema-sek{position:relative;overflow:hidden;background:var(--dark);color:var(--paper);
  border-top:none;border-radius:28px;margin:clamp(20px,3vw,36px) auto;padding:clamp(48px,6vw,80px) clamp(22px,4vw,64px);}
.el-skjema-sek::before{content:'';position:absolute;width:600px;height:600px;left:-170px;bottom:-320px;pointer-events:none;
  background:radial-gradient(circle,rgba(198,242,78,.13),transparent 62%);}
.el-skjema-sek .el-sek-tittel,.el-skjema-sek .el-felt>span,.el-skjema-sek .el-sporsmal{color:var(--paper);}
.el-skjema-ingress{position:relative;text-align:center;font-size:15.5px;color:#AEB2A8;max-width:460px;margin:-18px auto 26px;}
.el-skjema{position:relative;max-width:520px;margin:0 auto;}
.el-rad-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.el-felt{display:block;margin-bottom:16px;}
.el-felt.el-rom{margin-top:6px;}
.el-felt>span{display:block;font-size:14px;font-weight:600;margin-bottom:7px;}
.el-felt em{color:#AEB2A8;font-weight:400;font-style:normal;}
.el-input{width:100%;font-family:inherit;font-size:16px;padding:12px 14px;border:1.5px solid rgba(255,255,255,.12);
  border-radius:11px;background:var(--natt-2);color:var(--paper);transition:border-color .15s;}
.el-input:focus{outline:none;border-color:var(--lime);}
.el-input::placeholder{color:#5d6f64;}
.el-textarea{resize:vertical;line-height:1.5;}
.el-sporsmal{font-size:15px;font-weight:600;margin:6px 0 11px;}
.el-valg{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:6px;}
.el-pille{font-family:inherit;font-size:15px;color:var(--paper);background:var(--natt-2);
  border:1.5px solid rgba(255,255,255,.12);border-radius:11px;padding:10px 16px;cursor:pointer;transition:all .14s;}
.el-pille:hover{border-color:var(--lime);}
.el-pille.valgt{background:var(--lime);border-color:var(--lime);color:var(--ink);font-weight:700;}
.el-samtykke{display:flex;gap:11px;align-items:flex-start;font-size:14px;line-height:1.5;color:#AEB2A8;margin-top:6px;}
.el-samtykke input{margin-top:3px;accent-color:var(--lime);width:17px;height:17px;flex:none;}
.el-feil{font-size:14px;color:#ff8b73;font-weight:500;margin:16px 0 0;}

/* takk (inni mørkt panel) */
.el-slutt{position:relative;text-align:center;max-width:520px;margin:0 auto;}
.el-hake{width:54px;height:54px;border-radius:50%;background:rgba(198,242,78,.16);color:var(--lime);
  display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}
.el-h2{font-family:'Unbounded',sans-serif;font-weight:700;font-size:26px;letter-spacing:-.02em;margin:0 0 14px;color:var(--paper);}
.el-brod{font-size:16px;line-height:1.6;color:#AEB2A8;margin:0 0 22px;}
.el-intern{text-align:left;background:#070D0A;color:#cfe6d8;border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:6px 16px 14px;font-size:13px;}
.el-intern summary{cursor:pointer;padding:10px 0;font-weight:600;color:var(--lime);}
.el-intern pre{margin:8px 0 0;font-size:11.5px;line-height:1.5;overflow-x:auto;color:#9fb8a8;font-family:ui-monospace,Menlo,monospace;}

/* faq */
.el-faq-liste{max-width:800px;margin:0 auto;}
.el-faq{border-bottom:1px solid var(--line);}
.el-faq summary{cursor:pointer;padding:18px 0;font-weight:600;font-size:16px;list-style:none;position:relative;padding-right:26px;color:var(--ink);}
.el-faq summary::-webkit-details-marker{display:none;}
.el-faq summary::after{content:'+';position:absolute;right:0;top:15px;color:var(--lime-dyp);font-size:21px;line-height:1;}
.el-faq[open] summary::after{content:'–';}
.el-faq p{font-size:15px;line-height:1.6;color:var(--sub);margin:0 0 18px;}

/* slutt-brand — mørkt panel */
.el-sluttbrand{position:relative;overflow:hidden;background:var(--dark);color:var(--paper);
  border-top:none;border-radius:28px;margin:clamp(20px,3vw,36px) auto 0;padding:clamp(56px,7vw,92px) 20px;text-align:center;}
.el-sluttbrand-glow{position:absolute;width:560px;height:560px;left:50%;top:-46%;transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(circle,rgba(198,242,78,.14),transparent 62%);}
.el-sluttbrand .el-logo-moment{margin-bottom:14px;}
.el-sluttbrand .el-omrade-tekst{position:relative;color:#BCC2B6;font-size:14.5px;letter-spacing:.02em;max-width:340px;margin:0 auto;}
.el-tag-lime{color:var(--lime);}
.el-logo-moment{position:relative;display:flex;justify-content:center;margin-bottom:22px;padding:0 24px;}

.el-bunn{font-size:12px;color:var(--sub);margin:34px auto 56px;text-align:center;max-width:560px;line-height:1.6;}

@media (max-width:520px){ .el-rad-2{grid-template-columns:1fr;gap:0;} }
@media (prefers-reduced-motion: no-preference){
  .el-kile{animation:opp .6s .05s both;}
  .el-tittel{animation:opp .6s .12s both;}
  .el-ingress{animation:opp .6s .2s both;}
  .el-cta{animation:opp .6s .28s both;}
  .el-eksklusiv{animation:opp .6s .36s both;}
}
`;
