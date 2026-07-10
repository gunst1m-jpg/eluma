-- C3 — utfallsfangst fra kunden (kjør én gang i Supabase SQL-editoren).
-- Kilden er kunden (det inhabile vitnet), ikke montøren. Låser opp anker (C2), tilsyn (C4) og referanser.
-- Bøtter, ikke kroner: sluttpris ∈ {under-15k, 15-25k, 25-40k, over-40k}.

alter table leads add column if not exists fornoyd text;             -- 'ja' | 'nei' | null
alter table leads add column if not exists sluttpris text;           -- prisbøtte (se over) | null
alter table leads add column if not exists testimonial text;         -- valgfri kundetekst (maks 600 tegn) | null
alter table leads add column if not exists utfall_tidspunkt timestamptz;  -- satt når kunden svarer (idempotens-vakt)
