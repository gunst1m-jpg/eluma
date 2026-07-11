# Eluma — oppstartssjekkliste

Alt som gjenstår for å ta Eluma live, i rekkefølge. Koden er ferdig og bygger; dette er
infra, tall og innhold som krever dine kontoer og beslutninger. Sist oppdatert 2026-07-11.

> Kanonisk bakgrunn: modellen i [`docs/modell-beslutninger.md`](docs/modell-beslutninger.md),
> drift/oppsett i [`docs/eluma-drift-oppsett.md`](docs/eluma-drift-oppsett.md),
> spec i [`docs/agder-leadmotor-spesifikasjon.md`](docs/agder-leadmotor-spesifikasjon.md).

---

## 0. Strategi før du skrur på noe (les dette først)

**Ikke lanser passivt, og ikke lanser begge sider symmetrisk.**

- **Montørsiden (`/fagfolk`) er klar nå — som et direkte salgsverktøy**, ikke offentlig
  selvbetjening. Send den som lenke til Jim Roger og 2–3 andre du håndverver. Du trenger en
  benk (≥2 montører i kjernekommunene) *før* forbrukertrafikk.
- **Forbrukersiden (`/`) venter** til du har en ekte montør i andre enden. Løftet er «én
  vurdert fagperson tar kontakt» — sender en kunde inn og ingen ringer, brekker merkevaren
  på første inntrykk i et lite marked. **Lanser bak deg selv som konsierge:** overvåk hvert
  lead personlig og garanter oppfølging.
- **Behold den manuelle godkjenningsporten** for montører (selvbetjent inntak, du godkjenner).
  Det er moaten, ikke friksjon.
- **Eget Eluma AS** skilles ut *hvis/når* modellen validerer — ikke før. Kjør fra Gunstein
  Myre AS i valideringsfasen.

---

## 1. Infrastruktur

- [ ] **Supabase** — opprett prosjekt. Kjør SQL i denne rekkefølgen i SQL-editoren:
  - [ ] `create table`-snuttene i `docs/eluma-drift-oppsett.md` §3 (`leads`, `partnere`,
        `enerett`, `partner_token`, `enerett_foresporsel` + `alter`-ene)
  - [ ] [`supabase/utfall.sql`](supabase/utfall.sql) (C3-kolonnene: `fornoyd`, `sluttpris`,
        `testimonial`, `utfall_tidspunkt`)
  - [ ] [`supabase/epost-endre.sql`](supabase/epost-endre.sql) (`epost_endring`-tabellen for
        verifisert e-post-bytte i portalen)
  - [ ] Kopier `SUPABASE_URL` + `service_role`-nøkkel (Settings → API)
- [ ] **Resend** — opprett konto + API-nøkkel. Til test holder `onboarding@resend.dev`; til
      produksjon, verifiser domenet så du kan sende fra `varsel@eluma.no`.
- [ ] **Vercel** — importer GitHub-repoet `gunst1m-jpg/eluma`, deploy (Vite oppdages automatisk).
- [ ] **Domene** — pek `eluma.no` mot Vercel (og sett `SITE_URL` deretter).

## 2. Miljøvariabler (Vercel → Settings → Environment Variables)

Alle 8 fra [`.env.example`](.env.example):

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` *(kun server — aldri i frontend)*
- [ ] `RESEND_API_KEY`
- [ ] `VARSEL_FRA` — f.eks. `Eluma <varsel@eluma.no>`
- [ ] `VARSEL_TIL` — din e-post (varsel om nye leads/partnere)
- [ ] `ADMIN_TOKEN` — lang, tilfeldig streng (passord til `/admin`)
- [ ] `SITE_URL` — `https://eluma.no`
- [ ] `PORTAL_SECRET` — lang, tilfeldig streng (signerer portal-sesjon + kundelenker)
- [ ] *(valgfritt, senere)* `CRON_SECRET` — kun hvis du aktiverer førsterett-timeout (B1/B3)

## 3. Innhold og kontaktpunkter

- [ ] **`personvern@eluma.no`** — sett opp mottak (eller be meg bytte til en reell adresse i
      `src/Personvern.jsx`)
- [ ] **`public/`** — legg inn delingsbilde (OG), logo og favicon
- [ ] **Referanser** — skaff minst én ekte lokal referanse (case-teksten er nå ærlig
      «slik jobber vi», ikke en falsk kunde — behold det til du har en ekte)

## 4. Kalibrer tallene med Jim Roger

Erstatt oppstartshypotesene med reelle tall. **Hold parene i synk (kommentert i koden):**

- [x] **Solcelle-anker** — kalibrert mot Agder Tak (100–250k). *(gjort)*
- [x] **Enova-FAQ** — rettet mot enova.no (25 % / maks 2 500 kr/kWp). *(gjort)*
- [ ] **Lead-priser** `PRISBASE` — i `src/App.jsx` **og** `api/lead.js` (må være like)
- [ ] **Førsterett-tiers** `ENERETT_TIERS` + jobbtype-priser `PRISER` — i `src/Fagfolk.jsx`
- [ ] **Øvrige anker-spenn** `SEED` — i `api/anker.js` **og** `ANKER_SEED` i `src/App.jsx`
      (batteri, elbillader, smarthus, elektriker)

## 5. Skru på og test

- [ ] Sett `BRUK_EKTE_API = true` i **både** `src/App.jsx` (~l.26) og `src/Fagfolk.jsx` (~l.37)
      *(til da kjører skjemaene i stub-modus uten å sende noe)*
- [ ] Deploy
- [ ] Kjør ende-til-ende-sjekklisten i `docs/eluma-drift-oppsett.md` §5 (lead → varsel →
      tildeling → montør ta/nei → portal-innlogging → enerett-forespørsel → forbruk)
- [ ] Verifiser at **ingen lead** sendes uten `samtykke = true` (spec §10, akseptkriterie 7)

## 6. Fra dag én (så launchen lærer deg noe)

- [ ] **Skru på C3-utfallsfangst fra jobb nr. 1** — send `POST /api/utfall {send:true, id,
      admin_token}` når en jobb er fullført. Det gjør ankeret om fra «anslag» til «faktiske
      Agder-tall» og gir deg Jim Rogers close-rate (hele begrunnelsen for lead-prisen).
- [ ] **Vokt konsentrasjon (E1)** — følg med på hvor stor andel av leads/omsetning én montør
      utgjør. Kapring, ikke konfrontasjon, er dødsårsaken.

---

## Bevisst utsatt (ikke i launch)

- All enerett/**førsterett**-salg (B3) — kjerneproduktet ett-eksklusivt-per-lead står alene
- Førsterett-timeout-cron — bygget, ikke aktivert i `vercel.json`
- Kundevendt pris-dom, «maks 2 tilbud», full estimat-kalkulator
- E1/E2-tilsynsrapporter — venter til det finnes data å regne på
