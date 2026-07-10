// /personvern — personvernerklæring (spec §5). Beskriver det systemet FAKTISK gjør:
// samtykke lagret med tidspunkt+versjon (lead.js), deling med ÉN montør, databehandlere
// Supabase/Resend/Vercel, funksjonell sesjonskapsel i portalen (portal/_auth.js).
//
// TODO før launch — fyll inn de markerte [ ]-plassholderne:
//   [Eluma AS, org.nr …], [adresse], [X måneder] lagringstid, og bekreft personvern@eluma.no.
export default function Personvern() {
  return (
    <div className="pv-root">
      <style>{css}</style>

      <header className="pv-topp">
        <a className="pv-merke" href="/">eluma</a>
        <a className="pv-tilbake" href="/">← Til forsiden</a>
      </header>

      <main className="pv-dok">
        <h1>Personvernerklæring</h1>
        <p className="pv-meta">Eluma · Sist oppdatert 10. juli 2026</p>

        <p className="pv-ingress">
          Denne erklæringen forklarer hvilke personopplysninger Eluma behandler når du ber om et
          tilbud eller melder interesse som fagperson, hvorfor, og hvilke rettigheter du har.
        </p>

        <section>
          <h2>1. Behandlingsansvarlig</h2>
          <p>
            <strong>[Eluma AS, org.nr … ]</strong>, [adresse], Agder, er behandlingsansvarlig for
            personopplysningene som beskrives her. Spørsmål om personvern:{" "}
            <a href="mailto:personvern@eluma.no">personvern@eluma.no</a>.
          </p>
        </section>

        <section>
          <h2>2. Hva vi behandler</h2>
          <p><strong>Når du ber om tilbud (privatkunde):</strong> navn, mobilnummer, e-post (valgfritt),
            adresse og kommune, din beskrivelse av jobben, om du eier eller leier boligen, tidshorisont,
            samt tidspunkt og tekstversjon for samtykket ditt.</p>
          <p><strong>Når du melder interesse som fagperson:</strong> firmanavn, organisasjonsnummer,
            kontaktnavn, mobil, e-post, fagområder og geografisk område.</p>
          <p><strong>Teknisk:</strong> logger en fagperson inn i partnerportalen, settes én funksjonell
            sesjonskapsel som holder deg innlogget. Ingen sporingskapsler.</p>
        </section>

        <section>
          <h2>3. Formål og behandlingsgrunnlag</h2>
          <p>Vi behandler opplysningene for å levere tjenesten — å koble deg med én lokal fagperson som
            kan gi deg et tilbud. Behandlingsgrunnlaget er ditt <strong>samtykke</strong>
            (personopplysningsloven, jf. personvernforordningen (GDPR) art. 6 nr. 1 bokstav a), som du
            gir aktivt ved å huke av i skjemaet.</p>
          <p>Vi deler <strong>aldri</strong> kontaktinformasjonen din med en fagperson uten at du har gitt
            dette samtykket. Samtykket kan trekkes tilbake når som helst (se punkt 6).</p>
        </section>

        <section>
          <h2>4. Hvem vi deler med</h2>
          <p><strong>Én lokal fagperson.</strong> Henvendelsen din gis eksklusivt til én fagperson, slik at
            de kan gi deg et tilbud. Den selges aldri videre til flere.</p>
          <p><strong>Databehandlere</strong> som drifter tjenesten på våre vegne: Supabase (database),
            Resend (utsending av e-post) og Vercel (drift av nettstedet). Noen av disse kan behandle data
            utenfor EU/EØS; slik overføring skjer på gyldig overføringsgrunnlag (EUs standard
            personvernbestemmelser). Vi selger aldri personopplysninger.</p>
        </section>

        <section>
          <h2>5. Lagringstid</h2>
          <p>Vi lagrer henvendelsen så lenge det er nødvendig for å levere og dokumentere tjenesten, og
            deretter i en begrenset periode av hensyn til regnskap og eventuelle tvister. Henvendelser
            slettes eller anonymiseres senest <strong>[X måneder]</strong> etter siste aktivitet.
            Dokumentasjon av samtykke (tidspunkt og versjon) beholdes så lenge vi kan ha behov for å
            dokumentere at samtykke ble gitt.</p>
        </section>

        <section>
          <h2>6. Dine rettigheter</h2>
          <p>Du har rett til innsyn i, retting av og sletting av opplysningene dine, til å begrense eller
            protestere mot behandlingen, til dataportabilitet, og til å <strong>trekke tilbake
            samtykket</strong> når som helst. Kontakt oss på{" "}
            <a href="mailto:personvern@eluma.no">personvern@eluma.no</a>, så hjelper vi deg.</p>
          <p>Mener du at vi behandler opplysningene dine i strid med regelverket, kan du klage til{" "}
            <a href="https://www.datatilsynet.no" target="_blank" rel="noopener">Datatilsynet</a>.</p>
        </section>

        <section>
          <h2>7. Informasjonskapsler</h2>
          <p>I henhold til ekomloven § 2-7b bruker vi kun <strong>nødvendige, funksjonelle</strong>
            informasjonskapsler — en sesjonskapsel som holder en fagperson innlogget i portalen. Vi
            bruker ingen markedsførings- eller sporingskapsler på nettstedet. Tas analyseverktøy i bruk
            senere, oppdateres denne erklæringen først.</p>
        </section>

        <section>
          <h2>8. Endringer</h2>
          <p>Vi kan oppdatere denne erklæringen. Ny versjon publiseres her med oppdatert dato. Har du
            spørsmål, kontakt <a href="mailto:personvern@eluma.no">personvern@eluma.no</a>.</p>
        </section>
      </main>

      <footer className="pv-bunn">Eluma · lokal fagperson-formidling i Agder</footer>
    </div>
  );
}

const css = `
.pv-root{--paper:#F4F3EE;--ink:#191C19;--dim:#5C6157;--lime:#C6F24E;--line:#E4E2DA;
  background:var(--paper);color:var(--ink);min-height:100vh;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.65;}
.pv-topp{display:flex;align-items:center;justify-content:space-between;
  max-width:760px;margin:0 auto;padding:22px 24px;}
.pv-merke{font-weight:800;letter-spacing:-.02em;font-size:20px;color:var(--ink);text-decoration:none;}
.pv-tilbake{font-size:14px;color:var(--dim);text-decoration:none;}
.pv-tilbake:hover{color:var(--ink);}
.pv-dok{max-width:760px;margin:0 auto;padding:8px 24px 56px;}
.pv-dok h1{font-size:30px;line-height:1.2;margin:12px 0 6px;letter-spacing:-.02em;}
.pv-meta{color:var(--dim);font-size:14px;margin:0 0 24px;}
.pv-ingress{font-size:17px;color:var(--ink);margin:0 0 8px;padding-bottom:20px;border-bottom:1px solid var(--line);}
.pv-dok section{padding:22px 0;border-bottom:1px solid var(--line);}
.pv-dok h2{font-size:18px;margin:0 0 10px;}
.pv-dok p{margin:0 0 12px;font-size:15.5px;color:#2A2E28;}
.pv-dok p:last-child{margin-bottom:0;}
.pv-dok a{color:var(--ink);text-decoration:underline;text-underline-offset:2px;text-decoration-color:var(--lime);}
.pv-dok strong{font-weight:600;}
.pv-bunn{max-width:760px;margin:0 auto;padding:28px 24px 40px;color:var(--dim);font-size:13px;}
@media(max-width:560px){.pv-dok h1{font-size:25px;}}
`;
