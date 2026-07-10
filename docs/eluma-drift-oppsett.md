# Eluma — drifts- og oppsettsnotat

Alt du trenger for å ta lead-motoren live: filene, miljøvariablene, databasetabellene og rekkefølgen. Stack: Vite + React på Vercel, Supabase som database, Resend for e-post. Ingen npm-avhengigheter i API-ene — rene `fetch`-kall.

---

## 1. Delene

**Sider (React):**
- `App.jsx` — forsiden + kvalifiserings-trakt for kunder. Sender lead til `/api/lead`.
- `Fagfolk.jsx` — siden for fagfolk/installatører. Sender interessemelding til `/api/partner`.
- `Admin.jsx` — intern admin med to faner: **Leads** (`/api/leads` — hent + tildel) og **Områder & enerett** (`/api/territorier`). Områder-fanen er nå **oversikt + styring**: godkjenn/avslå enerett-forespørsler, se hver partners aktive dekning og enerett, og fjern enerett ved mislighold. Du redigerer ikke dekning her — det styrer partneren selv i portalen. Ett innloggingspunkt, samme `ADMIN_TOKEN`, f.eks. `/admin`.

**API-er (ligger i `api/`-mappen — Vercel oppdager dem automatisk):**
- `lead.js` → tar imot kunde-lead, rekalkulerer score + leadverdi på serveren, lagrer i `leads`, varsler deg + (ved auto-tildeling) montøren. Sender også kunden en bekreftelses-e-post med en signert «be om ny vurdering»-lenke.
- `partner.js` → tar imot fagperson-interesse, lagrer i `partnere`, varsler deg.
- `leads.js` → admin: henter leads + partnere (GET), tildeler montør / setter status (PATCH). Ved tildeling varsles montøren med ta/takk-nei-knapper.
- `lead-svar.js` → offentlig, token-sikret: montørens svar fra e-posten (ta = `akseptert`, nei = `avslatt`).
- `andre-vurdering.js` → offentlig, HMAC-signert: **kundens «be om ny vurdering»**. Flytter leadet fra montør #1 til en annen egnet montør (aldri begge samtidig), regenererer svar-token (montør #1s gamle lenke dør), husker forrige montør i `tidligere_montorer`, varsler ny montør + sier fra til #1 at de ikke belastes. Maks én ny vurdering per lead; fyrer ikke i enerett-kommuner (eneretten ER eksklusiv).
- `_leadhjelp.js` → delt modul (understrek = ikke eget endepunkt): `finnMontor` (med ekskludering + enerett-regel), `varsleMontor`, `montorHtml`, og `signLead`/`verifyLead` for signerte kundelenker. Brukes av `lead.js`, `leads.js` og `andre-vurdering.js` — samler tidligere duplisert varsel-/matchekode ett sted.
- `territorier.js` → admin: GET (partnere + enerett + forespørsler), godkjenn/avslå forespørsler (oppretter enerett), og DELETE for å fjerne enerett. DB-en garanterer én enerett per fag+kommune. (PATCH dekning / manuell POST-tildeling finnes fortsatt i fila, men brukes ikke lenger fra admin — dekning settes nå av partneren via `portal/abonnement`.)

**Partnerportal (fagpersonens egen innlogging — `/portal`):**
- `Portal.jsx` — partnerens side. Passordfri innlogging (magisk lenke på e-post), så egen profil. Leads/abonnement/forbruk kommer som neste steg.
- `api/portal/_auth.js` — delt: signerer/leser sesjons-cookien (HMAC) og hasher magisk-token. Understrek = ikke et eget endepunkt.
- `api/portal/login.js` → POST `{epost}`: finner partner, lager engangs-token (30 min, kun hash lagres), sender lenke. Nøytralt svar uansett.
- `api/portal/verifiser.js` → GET `?token`: forbruker token (engangs), setter sesjons-cookie, sender til `/portal`.
- `api/portal/meg.js` → GET (krever sesjon): partnerens egne data. partner-id kommer alltid fra cookien, aldri fra forespørselen.
- `api/portal/leads.js` → GET partnerens egne leads; PATCH `{id, svar}` for ta/takk-nei. Eierskap sjekkes på serveren (montor = partnerens id, tilstand «tildelt»). *(Outputs-filen heter `portal-leads.js` for å ikke krasje med admin-`leads.js` — gi den navnet `leads.js` når du legger den i `api/portal/`.)*
- `api/portal/abonnement.js` → GET partnerens dekning + enerett + ventende forespørsler + ledighet; **PATCH `{dekning}` setter partnerens egne dekningskommuner** (kan ikke fjerne en kommune de har enerett i); POST `{kommune, fag|null, helkommune}` ber om enerett (varsler deg); DELETE trekker tilbake. *(Outputs-filen heter `portal-abonnement.js` — gi den navnet `abonnement.js` i `api/portal/`.)*
- `api/portal/forbruk.js` → GET denne månedens lead-kostnad (sum leadverdi for tatte leads) + enerett/mnd. *(Outputs-filen heter `portal-forbruk.js` — gi den navnet `forbruk.js` i `api/portal/`.)*
- `api/portal/logg-ut.js` → nuller cookien.

