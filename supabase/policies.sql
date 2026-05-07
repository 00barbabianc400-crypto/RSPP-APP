-- RLS policies for MVP

alter table public.profiles enable row level security;
alter table public.catalogo_rischi enable row level security;
alter table public.tipi_rilevamento enable row level security;
alter table public.aziende enable row level security;
alter table public.profili enable row level security;
alter table public.aziende_profili enable row level security;
alter table public.testi_dvr enable row level security;
alter table public.valutazioni_rischio enable row level security;
alter table public.rilevamenti_ambientali enable row level security;
alter table public.documenti_catalogo enable row level security;
alter table public.aziende_documenti enable row level security;

create or replace function public.app_is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'rspp', 'editor')
  );
$$;

create or replace function public.app_can_read()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

create or replace function public.app_is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  );
$$;

create or replace function public.app_is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = 'admin'
  );
$$;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
for select to authenticated
using (id = auth.uid() or public.app_is_admin_user());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.app_is_admin_user())
with check (id = auth.uid() or public.app_is_admin_user());

drop policy if exists catalogo_read_auth on public.catalogo_rischi;
create policy catalogo_read_auth on public.catalogo_rischi
for select to authenticated
using (public.app_can_read());

drop policy if exists catalogo_write_internal on public.catalogo_rischi;
create policy catalogo_write_internal on public.catalogo_rischi
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists tipi_read_auth on public.tipi_rilevamento;
create policy tipi_read_auth on public.tipi_rilevamento
for select to authenticated
using (public.app_can_read());

drop policy if exists tipi_write_internal on public.tipi_rilevamento;
create policy tipi_write_internal on public.tipi_rilevamento
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists aziende_read_auth on public.aziende;
create policy aziende_read_auth on public.aziende
for select to authenticated
using (public.app_is_active_user());

drop policy if exists aziende_write_internal on public.aziende;
create policy aziende_write_internal on public.aziende
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists profili_read_auth on public.profili;
create policy profili_read_auth on public.profili
for select to authenticated
using (public.app_is_active_user());

drop policy if exists profili_write_internal on public.profili;
create policy profili_write_internal on public.profili
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists aziende_profili_read_auth on public.aziende_profili;
create policy aziende_profili_read_auth on public.aziende_profili
for select to authenticated
using (public.app_is_active_user());

drop policy if exists aziende_profili_write_internal on public.aziende_profili;
create policy aziende_profili_write_internal on public.aziende_profili
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists testi_dvr_read_auth on public.testi_dvr;
create policy testi_dvr_read_auth on public.testi_dvr
for select to authenticated
using (public.app_is_active_user());

drop policy if exists testi_dvr_write_internal on public.testi_dvr;
create policy testi_dvr_write_internal on public.testi_dvr
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists valutazioni_read_auth on public.valutazioni_rischio;
create policy valutazioni_read_auth on public.valutazioni_rischio
for select to authenticated
using (public.app_is_active_user());

drop policy if exists valutazioni_write_internal on public.valutazioni_rischio;
create policy valutazioni_write_internal on public.valutazioni_rischio
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists rilevamenti_read_auth on public.rilevamenti_ambientali;
create policy rilevamenti_read_auth on public.rilevamenti_ambientali
for select to authenticated
using (public.app_is_active_user());

drop policy if exists rilevamenti_write_internal on public.rilevamenti_ambientali;
create policy rilevamenti_write_internal on public.rilevamenti_ambientali
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists documenti_catalogo_read_auth on public.documenti_catalogo;
create policy documenti_catalogo_read_auth on public.documenti_catalogo
for select to authenticated
using (public.app_can_read());

drop policy if exists documenti_catalogo_write_internal on public.documenti_catalogo;
create policy documenti_catalogo_write_internal on public.documenti_catalogo
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());

drop policy if exists aziende_documenti_read_auth on public.aziende_documenti;
create policy aziende_documenti_read_auth on public.aziende_documenti
for select to authenticated
using (public.app_is_active_user());

drop policy if exists aziende_documenti_write_internal on public.aziende_documenti;
create policy aziende_documenti_write_internal on public.aziende_documenti
for all to authenticated
using (public.app_is_internal_user())
with check (public.app_is_internal_user());
