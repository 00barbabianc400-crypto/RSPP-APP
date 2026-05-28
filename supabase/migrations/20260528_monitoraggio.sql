-- RPC admin: statistiche aggregate (payload ~2–4 KB, nessuna riga esposta)

create or replace function public.fn_statistiche_monitoraggio()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rischi bigint;
  v_teorico bigint;
  v_actual bigint;
begin
  if not public.app_is_admin_user() then
    raise exception 'Permessi insufficienti';
  end if;

  select count(*)::bigint into v_rischi
  from public.catalogo_rischi where attivo = true;

  select count(*)::bigint into v_actual from public.valutazioni_rischio;

  select (count(*)::bigint * v_rischi)::bigint into v_teorico
  from public.aziende_profili;

  return jsonb_build_object(
    'generato_il', to_jsonb(now() at time zone 'utc'),
    'conteggi', jsonb_build_object(
      'aziende', (select count(*) from public.aziende),
      'profili_attivi', (select count(*) from public.profili where attivo),
      'associazioni', (select count(*) from public.aziende_profili),
      'profilo_fasi', (select count(*) from public.profilo_fasi),
      'profili_con_fasi', (select count(distinct profilo_id) from public.profilo_fasi),
      'rischi_attivi', v_rischi,
      'valutazioni_totali', v_actual,
      'valutazioni_profilo', (select count(*) from public.valutazioni_rischio where profilo_fase_id is null),
      'valutazioni_fase', (select count(*) from public.valutazioni_rischio where profilo_fase_id is not null),
      'valutazioni_presenti', (select count(*) from public.valutazioni_rischio where stato = 'Presente'),
      'testi_dvr', (select count(*) from public.testi_dvr),
      'rilevamenti', (select count(*) from public.rilevamenti_ambientali),
      'utenti_attivi', (select count(*) from public.profiles where is_active)
    ),
    'stima', jsonb_build_object(
      'righe_teoriche', v_teorico,
      'delta_righe', v_actual - v_teorico,
      'fasi_media_per_profilo', coalesce((
        select round(avg(fc.cnt)::numeric, 1)
        from (select count(*)::numeric as cnt from public.profilo_fasi group by profilo_id) fc
      ), 0),
      'fattore_espansione_fasi', 0
    ),
    'db', jsonb_build_object(
      'database_bytes', pg_database_size(current_database()),
      'valutazioni_bytes', pg_total_relation_size('public.valutazioni_rischio'::regclass),
      'profilo_fasi_bytes', pg_total_relation_size('public.profilo_fasi'::regclass)
    ),
    'top_aziende_valutazioni', coalesce((
      select jsonb_agg(jsonb_build_object('nome', t.nome, 'n', t.n) order by t.n desc)
      from (
        select left(a.ragione_sociale, 48) as nome, count(v.id)::int as n
        from public.valutazioni_rischio v
        join public.aziende a on a.id = v.azienda_id
        group by a.id, a.ragione_sociale
        order by count(v.id) desc
        limit 8
      ) t
    ), '[]'::jsonb),
    'anomalie', jsonb_build_object(
      'aziende_senza_profili', (
        select count(*)::int from public.aziende a
        where not exists (
          select 1 from public.aziende_profili ap where ap.azienda_id = a.id
        )
      ),
      'profili_senza_associazioni', (
        select count(*)::int from public.profili p
        where p.attivo and not exists (
          select 1 from public.aziende_profili ap where ap.profilo_id = p.id
        )
      )
    )
  );
end;
$$;

revoke all on function public.fn_statistiche_monitoraggio() from public;
grant execute on function public.fn_statistiche_monitoraggio() to authenticated;
