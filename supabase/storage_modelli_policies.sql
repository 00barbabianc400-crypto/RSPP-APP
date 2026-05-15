-- Esegui se hai già applicato storage.sql con policy legacy.
-- Richiede public.app_is_rspp_or_admin() da policies.sql

create or replace function public.app_is_rspp_or_admin()
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
      and p.role in ('admin', 'rspp')
  );
$$;

drop policy if exists storage_read_auth on storage.objects;
create policy storage_read_auth on storage.objects
for select to authenticated
using (
  bucket_id in ('modelli', 'loghi', 'output')
  and public.app_is_active_user()
);

drop policy if exists storage_modelli_insert on storage.objects;
create policy storage_modelli_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'modelli' and public.app_is_rspp_or_admin());

drop policy if exists storage_modelli_update on storage.objects;
create policy storage_modelli_update on storage.objects
for update to authenticated
using (bucket_id = 'modelli' and public.app_is_rspp_or_admin())
with check (bucket_id = 'modelli' and public.app_is_rspp_or_admin());

drop policy if exists storage_modelli_delete on storage.objects;
create policy storage_modelli_delete on storage.objects
for delete to authenticated
using (bucket_id = 'modelli' and public.app_is_rspp_or_admin());

drop policy if exists storage_assets_insert on storage.objects;
create policy storage_assets_insert on storage.objects
for insert to authenticated
with check (bucket_id in ('loghi', 'output') and public.app_is_internal_user());

drop policy if exists storage_assets_update on storage.objects;
create policy storage_assets_update on storage.objects
for update to authenticated
using (bucket_id in ('loghi', 'output') and public.app_is_internal_user())
with check (bucket_id in ('loghi', 'output') and public.app_is_internal_user());

drop policy if exists storage_assets_delete on storage.objects;
create policy storage_assets_delete on storage.objects
for delete to authenticated
using (bucket_id in ('loghi', 'output') and public.app_is_internal_user());

drop policy if exists storage_write_internal on storage.objects;
drop policy if exists storage_update_internal on storage.objects;
drop policy if exists storage_delete_internal on storage.objects;
