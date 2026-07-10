# Solcelle-leadmotor — Agder
### Formell byggespesifikasjon v1 · lokal solcelle-kvalifiseringsmotor

Dette dokumentet definerer hva som bygges, og hvilken kontrakt alt bygges rundt.
Stack: **ren Vite + React, deployet til Vercel** (samme pipeline som noabove.no og dvel.no).

**Styrende krav:** *hver besøkende skal forlate enten som en kvalifisert, eksklusiv lead —
eller med et ærlig estimat som bygger tillit.* Dette er ikke en sammenligningsside, men en
**lokal solcelle-kvalifiseringsmotor for Agder.** Du vinner ikke på generisk volum mot de
nasjonale — du vinner lokalt, på leadkvalitet og på Enova-øyeblikket. Alt som ikke tjener
kvalifisering eller tillit er pynt og utelates.

**Første kjøper:** Agder Tak (Jim Roger Pettersen) — takfirma først, integrerte solceller som
forlengelse. De er *første kjøper*, ikke hele forretningen: målet er en lokal solcelle-leadmotor
for Agder der Agder Tak er den første som betaler per lead. Deres kjernekunde er premium-
segmentet (`takbytte`), men plattformen kvalifiserer alle Agder-huseiere som vurderer solceller —
også de med et helt fint tak.

**Taktisk merknad:** i selve konsierge-testen mot Jim Roger, *led* med takvinkelen. Det er
leaden han verdsetter høyest og lettest sier ja til en pris på. Valider mekanismen på det
dyreste segmentet først; bredd ut til ren paneljobb når den fungerer.

---

## 1. Lead — førsteklasses begrep

Lead-objektet er kontrakten alt bygges mot. Skjemaet produserer det, estimatmotoren beriker
det, backenden lagrer og leverer det. Når dette er stabilt kan enhver del byttes ut.

```json
{
  "id": "lead-7f3a91",
  "opprettet": "2026-06-08T12:00:00Z",
  "kilde": "lokal-seo | facebook | agdertak | direkte",
  "kontakt": {
    "navn": "",
    "mobil": "",
    "epost": null,
    "adresse": ""
  },
  "kvalifisering": {
    "eierBolig": true,
    "takAlder": "over-25 | 15-25 | under-15 | vet-ikke",
    "takTilstand": "maa-byttes | snart | bra",
    "takflate": { "retning": "sor | sorost | sorvest | ost-vest | nord", "helning": "skraa | flatt", "arealM2": 60 },
    "tidshorisont": "naa | 6-mnd | utforsker"
  },
  "estimat": {
    "kWp": 9,
    "produksjonKwhAar": 8550,
    "kostnadKr": 153000,
    "enovaStotteKr": 22500
  },
  "segment": "takbytte | eksisterende-tak",
  "score": 0.82,
  "samtykke": {
    "markedsforing": true,
    "tidspunkt": "2026-06-08T12:00:00Z",
    "tekstVersjon": "v1"
  },
  "status": "ny | sendt | kontaktet | befaring | solgt | tapt",
  "levering": { "montor": "agder-tak", "sendtTidspunkt": null }
}
```

### Segment og kvalifiseringsscore

To ting utledes av leaden. De henger ikke sammen — det er hele poenget med endringen.

**`segment`** — hvilket prissegment leaden hører til, utledet av takets tilstand:

- `maa-byttes` eller `snart` → `"takbytte"` (premium — Agder Taks kjernekunde, høy ticket)
- `bra` eller `under-15` → `"eksisterende-tak"` (standard — paneler på godt tak)
- `vet-ikke` → `"eksisterende-tak"` inntil avklart ved befaring

**`score`** (0–1) — kjøpsintensjon og egnethet, *uavhengig av segment*. Et fint tak skal ikke
straffes: en sørvendt huseier klar til å kjøpe nå er en varm lead uansett takstand.

| Signal | Vekt | Varmt utslag |
|---|---|---|
| `eierBolig === true` | obligatorisk | må være true (Enova-krav), ellers ikke en lead |
| `tidshorisont` | 0.45 | `naa` = 1.0, `6-mnd` = 0.6, `utforsker` = 0.2 |
| `takflate.retning` | 0.30 | sør = 1.0, sør-øst/vest = 0.8, øst-vest = 0.5, nord = 0.1 |
| `takflate.arealM2` | 0.25 | normalisert mot et anlegg på ~10 kWp |

Pris per lead settes på to akser: **segment × score.** En `takbytte`-lead med `score >= 0.7`
er det dyreste du selger — og Agder Taks favoritt. En `eksisterende-tak`-lead med samme score
er fortsatt fullverdig solcelle, bare lavere ticket. Vektene og prisene kalibreres mot hva
montøren faktisk kaller en god kunde når du har snakket pris.

---

## 2. Den offentlige trakten

Single-page React-app med stegvis tilstand (ingen reload mellom steg). Ruter:

