# Eluma — solcelle-leadmotor for Agder

Lokal solcelle-**kvalifiseringsmotor** for Agder: hver besøkende forlater enten som en
kvalifisert, eksklusiv lead — eller med et ærlig Enova-estimat som bygger tillit. Ikke en
sammenligningsside. Første betalende kunde: **Agder Tak** (Jim Roger Pettersen).

**Stack:** Vite + React → Vercel · Supabase (database) · Resend (e-post). Ingen npm-avhengigheter
i API-ene — rene `fetch`-kall. Samme pipeline som noabove.no / dvel.no.

## Dokumentasjon (kanonisk)

- [`docs/agder-leadmotor-spesifikasjon.md`](docs/agder-leadmotor-spesifikasjon.md) — byggespesifikasjon: lead-objektet, trakt, estimatmotor, score/segment, akseptkriterier
- [`docs/eluma-drift-oppsett.md`](docs/eluma-drift-oppsett.md) — **drift**: filene, env-variabler, Supabase-skjema, go-live-rekkefølge, test-sjekkliste
- [`docs/eluma-installatortest.md`](docs/eluma-installatortest.md) · [`docs/eluma-valideringsark.md`](docs/eluma-valideringsark.md)

## Struktur

```
api/                    Vercel serverless (Vercel oppdager automatisk)
  lead.js               kunde-lead: score/segment, lagre, varsle, auto-tildel
  partner.js            fagperson-interesse
  leads.js             admin: hent leads + tildel (ADMIN_TOKEN)
  lead-svar.js          montørens ta/takk-nei fra e-post (token-sikret)
  andre-vurdering.js    kundens "be om ny vurdering" (HMAC-signert)
  territorier.js        admin: enerett godkjenn/avslå/fjern
  _leadhjelp.js         delt: finnMontor, varsleMontor, signLead/verifyLead
  portal/               partnerportalen (/portal)
    _auth.js            delt: sesjons-cookie (HMAC) + magisk-token-hash
    login.js verifiser.js meg.js logg-ut.js
    leads.js abonnement.js forbruk.js
src/                    React-sider
  App.jsx               forside + kvalifiseringstrakt (kunde)
  Fagfolk.jsx           fagfolk/installatør-side
  Admin.jsx             intern admin (/admin): Leads + Områder & enerett
  Portal.jsx            partnerens innlogging + profil (/portal)
docs/                   spesifikasjon + drift
```

Miljøvariabler: se [`.env.example`](.env.example) (8 stk). Supabase-skjema: `docs/eluma-drift-oppsett.md` §3.

## Kjøre lokalt

```
npm install
npm run dev        # Vite dev-server
npm run build      # produksjonsbygg → dist/ (verifisert: bygger rent)
```

Rutene monteres i `src/main.jsx`: `/` (App), `/fagfolk` (Fagfolk), `/admin` (Admin),
`/portal` (Portal). `vercel.json` sender alle ikke-`/api`-ruter til `index.html` (SPA).

> **Merk:** score/estimat-logikken ligger **inline i `App.jsx`** (funksjonen `beregnScore`
> + konstantene der oppe), ikke i separate `src/estimat/`- eller `src/steg/`-filer som den
> opprinnelige spec-en §3/§7 skisserte. Hver side injiserer sin egen `<style>`.

## Status — gjenstår før deploy

Byggeskallet er på plass og bygger rent. Det som gjenstår for en faktisk live-versjon:

- [ ] Skru på ekte sending: `BRUK_EKTE_API = true` i `App.jsx` (~l.26) og `Fagfolk.jsx` (~l.37) — kjører i stub-modus til da
- [ ] Supabase: opprett prosjekt + kjør `create table`-snuttene (`docs/eluma-drift-oppsett.md` §3)
- [ ] Vercel: sett de 8 env-variablene (`.env.example`) + deploy
- [ ] `public/` — OG-delingsbilde, logo, caser-bilder (referanser)
- [x] ~~Personvern: egen `/personvern`-rute/side~~ — levert (`src/Personvern.jsx`, lenket fra samtykke i App + Fagfolk). Fyll inn `[ ]`-plassholderne (org.nr, adresse, lagringstid) før launch.
- [ ] Kalibrer estimat- og prishypotesene mot Agder Taks faktiske tall (spec §3, drift §7)

Go-live-rekkefølge og ende-til-ende-test: `docs/eluma-drift-oppsett.md` §4–5.
