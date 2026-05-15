-- Supabase storage buckets and policies

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise exception using
      message = 'Storage schema non disponibile: relazione storage.buckets non trovata',
      hint = 'Verifica di essere nel progetto Supabase corretto e che il servizio Storage sia abilitato. Apri la sezione Storage in dashboard e poi riesegui questo script.';
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values
  ('modelli', 'modelli', false),
  ('loghi', 'loghi', false),
  ('output', 'output', false)
on conflict (id) do nothing;

-- Lettura: utenti attivi (viewer incluso) su modelli/loghi/output
drop policy if exists storage_read_auth on storage.objects;
create policy storage_read_auth on storage.objects
for select to authenticated
using (
  bucket_id in ('modelli', 'loghi', 'output')
  and public.app_is_active_user()
);

-- Scrittura modelli: solo admin / rspp
drop policy if exists storage_modelli_insert on storage.objects;
create policy storage_modelli_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'modelli'
  and public.app_is_rspp_or_admin()
);

drop policy if exists storage_modelli_update on storage.objects;
create policy storage_modelli_update on storage.objects
for update to authenticated
using (
  bucket_id = 'modelli'
  and public.app_is_rspp_or_admin()
)
with check (
  bucket_id = 'modelli'
  and public.app_is_rspp_or_admin()
);

drop policy if exists storage_modelli_delete on storage.objects;
create policy storage_modelli_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'modelli'
  and public.app_is_rspp_or_admin()
);

-- Scrittura loghi/output: editor / rspp / admin
drop policy if exists storage_assets_insert on storage.objects;
create policy storage_assets_insert on storage.objects
for insert to authenticated
with check (
  bucket_id in ('loghi', 'output')
  and public.app_is_internal_user()
);

drop policy if exists storage_assets_update on storage.objects;
create policy storage_assets_update on storage.objects
for update to authenticated
using (
  bucket_id in ('loghi', 'output')
  and public.app_is_internal_user()
)
with check (
  bucket_id in ('loghi', 'output')
  and public.app_is_internal_user()
);

drop policy if exists storage_assets_delete on storage.objects;
create policy storage_assets_delete on storage.objects
for delete to authenticated
using (
  bucket_id in ('loghi', 'output')
  and public.app_is_internal_user()
);

-- Rimuovi policy legacy (se presenti da run precedenti)
drop policy if exists storage_write_internal on storage.objects;
drop policy if exists storage_update_internal on storage.objects;
drop policy if exists storage_delete_internal on storage.objects;