- `/` — landing + start på trakten
- `/enova` — Enova-hjelperen (også embeddet som steg)
- `/referanser` — lokale caser (kan også være seksjon på `/`)
- `/personvern` — personvernerklæring

### Kroken (landing)

Solcelle-først, lokalt forankret. Overskrift i retning: «Lønner solceller seg på taket ditt i
Agder? Få et ærlig estimat på minuttet.» Lokal forankring — Sørlandet, ekte naboeksempler — er
det de nasjonale ikke har. Rett under: en kort, *korrekt* 2026-forklaring på at du må ha
Enova-godkjenning **før** du signerer kontrakt — posisjonert som «vi hjelper deg gjennom det».
Det er differensieringen og tillitsbyggingen i ett grep.

Takvinkelen forsvinner ikke — den blir et *premium-spor*, ikke hele inngangen. Skal du uansett
bytte tak, er integrert solcelletak den dyreste og beste løsningen, og skjemaet fanger det opp
i takspørsmålet (segment `takbytte`). Et fint tak avviser ingen — det rutes mot paneler på
eksisterende tak (segment `eksisterende-tak`). Begge er leads.

### Kvalifiseringsskjemaet (hjertet)

Stegvis. **Ikke** navn + mobil + adresse — det er nettopp det de billige leadsene består av.
Rekkefølgen er bevisst: verdi før vi spør om kontaktinfo.

1. **Adresse** — «Hvor er taket?» (også grunnlag for estimat)
2. **Eierskap** — «Eier du boligen?» (Enova-krav; `false` → vennlig avslutning, ingen lead)
3. **Taket** — alder, tilstand, retning, helning, ca. areal (avgjør `segment`, ikke om man slipper inn)
4. **Tidshorisont** — nå / innen 6 mnd / utforsker
5. **→ ESTIMAT VISES HER** (se §3) — verdien tilbake, før vi spør om mer
6. **Kontakt** — navn, mobil, (valgfri) e-post
7. **Samtykke** — eksplisitt avhukingsboks (se §5), deretter «Send»

`eierBolig` er den eneste harde sperren. Takstand sorterer kun segment — den avviser aldri en
lead. Steg 6–7 låses bak at estimatet er vist; reciprositeten er hele grunnen til at de fullfører.

---

## 3. Estimatmotoren

Deterministisk, kjører i klienten, ingen API-kall. Viser et **tydelig merket estimat** —
aldri et løfte. Alle konstanter samlet i én fil (`src/estimat/konstanter.js`) og **kalibreres
mot Agder Taks faktiske tall** (en god grunn til å hente reelle produksjons- og pristall fra
Jim Roger).

Foreløpige konstanter (Sørlandet, justeres):

```
ANLEGG_KWP        = brukbartAreal_m2 / 6        // ~6 m² per kWp
PRODUKSJON_KWH    = kWp * 950                   // kWh/år, Sørlandet
KOSTNAD_KR        = kWp * 17000                 // midt i spennet, før støtte
```

Enova-støtte — **korrekt 2026-formel:**

```
enovaStotteKr = min( min(kWp, 15) * 2500,  0.25 * KOSTNAD_KR )
```

(2 500 kr per kWp, maks 15 kWp = maks 37 500 kr, og uansett ikke mer enn 25 % av kostnaden.)

For `takbytte`-segmentet dekker estimatet **kun solcelledelen** — takkostnaden kommer i tillegg
og tas ved befaring. Vær ærlig om det i visningen, ellers undergraver du tilliten.

Estimatet skal alltid ledsages av: «Estimat. Endelig tall settes ved gratis befaring.» og en
kort merknad om at Enova-godkjenning må være på plass før kontrakt signeres.

---

## 4. Enova-hjelperen — kilen

En kort, guidet sjekkliste gjennom forhåndsgodkjenningen. En lead som allerede har forstått
eller startet dette steget er nesten et salg for montøren. Innhold (ren tekst, ingen logikk):

1. Sjekk at du eier boligen og at firmaet som monterer er registrert.
2. **Søk Enova om forhåndsgodkjenning før du signerer kontrakt** — signerer du for tidlig,
   mister du hele støtten.
3. Vent på tommel opp fra Enova.
4. Signer kontrakt, få anlegget montert.
5. Send sluttrapport med dokumenterte kostnader → utbetaling.

Lenke ut til Enovas offisielle søknadsside. Ikke samle inn noe her — dette er ren tillit og
posisjonering.

---

## 5. Samtykke og personvern

Du samler personopplysninger og gir dem videre til tredjepart (montør). Da kreves:

- **Eksplisitt markedsføringssamtykke** — egen avhukingsboks, ikke forhåndsavkrysset, med
  klar tekst om at kontaktinfo deles med montør for at de skal kunne gi tilbud. Lagres med
  `tidspunkt` og `tekstVersjon` i lead-objektet (bevisbyrde).
