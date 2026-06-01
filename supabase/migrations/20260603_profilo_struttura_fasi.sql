-- Profilo: protocollo (matrice), sedi custom, fasi con misure/DPI/rischi lavorativi

alter table public.profili
  add column if not exists protocollo_sanitario_config jsonb not null default '{}'::jsonb,
  add column if not exists sedi_operative text[] not null default '{}'::text[];

comment on column public.profili.protocollo_sanitario_config is
  'Se protocollo_sor_san: { rischi_ids: text[], periodicita: { acc_id: text[] } } (matrice sanitario)';

alter table public.profilo_fasi
  add column if not exists misure_specifiche text,
  add column if not exists dpi_specifici text;

alter table public.aziende_profili
  add column if not exists sedi_operative text[] not null default '{}'::text[];

create table if not exists public.profilo_fase_rischi_lavoro (
  id uuid primary key default gen_random_uuid(),
  profilo_fase_id uuid not null references public.profilo_fasi(id) on delete cascade,
  rischio_lavorativo_id text not null,
  ordine integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (profilo_fase_id, rischio_lavorativo_id)
);

create index if not exists idx_profilo_fase_rischi_fase
  on public.profilo_fase_rischi_lavoro(profilo_fase_id);

alter table public.profilo_fase_rischi_lavoro enable row level security;

drop policy if exists profilo_fase_rischi_lavoro_read_auth on public.profilo_fase_rischi_lavoro;
create policy profilo_fase_rischi_lavoro_read_auth on public.profilo_fase_rischi_lavoro
for select to authenticated
using (public.app_is_active_user());

-- fn_salva_struttura_profilo: vedi functions.sql (applicata anche lì)
