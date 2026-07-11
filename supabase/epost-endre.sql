-- Verifisert e-post-endring i partnerportalen (kjør én gang i Supabase SQL-editoren).
-- Partneren ber om ny e-post → bekreftelseslenke sendes til DEN NYE adressen → e-posten byttes
-- først når lenken klikkes. Egen tabell (ikke partner_token) så en endrings-token aldri kan brukes
-- til innlogging, og omvendt. Bruk: ny ansvarlig i firmaet overtar leads uten å ta kontakt med oss.
create table epost_endring (
  id uuid primary key default gen_random_uuid(),
  opprettet timestamptz default now(),
  partner_id uuid references partnere(id) on delete cascade,
  ny_epost text not null,
  token_hash text not null,      -- kun sha256-hashen lagres; rå token havner kun i e-postlenken
  utlop timestamptz not null,    -- 30 min
  brukt boolean default false    -- engangsbruk
);
create index on epost_endring (token_hash);