*Dekning vs. enerett:* dekning (hvor en partner får leads) styrer partneren selv i portalen — det er deres forretningsvalg, og prismodellen straffer overdreven dekning av seg selv. Enerett (eksklusivitet) går via forespørsel→godkjenning. Du beholder oversikt + «fjern enerett» som styringshendel.

*Andre vurdering (kundens utvei):* kunden får ett eksklusivt tilbud, men kan be om en ny vurdering hvis de ikke er fornøyd. Da flyttes leadet til en annen egnet montør — aldri to samtidig, så eksklusiviteten montøren betaler for er intakt. Den første montøren belastes ikke (forbruket følger gjeldende montør). Grenser: minst 24 t må ha gått siden leadet kom inn (gi #1 en sjanse), maks én ny vurdering, og i en kommune med enerett finnes ingen alternativ montør — funksjonen fyrer rett og slett ikke der. Krever benk (≥2 dekningspartnere) for å ha effekt.

*Samtykke-flyt for enerett:* partner ber om enerett i portalen → du får e-postvarsel → forespørselen dukker opp i admin (Områder & enerett) i en **Forespørsler**-boks øverst. Trykk **Godkjenn** → systemet legger kommunen til i dekningen (om nødvendig), oppretter enerett-raden (med `unique(fag,kommune)`-vernet) og markerer forespørselen godkjent; portalen viser den da som aktiv. **Avslå** lukker forespørselen. Ingen enerett oppstår uten at du handler.

**Dataflyt:**
```
Kunde  → App.jsx ──POST──► /api/lead ──► Supabase: leads ──► e-post til DEG
Fagperson → Fagfolk.jsx ──POST──► /api/partner ──► Supabase: partnere ──► e-post til DEG

DU → Admin.jsx ──GET──► /api/leads ──► liste
                ──PATCH (tildel)──► /api/leads ──► e-post til MONTØR (ta / takk nei)
Montør → klikker i e-post ──► /api/lead-svar ──► status: akseptert / avslatt
                                                  (avslått = tildelbar på nytt i Admin)
Kunde  → klikker i bekreftelse ──► /api/andre-vurdering ──► leadet flyttes til en
         annen montør (single-send bevart) ──► #1 belastes ikke, #2 varsles
```

---

## 2. Miljøvariabler (Vercel → Settings → Environment Variables)

| Variabel | Hva | Brukes av |
|---|---|---|
| `SUPABASE_URL` | Prosjekt-URL fra Supabase | alle API-er |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role-nøkkel (Settings → API). **Kun server.** | alle API-er |
| `RESEND_API_KEY` | API-nøkkel fra Resend | lead, partner, leads |
| `VARSEL_FRA` | Avsender, f.eks. `Eluma <onboarding@resend.dev>` til test | lead, partner, leads |
| `VARSEL_TIL` | Din e-post — mottar varsel om nye leads og partnere | lead, partner |
| `ADMIN_TOKEN` | Lang, tilfeldig streng = passord til admin-visningen | leads |
| `SITE_URL` | Domenet ditt, f.eks. `https://eluma.no` — bygger knapper i montør-e-post + portalens innloggingslenke | leads, portal |
| `PORTAL_SECRET` | Lang, tilfeldig streng = signerer partner-sesjonen *og* kundens «andre vurdering»-lenker. Bytter du den, logges partnere ut og gamle vurderings-lenker slutter å virke. | portal + lead |

Mangler `SITE_URL`, sendes montør-varselet fortsatt, bare uten ta/takk-nei-knapper.

---

## 3. Supabase-tabeller

Kjør én gang i SQL-editoren:

```sql
create table leads (
  id uuid default gen_random_uuid() primary key,
  opprettet timestamptz, kilde text,
  tjeneste text, omfang text, kommune text,
  navn text, mobil text, epost text, adresse text,
  beskrivelse text, eierforhold text, tidshorisont text,
  score numeric, intensjon text, kategori text, base_pris int, leadverdi int,
  samtykke_tidspunkt timestamptz, samtykke_versjon text,
  status text, montor text, svar_token text,
  tidligere_montorer jsonb default '[]'   -- montører som har hatt leadet (andre vurdering)
);

create table partnere (
  id uuid default gen_random_uuid() primary key,
  opprettet timestamptz, type text,
  firma text, navn text, mobil text, epost text,
  fag text, omrade text, melding text,
  samtykke_tidspunkt timestamptz, status text
);

-- Partner = bedrift (AS): org.nr for verifisering/fakturering
alter table partnere add column orgnr text;

-- Dekningsområder + enerett (territorier.js):
alter table partnere add column dekning jsonb default '[]'::jsonb;
update partnere set dekning = '[]'::jsonb where dekning is null;

create table enerett (
  id uuid default gen_random_uuid() primary key,
  opprettet timestamptz default now(),
  partner_id uuid references partnere(id) on delete cascade,
  firma text, fag text, kommune text, helkommune boolean default false,
  unique (fag, kommune)   -- garanti: kun én enerett per fag per kommune
);
```

```sql
-- Magiske innloggings-token for partnerportalen (kun hashen lagres)
create table partner_token (
  id uuid primary key default gen_random_uuid(),
  opprettet timestamptz default now(),
  partner_id uuid references partnere(id) on delete cascade,
  token_hash text not null,
  utlop timestamptz not null,
  brukt boolean default false
);
create index on partner_token (token_hash);

-- Enerett-forespørsler fra portalen (partner ber → du bekrefter). Bevisst UTEN unique-vern:
-- flere kan be om samme kommune. Enerett (med unique) oppstår først når du gir den i admin.
create table enerett_foresporsel (
  id uuid primary key default gen_random_uuid(),
  opprettet timestamptz default now(),
  partner_id uuid references partnere(id) on delete cascade,
  firma text,
  fag text,            -- enkelt fag, eller null ved helkommune
  kommune text,
  helkommune boolean default false,
  status text default 'forespurt'   -- forespurt | godkjent | avslatt
);
```

**C3 — utfallsfangst (kjør `supabase/utfall.sql`):** legger til `fornoyd`, `sluttpris` (bøtte), `testimonial`, `utfall_tidspunkt` på `leads`. Kunden fyller dem via `/api/utfall?id=&sig=` (signert lenke, hensikt `utfall`). Send lenken med `POST /api/utfall {send:true, id, admin_token:ADMIN_TOKEN}` (manuelt/cron). Kilden er **kunden**, ikke montøren — se `modell-beslutninger.md` C3.

Feltet `leads.montor` lagrer nå **partner-id** (ikke firmanavn) — robust mot navnebytte og navnekrasj; admin og portal viser firma ved å slå opp id-en. Har du gamle test-leads med firmanavn i `montor`, nullstill eller tildel dem på nytt.

Legger du inn partnere manuelt, husk `epost` — den trengs både for montør-varsel og for portal-innlogging (innlogging skjer på e-postadressen i `partnere.epost`).

---

## 4. Gå live — rekkefølge

1. **Supabase:** opprett prosjekt, kjør de to `create table`-snuttene. Kopier `SUPABASE_URL` og `service_role`-nøkkelen fra Settings → API.
2. **Resend:** opprett konto og API-nøkkel. Til test holder avsender `onboarding@resend.dev`; til produksjon, verifiser eget domene (da kan du sende fra `varsel@eluma.no` e.l.).
3. **Vercel:** legg inn alle sju miljøvariablene (Production, og gjerne Preview).
4. **Kode:** legg `lead.js`, `partner.js`, `leads.js`, `lead-svar.js`, `andre-vurdering.js`, `territorier.js` og den delte `_leadhjelp.js` i `api/`-mappen, og `_auth.js` + `login.js` + `verifiser.js` + `meg.js` + `logg-ut.js` + `leads.js` (fra `portal-leads.js`) + `abonnement.js` (fra `portal-abonnement.js`) + `forbruk.js` (fra `portal-forbruk.js`) i `api/portal/`. Monter `Admin.jsx` på `/admin` og `Portal.jsx` på `/portal`, og koble opp `App.jsx` + `Fagfolk.jsx` i ruteren.
5. **Skru på ekte sending:** sett `BRUK_EKTE_API = true` i **både** `App.jsx` (linje ~26) og `Fagfolk.jsx` (linje ~32). Til da kjører de i stub-modus uten å sende noe.
6. **Deploy** og kjør test-sjekklisten under.

---

## 5. Test-sjekkliste (ende til ende)

- [ ] Send inn et kunde-lead fra forsiden → ny rad i `leads` + varsel-e-post til deg, med riktig `leadverdi`.
- [ ] Send inn en fagperson fra Fagfolk-siden → ny rad i `partnere` + varsel til deg.
- [ ] Åpne `/admin`, logg inn med `ADMIN_TOKEN` → fanen **Leads** viser leads og nøkkeltall.
- [ ] Bytt til fanen **Områder & enerett** → partnere, dekning og enerett-styring vises.
- [ ] Åpne `/portal`, skriv inn e-posten til en partner i `partnere` → e-post med lenke kommer.
- [ ] Klikk lenken → du sendes til `/portal` og er innlogget. Lenken virker bare én gang.
- [ ] Tildel et lead til den partneren i admin → leadet vises under **Mine leads** i portalen.
- [ ] Trykk **Ta leadet** / **Takk nei** → status endres (akseptert/avslatt), og admin ser det samme.
- [ ] I portalens **Abonnement & områder**, be om enerett i en kommune → du får e-postvarsel.
- [ ] I admin (Områder & enerett) vises forespørselen i **Forespørsler**-boksen → trykk **Godkjenn** → enerett opprettes, og portalen viser den som aktiv.
- [ ] Portalens **Forbruk**-fane viser antall tatte leads + kostnad denne måneden og enerett/mnd.
- [ ] Tildel en montør (som har e-post) → «{firma} er varslet på e-post», og montøren får e-post med to knapper.
- [ ] Klikk **Ta leadet** → bekreftelsesside, status blir `akseptert` i admin.
- [ ] Klikk **Takk nei** på et annet lead → status `avslatt`, merknad «tildel en annen» i admin. Tildel på nytt → ny montør varsles.
- [ ] Klikk en brukt lenke om igjen → «Allerede besvart».

---

## 6. Sikkerhet

- `service_role`-nøkkelen er en master-nøkkel — kun i server-env, aldri i frontend-kode.
- `ADMIN_TOKEN`: bruk noe langt og tilfeldig.
- `svar_token` er per-lead og engangsbruk — forbrukes når montøren svarer, så lenken kan ikke gjenbrukes.

---

## 7. Bevisste forenklinger (kandidater for senere)

- **Omfordeling ved avslag er manuell** — du velger neste montør i admin. (Selve første-tildelingen er automatisk når det finnes en enerett- eller deknings-partner; det er omfordelingen *etter* et avslag som fortsatt er manuell.)
- **`montor` lagres som firmanavn**, og montør-oppslaget skjer på navn. Greit for en liten Agder-liste; bytt til `partnere.id` for å være helt robust mot like/endrede navn.
- **Prisene er oppstartshypoteser** — per-lead (`PRISBASE` i `App.jsx`), per-jobbtype og enerett per kommune (`PRISER` og `ENERETT_TIERS` i `Fagfolk.jsx`). Kalibrer mot ekte tall fra installatører — snittjobb, close-rate, dagens lead-kostnad, og hva enerett i en kommune er verdt — og start i nedre kant.
- **Enerett = dekningsområde + kommune-låsing.** Montøren mottar leads i hele dekningsområdet sitt uansett; enerett (per kommune, vektet etter størrelse) er der de betaler for å være eneste mottaker. Forutsetter kapasitet/respons — revideres.
- **Dobbel enerett er umulig.** `unique(fag, kommune)` i databasen + sperring i Områder-fanen gjør at to partnere aldri kan ha samme fag-enerett i samme kommune. Enerett kan kun gis i kommuner partneren dekker.
- **Holder = bedrift (AS).** Partner har org.nr (for verifisering/fakturering). Enerett henger på partner_id = AS-et.
- **Helkommune-lås (tilvalg).** Et AS kan låse alle fag i en kommune — kun mulig hvis ingen andre har enerett der. Lagres som én rad per fag med `helkommune=true`, så `unique(fag,kommune)` fortsatt garanterer at ingen andre kommer inn.
- **Auto-tildeling.** Varme og lunkne leads (score ≥ 0.4) auto-tildeles ved innkomst i `lead.js` via `finnMontor`: først til **enerett-holderen** for (tjeneste, kommune); finnes ingen, til en **partner som dekker kommunen** for faget. Dekker flere samme fag+kommune, velges den med færrest leads denne måneden (eldste partner som tie-break). Montøren varsles direkte med ta/takk-nei. Kalde leads (score < 0.4), og leads uten verken enerett-holder eller deknings-partner, venter på manuell tildeling (med ett-klikks forslag) i admin. `lead.js` gjenbruker varsel-hjelperne fra `leads.js` (kopiert, så de holdes like).
- **«Dine alene» forutsetter single-send i drift:** aldri samme lead til flere samtidig. Avslags-flyten er det praktiske håndtaket for å rute videre.
