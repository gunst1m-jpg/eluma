# Eluma — kalibrering med installatører

Et samtaleark til 2–3 uformelle prat med lokale fagfolk i Agder (helst grønn/elektro). Målet er **ikke å selge** — det er å lære hva et godt lead er verdt for dem, og om eksklusivitet/enerett er verdt å betale for. Lytt mer enn du snakker. Få tall på bordet *før* du nevner dine egne.

Bruk én utfylt rad per installatør (skjemaet nederst), så blir de sammenlignbare.

---

## Slik rammer du samtalen

> «Jeg bygger en lokal tjeneste som sender ferdig kvalifiserte kundehenvendelser til *én* fagperson om gangen — ikke fem som på Mittanbud. Jeg prøver å forstå hva som faktisk er verdt noe for dere før jeg setter pris. Kan jeg stjele 20 minutter og spørre om hvordan dere får jobber i dag?»

Ærlig, nysgjerrig, ingen ferdig pris. La dem snakke om frustrasjonene sine med dagens kanaler — der ligger gullet.

---

## Spørsmålene

Hver bolk sier *hva den kalibrerer*. Tallet i parentes er **dagens hypotese i modellen** — det skal du holde for deg selv til de har svart, ellers ankrer du dem.

### 1. Økonomien deres (kalibrerer pristak per lead)
- Hva er en typisk jobb verdt for dere i kroner — for solceller, lader, elektrikerjobb?
- Av 10 tilbud dere gir, hvor mange blir til jobb? (lukkerate)
- Grovt — hva sitter dere igjen med (margin) på en sånn jobb?

*Hvorfor:* jobbverdi × lukkerate = hva ett godt lead er verdt for dem. Prisen på et lead må ligge godt under det.

### 2. Slik får de jobber i dag (kalibrerer betalingsvilje + konkurranse)
- Hvor kommer jobbene fra nå? (Mittanbud, Bytt, anbefaling, egen markedsføring …)
- Betaler dere for leads i dag? Hva koster ett lead — og hva synes dere om det?
- Hva er det verste med måten dere får leads på nå?

*Hvorfor:* det de betaler i dag er referansen din. «Delte leads er irriterende» bekrefter kilen (eksklusivitet).

### 3. Reaksjon på modellen (validerer kilen)
Forklar kort: lokalt, ferdig kvalifisert, **ett lead til én fagperson** — aldri auksjonert.
- Ville dette vært bedre enn det dere bruker nå? Hvorfor / hvorfor ikke?
- Hva ville gjort dere trygge på at et lead faktisk er ekte og varmt?

*Hvorfor:* tester om «eksklusivt + lokalt + kvalifisert» faktisk treffer, eller om det bare høres fint ut.

### 4. Betalingsvilje per lead (kalibrerer `PRISER`)
Spør *åpent* først: «Hva ville du betalt for ett eksklusivt, kvalifisert lead i denne kategorien?» — så sammenlign med hypotesen.

| Kategori | Hypotese i dag | Hva de sier |
|---|---|---|
| Solceller | 800 kr | |
| Batteri | 700 kr | |
| Elbillader | 450 kr | |
| Elektriker – større | 450 kr | |
| Smarthus | 350 kr | |
| Elektriker – mindre / service | 195 kr | |

*Hvorfor:* dette er nøyaktig tallene i prismodellen. Ligger svarene konsekvent over eller under, justerer du `PRISBASE` (kunde) og `PRISER` (fagfolk).

### 5. Enerett (kalibrerer `ENERETT_TIERS`)
- Hvis du var den *eneste* Eluma-partneren for ditt fag i din kommune — verdt en fast månedspris?
- Hva ville du betalt per måned for det i din kommune?

| Kommunestørrelse | Hypotese i dag | Hva de sier |
|---|---|---|
| Stor (Kristiansand, Arendal) | 990 kr/mnd | |
| Middels (Grimstad, Lillesand, Vennesla, Lindesnes) | 590 kr/mnd | |
| Liten (distrikt) | 290 kr/mnd | |

*Hvorfor:* svarene setter de tre enerett-satsene. Hvis ingen vil betale fast, er enerett heller en per-lead-rabatt enn et abonnement — viktig å vite tidlig.

### 6. Kapasitet (kalibrerer volum)
- Hvor mange nye jobber i denne typen kan dere faktisk ta unna i måneden?

*Hvorfor:* sier hvor mange leads én partner tåler før du trenger flere i samme område — og om enerett er realistisk for dem.

### 7. Responstid (kalibrerer score-tersklene)
- Hvor raskt ringer dere normalt en fersk henvendelse?
- Hvor mye dårligere er et lead som er en uke gammelt vs. ett som kom i dag?

*Hvorfor:* bekrefter intensjons-vektingen (varm ×1 / lunken ×0,7 / kald ×0,5) og hvor fort et lead bør sendes ut.

---

## Fang tallene (én rad per installatør)

| | Installatør A | Installatør B | Installatør C |
|---|---|---|---|
| Firma / fag | | | |
| Typisk jobbverdi | | | |
| Lukkerate | | | |
| Får leads fra i dag | | | |
| Betaler per lead i dag | | | |
| Vil betale per lead (varmt) | | | |
| Enerett verdt fast pris? (ja/nei) | | | |
| Enerett kr/mnd i sin kommune | | | |
| Jobber/mnd de kan ta | | | |
| Ringer ferskt lead innen | | | |
| Reaksjon på «ett lead, eksklusivt» | | | |

---

## Slik leser du svarene tilbake i modellen

- **Per-lead-svarene (bolk 4)** → juster `PRISBASE` i `App.jsx` og `PRISER` i `Fagfolk.jsx`. Sikt på en pris som er en liten brøkdel av (jobbverdi × lukkerate), så regnestykket åpenbart lønner seg for dem.
- **Enerett-svarene (bolk 5)** → sett `ENERETT_TIERS` i `Fagfolk.jsx`. Vil ingen binde seg månedlig: dropp abonnementet i v1, gjør enerett til en per-lead-rabatt i stedet.
- **Responstid (bolk 7)** → behold eller juster terskelen `score ≥ 0,4` for auto-tildeling i `lead.js`.
- **Kapasitet (bolk 6)** → avgjør om du tør love enerett i et område, eller trenger to partnere per fag der.

Start lavt på alle priser. Det er lettere å sette opp prisen senere enn å ta den ned — og i starten kjøper du deg tillit og data, ikke margin.

## Fallgruver
- **Ikke nevn din pris først.** Spør hva *de* ville betalt, så sammenlign i stillhet.
- **Høflighet lyver.** «Ja, høres bra ut» er ikke en forpliktelse. Spør: «ville du lagt inn kortet i dag for å sikre kommunen din?» — handling, ikke ros.
- **Skille ekte fra hyggelig.** Den som klager høyest på dagens leads er ofte den varmeste kunden din.
- **Tre er nok til å se mønster.** Spriker svarene vilt, snakk med to til før du rører tallene.
