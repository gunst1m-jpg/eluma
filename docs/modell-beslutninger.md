# Eluma — modell-beslutninger (v1)

Destillat av strategidiskusjonen 2026-07-10. **Status: RATIFISERT 2026-07-10** (A1–F, alle
punkter). Dette dokumentet er ment å styre koden — endrer vi modellen, oppdateres dette
først (samme disiplin som `agder-leadmotor-spesifikasjon.md`).

> Endrer noe av dette senere: sett punktet til «Revidert <dato>» med begrunnelse, ikke slett.

---

## A. Posisjonering

**A1. Produktet er *fravær av anger*, ikke *flere tilbud*.**
Ett tilbud + synlig prisanker + en ekte, ubrukt nødutgang. Fjerner angeren uten å legge til
støyen av en auksjon. Dette er posisjonen ingen etablert kan kopiere uten å rive egen modell.

**A2. Lojaliteten er strukturelt mot kunden.**
Kundens tillit er formuen; montør-pengene er avkastningen på den. Gjøres overlevbar av: mekaniske
regler (ikke skjønn), betinget inntekt (A3/B1), og konsentrasjons-tilsyn (E1). Aldri en erklæring
— alltid en struktur.

---

## B. Enerett → førsterett

**B1. Absolutt enerett erstattes av FØRSTERETT.** *(endrer bygget maskineri)*
Montøren får hvert lead i kommunen *først*; svarer de ikke innen X timer eller takker nei, faller
det til benken. For en responsiv montør ~identisk med eksklusivitet — men benken lever, så tilsyn
har sammenligningsdata, andrevurdering har et sted å gå, og en treg/dårlig montør lekker leads og
selvkorrigerer. **Betinget og fornybar** (pakt, ikke salg), **segment-avgrenset** (f.eks. førsterett
på `takbytte`-solceller, ikke på alt i kommunen).
*Hvorfor:* absolutt monopol korrumperer løftet, dreper konkurransen som er moaten, konsentrerer
sprengradius + kapring — og genererte hvert harde problem i diskusjonen.
*Rører:* `territorier.js`, `enerett`-tabellene, `portal/abonnement.js`, `Fagfolk.jsx` (`ENERETT_TIERS`),
`andre-vurdering.js` (benk finnes alltid nå).

**B2. Vilkårene skrives inn fra dag én (pre-commit før skala).**
Førsterett-pakten + de mekaniske reglene ligger i montøravtalen Jim Roger signerer først — mens det
er gratis, fordi det ikke finnes noen å føre tilsyn med ennå. Innført senere leses det som svik.

**B3. Ingen enerett/førsterett i launch.**
Kjerneproduktet (ett eksklusivt per-lead) står støtt alene. Førsterett introduseres først når du
har en benk (≥2 partnere) og data.

---

## C. Anker, estimat og data

**C1. Gjenreis et lett per-vertikal estimat i trakten.**
Tjener to ting: resiprositet (verdi før vi spør om kontakt — som pivoten mistet) *og* N=0-gulvet i
anker-stigen. Start statisk/enkelt; ikke full kalkulator før du vet statiske spenn ikke holder.
*Rører:* `App.jsx` (trakt-steg + visning).

**C2. Ankeret er REGIONALT som default (Agder), ikke per kommune.**
Kjernekostnaden er regional; kommune-anker er falsk presisjon. Gå finere kun der det er nok N *og*
en ekte lokal delta. Stige: estimatmodell (N=0) → region → delregion → kommune (stor N), «lån styrke»
/ fall opp ett hakk under terskel.

**C3. Fang `sluttpris` — fra kunden, ikke montøren.** *(én DB-kolonne)*
Kunden er det inhabile vitnet; montøren er parten som skal overvåkes. Ett trykk, i bøtter
(under 15k / 15–25k / …), via eksisterende `signLead`/`verifyLead` + status-trigger (befaring → +N uker).
Samme ping høster også *testimonial* (fyller referanse-gapet). Én mekanisme → anker + tilsyn + social proof.
*Rører:* `leads`-skjema (+`sluttpris`), nytt lite endepunkt som gjenbruker `_leadhjelp.js`.

**C4. Tilsyn baseres på fag × størrelse regionalt + avstandspåslag.**
Ikke samme-kommune-naboer. Median/MAD (ikke snitt/standardavvik) på små, skjeve utvalg. Avstand er
et modellert påslag, ikke støy. Tilsyn er *komparativt* → virker tidlig; offentlig anker er *absolutt*
→ krever større N. Lås derfor opp tilsyn først, publisert anker senere.

---

## D. Andrevurdering

