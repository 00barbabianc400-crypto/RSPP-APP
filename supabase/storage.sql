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

-- Read for authenticated users
drop policy if exists storage_read_auth on storage.objects;
create policy storage_read_auth on storage.objects
for select to authenticated
using (
  bucket_id in ('modelli', 'loghi', 'output')
);

-- Write only for internal app users
drop policy if exists storage_write_internal on storage.objects;
create policy storage_write_internal on storage.objects
for insert to authenticated
with check (
  bucket_id in ('modelli', 'loghi', 'output')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'rspp', 'editor')
  )
);

drop policy if exists storage_update_internal on storage.objects;
create policy storage_update_internal on storage.objects
for update to authenticated
using (
  bucket_id in ('modelli', 'loghi', 'output')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'rspp', 'editor')
  )
)
with check (
  bucket_id in ('modelli', 'loghi', 'output')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'rspp', 'editor')
  )
);

drop policy if exists storage_delete_internal on storage.objects;
create policy storage_delete_internal on storage.objects
for delete to authenticated
using (
  bucket_id in ('modelli', 'loghi', 'output')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'rspp', 'editor')
  )
);