- **Personvernerklæring** tilgjengelig fra alle steg i skjemaet. Bygg på malen fra
  myrepartnere-jobben: behandlingsgrunnlag, hva som samles, hvem det deles med, lagringstid,
  rettigheter. Hjemler: personopplysningsloven, ekomloven § 2-7b (informasjonskapsler).
- Ingen lead sendes til montør uten at `samtykke.markedsforing === true`.

---

## 6. Backenden — det som gjør det til en business

Holdes lett i v1. Tre oppgaver: lagre, varsle, levere.

- **`/api/lead.js`** — Vercel serverless-funksjon (Node). Tar imot lead-objektet, validerer
  (eierskap + samtykke obligatorisk), utleder `segment`, beregner/bekrefter `score`, lagrer,
  varsler, returnerer ok.
- **Lagring** — Supabase-tabell `leads` (gratis nivå) med kolonner som speiler §1. Til nød et
  Google Sheet i aller første runde, men Supabase gir deg status-felt og søk gratis.
- **Varsling** — e-post eller SMS til deg umiddelbart ved ny lead (Resend / et SMS-API).
- **Levering til montør** — eksklusivt, med *hele* kvalifiseringsdataen vedlagt (ikke bare
  navn + mobil — det er nettopp dataen som rettferdiggjør prisen). I v1 går alt til Agder Tak
  via en pen e-post. `levering.montor` er designet for å generalisere: når du har flere
  montører, rutes leads på `segment` (`takbytte` → Agder Tak; rene paneljobber kan gå til en
  ren solcellemontør). Aldri samme lead til to — eksklusivt per lead uansett.
- **Sporing** — `status` oppdateres manuelt i Supabase: ny → sendt → kontaktet → befaring →
  solgt/tapt. Uten dette kan du verken bevise ROI overfor Jim Roger eller kjenne din egen
  økonomi (kost per lead mot pris per lead).

Miljøvariabler (Vercel): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VARSEL_API_KEY`,
`MONTOR_EPOST`.

---

## 7. Teknisk arkitektur

- Vite + React. Komponenten eksporteres som `export default function App()`.
- Statiske ressurser (caser-bilder, logo) i `public/`.
- Struktur:
  ```
  /api/lead.js            ← Vercel serverless
  /public/                ← bilder, OG-bilde
  /src/App.jsx
  /src/steg/              ← ett komponent per skjemasteg
  /src/estimat/konstanter.js
  /src/estimat/beregn.js
  /src/personvern.jsx
  ```
- Deploy via samme `publiser`-alias og Vercel-pipeline som noabove.no. Legg en `HUSKELAPP.md`
  i prosjektet med env-variabler, Supabase-skjema og estimatkonstantene.

---

## 8. Det vi *ikke* bygger i v1

Bevisst utelatt til trakten konverterer og Jim Roger faktisk betaler:

- Innlogging / dashboard for montør
- Budgivning eller flere montører per lead
- Betalingsflyt eller fakturering i appen
- Andre vertikaler (varmepumpe, etterisolering) eller andre regioner enn Agder
- Automatisk takoppslag mot kart/solinnstrålingsdata

Samme disiplin som Noabove: bygg det minste som lar deg kvalifisere og levere én lead godt,
designet så det kan generaliseres senere. `segment`-feltet er nettopp en slik generalisering
lagt inn billig nå.

---

## 9. Akkvisisjon (utenfor appen, men halve jobben)

Siden er den enkle halvdelen. Leadsene må inn:

- **Lokal solcelle-SEO (basen)** — «solceller Kristiansand», «solceller Agder», «lønner
  solceller seg [kommune]». De nasjonale eier «solceller» nasjonalt; ingen eier Agder lokalt.
- **Takbytte-lommen (premium long-tail)** — «solcelletak ved takbytte», «integrert solcelletak
  Agder». Lavt volum, høy verdi, tilnærmet null konkurranse.
- **Lokale Facebook-grupper** og Agder Taks eget publikum.
- **Ikke** by mot Bytt.no på generisk betalt søk — du betaler deres CPC uten deres volum.

---

## 10. Akseptkriterier (v1 er ferdig når)

1. Skjemaet kan ikke fullføres uten bekreftet eierskap og avhuket samtykke.
2. Takstand avviser aldri en lead — den utleder kun `segment`.
3. Estimat vises før kontaktinfo etterspørres.
4. Enova-støtten i estimatet bruker 2026-formelen (maks 37 500, ≤ 25 % av kostnad).
5. `segment` og `score` utledes og lagres på hver lead, og `score` straffer ikke et fint tak.
6. Ny lead lagres i Supabase og varsel mottas hos deg innen få sekunder.
7. Ingen lead leveres til montør uten `samtykke.markedsforing === true`.
8. Personvernerklæring er tilgjengelig fra alle steg.
9. Alle estimatkonstanter ligger samlet og kalibrerbart i `src/estimat/konstanter.js`.
