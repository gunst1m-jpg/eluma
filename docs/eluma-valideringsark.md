# Eluma — Valideringsark
### Det ene som må stemme før du skalerer

**Hypotesen:** Det finnes nok intensjon i Agder til at kvalifiserte energileads kan genereres til en CAC lavere enn det de er verdt — *og* installatøren lukker nok av dem til å betale for dem igjen og igjen.

To tester, **samtidig**, i 3–4 uker. Den ene mater den andre: du kan ikke lese close rate uten ekte leads, og ikke CAC uten en ekte funnel.

---

## Regnestykket — det alt koker ned til

> **CAC  <  Leadverdi  <  Jobbmargin × Close rate**

- **Venstre side** = din margin. Du må skaffe leadet billigere enn du selger det.
- **Høyre side** = installatørens bærekraft. De betaler mindre enn forventet verdi (margin × andel som lukkes) — ellers slutter de å kjøpe.
- Treffer du begge: forretning. Bommer på venstre: du taper penger. Bommer på høyre: du mister montører.

**Per fag — bytt eksempeltallene med ekte tall:**

| Fag | Leadverdi (din pris) | Antatt jobbmargin | Close rate som trengs* | Mål-CAC |
|---|---|---|---|---|
| Elbillader | 450 | ~4 000 | > 11 % | < 250 |
| Smart strømstyring | 550 | ~6 000 | > 9 % | < 300 |
| Batteri | 700 | ~20 000 | > 4 % | < 450 |
| Solceller | 800 | ~30 000 | > 3 % | < 500 |

\*Close rate som trengs = Leadverdi ÷ jobbmargin. Over dette er leadet lønnsomt for montøren.

**Innsikt allerede her:** høyverdi-fag (sol/batteri) krever latterlig lav close rate for å være verdt det for montøren — men leads der er dyrere å skaffe og markedet er svakere. Elbillader trenger ~11 % close (lett) og har billigst, mest stabil trafikk. *Det er derfor du leder med elbil/elektrisk.*

---

## Test A — Ads (måler CAC + budskap)

- **Budsjett:** 3 000–5 000 kr over 3–4 uker. Nok til et signal, lite nok til å ikke svi.
- **Søkeord (smale, lokale, høy intensjon):** «elbillader kristiansand», «solceller kristiansand», «batteri til hus kristiansand», «elektriker kristiansand».
- **Lander på:** den enkle funnelen (App.jsx).
- **Budskapstest (A/B):** Variant 1 «Få hjelp med [X]» (nøytral) mot Variant 2 «Én vurdert lokal fagperson — ingen anbudsmas». Variant 2 tester enkeltmontør-vinkelen direkte.
- **Du måler:** kr brukt ÷ kvalifiserte leads = **CAC per fag**, + hvilken variant som konverterer.

## Test B — Concierge-løkka (måler close rate + betalingsvilje)

- **Hvem:** 2–3 installatører i de leadende fagene (bruk `eluma-installatortest.md`).
- **Gjør:** rut de ekte Ads-leadene til dem manuelt, følg hvert lead til utfall.
- **Du måler:** sendt → kontaktet → tilbud → vunnet = **close rate**, + hva de faktisk vil betale.

---

## De fire tallene du jakter (fyll inn)

| Spørsmål | Mål | Funn |
|---|---|---|
| Hva koster et godt lead? | CAC < leadverdi (per fag) | |
| Hvor mange per uke under smerteterskel? | ≥ ___ /uke til mål-CAC | |
| Faktisk close rate? | over «trengs»-raden over | |
| Lavest CAC / høyest margin? | rangér fagene | |

## Driftstall å logge ukentlig (markedsplass-drepere)

| Uke | Ads-kr | Leads | CAC | Tid-til-kontakt | Kontakt-rate | Vunnet | Close rate |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |

*Tid-til-kontakt:* ringer montøren kunden innen et par timer? Et glimrende lead som ligger i fem dager konverterer elendig — logg det.

---

## Go / pivot etter 3–4 uker

- **GO** hvis minst ett fag viser: CAC < leadverdi, close rate over «trengs»-terskelen, og du klarer noen leads/uke uten å sprenge mål-CAC. Da skalerer du *det* faget, i *den* kommunen — ikke alt på en gang.
- **PIVOT** hvis CAC ligger over leadverdi overalt: etterspørselen er for dyr via søk. Flytt fokus til problem-eierskap (innhold/SEO, 6–12 mnd) og distribusjonspartnere.
- **Ærlig kill-linje:** klarer ingen kanal å levere leads under det de er verdt, er det ikke en justering — det er konseptet som ikke bærer. Bedre å vite det for 4 000 kr enn for 400 000.

## Parallelt (lav innsats, høy oppside)

Start 1–2 samtaler med distribusjonspartnere med én gang — de er trege å lande, så tidlig start lønner seg. Lokalt: Å Energi (Kristiansand), et regionalt boligbyggelag. Nesten null CAC hvis det treffer — men det er vollgraven, ikke valideringen. Ikke vent på den.