**D1. Del nødutgangen etter benk-tetthet.**
Tett kommune (benk): menneskelig re-tildeling til ekte lokal konkurrent. Tynn kommune (ingen benk):
«andrevurderingen» *er* ankeret gjengitt som dom — ingen reise, ingen inhabilitet. Aldri et
konkurrerende *bud* på tvers av kommunegrenser som default (det hvitvasker den lokale prisen).
*Rører:* `andre-vurdering.js`, `_leadhjelp.js` (`finnMontor`).

**D2. Ekte kryssebud kun som opt-in.**
Reise forhåndsrammes som egen, forventet linje («~4k reise oppå jobben; jobben bør ligge rundt
[anker]») og gjøres til et eksplisitt valg. Reisepåslaget blir et *filter* som selvselekterer —
bare ekte tvil / store jobber betaler det.

**D3. Synlig rettighet på storjobb, ikke skjult e-post-fallback.**
Solceller/batteri/større: eksplisitt «du kan be om uavhengig vurdering — ett klikk, gratis» i
kundeløpet. Behold vaktene (24 t, maks én).

**D4. Dommens publikum styres av (førsterett × N), og er alltid mekanisk.**
Kundevendt dom kun med solid N + konkurransekontekst. Intern-bare (stille handling) i tynne
førsterett-kommuner — der er en kundevendt «monopolisten din er dyr» både mest eksplosiv og minst
statistisk forsvarlig. Metoden er publisert og forhåndsforpliktet uansett.

---

## E. Integritet / styring

**E1. Konsentrasjon er et førsteklasses mål.**
Spor hver montørs andel av inntekt/leads like bevisst som omsetningen. Kapring — ikke konfrontasjon
— er dødsårsaken. Rødt flagg over en terskel. *(Data finnes: `leadverdi` per montør.)*

**E2. Publiser metode + aggregert disiplin.**
Anker-metoden og «så mange førsterett trukket ved brudd» gjør lojaliteten *verifiserbar*, ikke
påstått. Individuelle montørtall holdes private (transparens er en skrue, ikke en bryter).

---

## F. Launch-omfang

**Med i launch:** ett eksklusivt per-lead (single-send) · kvalifiseringstrakt + regionalt estimat/anker
· auto-tildeling · admin · portal · andrevurdering med vakter. Pluss dagens README-gap: `BRUK_EKTE_API`,
Supabase-tabeller, 8 env-vars, `public/`, `/personvern`-rute.

**Bevisst UTE av launch:** all enerett/førsterett (B3) · kundevendt pris-dom · «maks 2 tilbud» ·
automatisk kryssekommune-re-tildeling · full estimat-kalkulator (start med statiske regionale spenn).

---

## Kodeendringer som følger (når ratifisert)
1. ✅ **C3 LEVERT (2026-07-10):** `supabase/utfall.sql` (kolonner) + `api/utfall.js` (kunde-endepunkt, gjenbruker `signPurpose`/`verifyPurpose`). Gjenstår: kjør SQL i Supabase, og automatiser utsending (Vercel Cron: befaring → +N uker) — nå manuelt via admin-POST.
2. ✅ **C1/C2 LEVERT (2026-07-10):** `api/anker.js` (fallback-stige: faktiske Agder-jobber → estimat-gulv; robust bøtte-IQR; region default, kommune kun ved N≥8) + `<Anker>` i `App.jsx` (vist øverst i kontakt-steget = resiprositet før vi spør). Seed-tallene er oppstartshypoteser — kalibreres når C3-dataen kommer inn.
3. ✅ **B1 LEVERT (2026-07-10):** `finnMontor` faller nå til benken når førsterett-holderen er ekskludert (før: dead-end). Avslag (`lead-svar` «nei») og timeout (`api/forsterett-timeout.js`) omfordeler automatisk via delt `omfordelTilBenk`. `enerett`-tabellen backer førsterett (navn beholdt, rename utsatt). Cron bygget men ikke aktivert (B3). B2 (fornybar pakt i montøravtale) er terms, ikke kode. Montør-vendt historie i `Fagfolk.jsx` oppdatert fra absolutt enerett → førsterett (per-lead-eksklusivitet «dine alene» beholdt; interne navn `ENERETT_TIERS` urørt).
4. ✅ **D1 LEVERT (2026-07-10):** `andre-vurdering.js` — tett kommune (benk) → menneskelig re-tildeling (som før, nå nådd via B1); tynn kommune (ingen benk) → ankeret som nøytral målestokk (`beregnAnker`, delt fra `anker.js`), ikke blindvei. Ingen montørnavn/dom vises (D4-trygt); kunden sammenligner selv og kan flagge tilbake (intern tilsyn).
5. Konsentrasjons- og metode-rapport (E1/E2) — senere, når det finnes data.
