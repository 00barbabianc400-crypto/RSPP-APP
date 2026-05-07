-- RSPP Supabase schema
-- Core domain migrated from SharePoint lists

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_profilo_enum') then
    create type public.tipo_profilo_enum as enum ('Standard', 'Custom');
  end if;
  if not exists (select 1 from pg_type where typname = 'livello_rischio_enum') then
    create type public.livello_rischio_enum as enum ('Trascurabile', 'Basso', 'Medio', 'Alto');
  end if;
  if not exists (select 1 from pg_type where typname = 'stato_valutazione_enum') then
    create type public.stato_valutazione_enum as enum ('Trascurabile', 'Presente');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_testo_enum') then
    create type public.tipo_testo_enum as enum ('Standard', 'Custom');
  end if;
  if not exists (select 1 from pg_type where typname = 'esito_rilevamento_enum') then
    create type public.esito_rilevamento_enum as enum ('Conforme', 'Non conforme', 'Da verificare');
  end if;
  if not exists (select 1 from pg_type where typname = 'priorita_intervento_enum') then
    create type public.priorita_intervento_enum as enum ('Immediato', 'Breve termine', 'Medio termine', 'Lungo termine');
  end if;
  if not exists (select 1 from pg_type where typname = 'app_role_enum') then
    create type public.app_role_enum as enum ('admin', 'rspp', 'editor', 'viewer');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role_enum not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.catalogo_rischi (
  id uuid primary key default gen_random_uuid(),
  id_rischio text not null unique check (char_length(id_rischio) between 2 and 8),
  nome_rischio text not null,
  categoria text not null,
  macro_categoria text not null,
  titolo_normativo text,
  normativa_rif text,
  descrizione text,
  attivo boolean not null default true,
  ordine integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tipi_rilevamento (
  id uuid primary key default gen_random_uuid(),
  nome_tipo text not null unique,
  unita_misura text not null,
  limite_legge_default numeric(12, 3),
  normativa_rif text,
  rischio_collegato_id uuid references public.catalogo_rischi(id) on delete set null,
  attivo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.aziende (
  id uuid primary key default gen_random_uuid(),
  ragione_sociale text not null,
  partita_iva text not null unique check (char_length(partita_iva) = 11),
  codice_fiscale text,
  sede_operativa text not null,
  sede_legale text,
  oggetto_sociale text,
  iscrizione_cciaa text,
  codice_ateco text not null,
  macrosettore_rischio text not null check (macrosettore_rischio in ('Basso', 'Medio', 'Alto')),
  posizione_inail text,
  ccnl_applicato text,
  datore_lavoro text not null,
  data_nomina_ddl date,
  rspp text not null,
  data_nomina_rspp date,
  medico_competente text,
  rls text,
  data_elez_rls date,
  preposti text,
  addetto_primo_soccorso text,
  addetto_antincendio text,
  num_dipendenti integer not null check (num_dipendenti >= 0),
  num_dipendenti_donne integer check (num_dipendenti_donne >= 0),
  num_dipendenti_stranieri integer check (num_dipendenti_stranieri >= 0),
  num_dipendenti_temporanei integer check (num_dipendenti_temporanei >= 0),
  turni_notturni boolean not null default false,
  smart_working boolean not null default false,
  descrizione_sito text,
  numero_prog text,
  edizione integer,
  revisione integer,
  data_ultima_valutazione date,
  data_prossima_revisione date,
  logo_azienda_url text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profili (
  id uuid primary key default gen_random_uuid(),
  nome_profilo text not null,
  tipo_personale text not null,
  descrizione_attivita text,
  tipo_profilo public.tipo_profilo_enum not null default 'Standard',
  misure_gen_generali text,
  dpi_base text,
  dpi_collettivi text,
  protocollo_sor_san boolean,
  attivo boolean not null default true,
  azienda_proprietaria_id uuid references public.aziende(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (nome_profilo, tipo_profilo, azienda_proprietaria_id)
);

create table if not exists public.aziende_profili (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende(id) on delete cascade,
  profilo_id uuid not null references public.profili(id) on delete cascade,
  data_associazione date not null default current_date,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (azienda_id, profilo_id)
);

create table if not exists public.testi_dvr (
  id uuid primary key default gen_random_uuid(),
  titolo_testo text not null,
  rischio_id uuid not null references public.catalogo_rischi(id) on delete restrict,
  livello public.livello_rischio_enum not null check (livello <> 'Trascurabile'),
  testo_valutazione text not null,
  misure_in_atto text,
  misure_programmate text,
  priorita_intervento public.priorita_intervento_enum,
  tipo_testo public.tipo_testo_enum not null default 'Standard',
  azienda_origine_id uuid references public.aziende(id) on delete set null,
  autore_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.valutazioni_rischio (
  id uuid primary key default gen_random_uuid(),
  chiave_valutazione text not null unique,
  azienda_id uuid not null references public.aziende(id) on delete cascade,
  profilo_id uuid not null references public.profili(id) on delete cascade,
  rischio_id uuid not null references public.catalogo_rischi(id) on delete cascade,
  rischio_associato boolean not null default true,
  stato public.stato_valutazione_enum not null default 'Trascurabile',
  probabilita integer check (probabilita between 1 and 4),
  gravita integer check (gravita between 1 and 4),
  indice_rischio integer check (indice_rischio between 1 and 16),
  livello_rischio public.livello_rischio_enum not null default 'Trascurabile',
  testo_dvr_id uuid references public.testi_dvr(id) on delete set null,
  testo_valutazione text,
  data_valutazione date,
  valutatore_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (azienda_id, profilo_id, rischio_id)
);

create table if not exists public.rilevamenti_ambientali (
  id uuid primary key default gen_random_uuid(),
  descrizione_rilevamento text not null,
  azienda_id uuid not null references public.aziende(id) on delete cascade,
  tipo_rilevamento_id uuid not null references public.tipi_rilevamento(id) on delete restrict,
  valore_misurato numeric(12, 3) not null,
  unita_misura text not null,
  limite_legge_applicato numeric(12, 3),
  esito public.esito_rilevamento_enum not null,
  zona text,
  data_rilevamento timestamptz not null,
  strumento text,
  laboratorio_esterno text,
  note text,
  allegato_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Catalogo documentazione producibile per DVR
create table if not exists public.documenti_catalogo (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,
  categoria text not null,
  nome text not null,
  descrizione text,
  default_attivo boolean not null default false,
  attivo boolean not null default true,
  ordine integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Selezione documenti per azienda
create table if not exists public.aziende_documenti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende(id) on delete cascade,
  documento_id uuid not null references public.documenti_catalogo(id) on delete cascade,
  selezionato boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (azienda_id, documento_id)
);

create index if not exists idx_catalogo_rischi_attivo on public.catalogo_rischi(attivo);
create index if not exists idx_tipi_rilevamento_attivo on public.tipi_rilevamento(attivo);
create index if not exists idx_aziende_partita_iva on public.aziende(partita_iva);
create index if not exists idx_profili_tipo on public.profili(tipo_profilo);
create index if not exists idx_aziende_profili_azienda on public.aziende_profili(azienda_id);
create index if not exists idx_aziende_profili_profilo on public.aziende_profili(profilo_id);
create index if not exists idx_testi_dvr_rischio_livello on public.testi_dvr(rischio_id, livello);
create index if not exists idx_valutazioni_azienda_profilo on public.valutazioni_rischio(azienda_id, profilo_id);
create index if not exists idx_valutazioni_stato on public.valutazioni_rischio(stato);
create index if not exists idx_rilevamenti_azienda_data on public.rilevamenti_ambientali(azienda_id, data_rilevamento desc);
create index if not exists idx_documenti_catalogo_categoria_ordine on public.documenti_catalogo(categoria, ordine);
create index if not exists idx_aziende_documenti_azienda on public.aziende_documenti(azienda_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_catalogo_rischi_updated_at on public.catalogo_rischi;
create trigger trg_catalogo_rischi_updated_at before update on public.catalogo_rischi
for each row execute function public.set_updated_at();

drop trigger if exists trg_tipi_rilevamento_updated_at on public.tipi_rilevamento;
create trigger trg_tipi_rilevamento_updated_at before update on public.tipi_rilevamento
for each row execute function public.set_updated_at();

drop trigger if exists trg_aziende_updated_at on public.aziende;
create trigger trg_aziende_updated_at before update on public.aziende
for each row execute function public.set_updated_at();

drop trigger if exists trg_profili_updated_at on public.profili;
create trigger trg_profili_updated_at before update on public.profili
for each row execute function public.set_updated_at();

drop trigger if exists trg_aziende_profili_updated_at on public.aziende_profili;
create trigger trg_aziende_profili_updated_at before update on public.aziende_profili
for each row execute function public.set_updated_at();

drop trigger if exists trg_testi_dvr_updated_at on public.testi_dvr;
create trigger trg_testi_dvr_updated_at before update on public.testi_dvr
for each row execute function public.set_updated_at();

drop trigger if exists trg_valutazioni_rischio_updated_at on public.valutazioni_rischio;
create trigger trg_valutazioni_rischio_updated_at before update on public.valutazioni_rischio
for each row execute function public.set_updated_at();

drop trigger if exists trg_rilevamenti_ambientali_updated_at on public.rilevamenti_ambientali;
create trigger trg_rilevamenti_ambientali_updated_at before update on public.rilevamenti_ambientali
for each row execute function public.set_updated_at();

drop trigger if exists trg_documenti_catalogo_updated_at on public.documenti_catalogo;
create trigger trg_documenti_catalogo_updated_at before update on public.documenti_catalogo
for each row execute function public.set_updated_at();

drop trigger if exists trg_aziende_documenti_updated_at on public.aziende_documenti;
create trigger trg_aziende_documenti_updated_at before update on public.aziende_documenti
for each row execute function public.set_updated_at();
