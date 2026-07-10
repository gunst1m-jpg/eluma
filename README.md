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

## Status — mangler før deploy

Dette repoet inneholder **API-laget + side-komponentene + docs** (eksportert fra cowork).
Følgende byggeskall er **ikke** her ennå og må lages/hentes før det kan deployes:

- [ ] Vite-skall: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx` + ruter (monter `App`/`Fagfolk`/`Admin` på `/admin`/`Portal` på `/portal`)
- [ ] `src/steg/` — ett komponent per skjemasteg (referert i spec §7)
- [ ] `src/estimat/konstanter.js` + `src/estimat/beregn.js` — deterministisk estimatmotor (spec §3)
- [ ] `src/personvern.jsx` + `public/` (OG-bilde, logo, caser)
- [ ] Skru på ekte sending: `BRUK_EKTE_API = true` i `App.jsx` (~l.26) og `Fagfolk.jsx` (~l.32)
- [ ] `vercel.json` + Supabase-tabeller kjørt + de 8 env-variablene satt i Vercel

Go-live-rekkefølge og ende-til-ende-test: `docs/eluma-drift-oppsett.md` §4–5.
