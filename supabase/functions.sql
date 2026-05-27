-- Business RPC functions for RSPP

create or replace function public.fn_calcola_indice_livello(p_probabilita integer, p_gravita integer)
returns table(indice_rischio integer, livello_rischio public.livello_rischio_enum)
language plpgsql
as $$
declare
  v_indice integer;
begin
  if p_probabilita is null or p_gravita is null then
    return query select null::integer, 'Trascurabile'::public.livello_rischio_enum;
    return;
  end if;

  if p_probabilita < 1 or p_probabilita > 4 or p_gravita < 1 or p_gravita > 4 then
    raise exception 'Probabilita e Gravita devono essere tra 1 e 4';
  end if;

  v_indice := p_probabilita * p_gravita;

  return query select
    v_indice,
    case
      when v_indice >= 10 then 'Alto'::public.livello_rischio_enum
      when v_indice >= 5 then 'Medio'::public.livello_rischio_enum
      when v_indice >= 1 then 'Basso'::public.livello_rischio_enum
      else 'Trascurabile'::public.livello_rischio_enum
    end;
end;
$$;

create or replace function public.fn_valuta_rilevamento(p_valore_misurato numeric, p_limite_legge numeric)
returns public.esito_rilevamento_enum
language plpgsql
as $$
begin
  if p_valore_misurato is null or p_limite_legge is null then
    return 'Da verificare';
  end if;

  if p_valore_misurato <= p_limite_legge then
    return 'Conforme';
  elsif p_valore_misurato > (p_limite_legge * 1.1) then
    return 'Non conforme';
  else
    return 'Da verificare';
  end if;
end;
$$;

-- ── Helper interno: crea valutazioni livello-profilo per tutti i rischi attivi ─
create or replace function public._fn_crea_valutazioni_profilo(
  p_azienda_id  uuid,
  p_profilo_id  uuid,
  p_partita_iva text,
  p_user_id     uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  insert into public.valutazioni_rischio (
    chiave_valutazione,
    azienda_id,
    profilo_id,
    profilo_fase_id,
    rischio_id,
    rischio_associato,
    stato,
    livello_rischio,
    testo_valutazione,
    valutatore_id
  )
  select
    p_partita_iva || '_' || p_profilo_id::text || '_' || cr.id_rischio,
    p_azienda_id,
    p_profilo_id,
    null,
    cr.id,
    true,
    'Trascurabile',
    'Trascurabile',
    'Rischio non rilevato per il profilo professionale.',
    p_user_id
  from public.catalogo_rischi cr
  where cr.attivo = true
  on conflict (azienda_id, profilo_id, rischio_id) where (profilo_fase_id is null)
  do nothing;
end;
$$;

revoke all on function public._fn_crea_valutazioni_profilo(uuid, uuid, text, uuid) from public;
revoke all on function public._fn_crea_valutazioni_profilo(uuid, uuid, text, uuid) from authenticated;

-- ── Helper interno: crea valutazioni per una fase clonando quelle del profilo ─
create or replace function public._fn_crea_valutazioni_fase(
  p_azienda_id    uuid,
  p_profilo_id    uuid,
  p_fase_id       uuid,
  p_fase_nome     text,
  p_partita_iva   text,
  p_user_id       uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  insert into public.valutazioni_rischio (
    chiave_valutazione,
    azienda_id,
    profilo_id,
    profilo_fase_id,
    rischio_id,
    rischio_associato,
    stato,
    probabilita,
    gravita,
    indice_rischio,
    livello_rischio,
    testo_dvr_id,
    testo_valutazione,
    valutatore_id
  )
  select
    p_partita_iva || '_' || p_profilo_id::text || '_' || p_fase_id::text || '_' || cr.id_rischio,
    p_azienda_id,
    p_profilo_id,
    p_fase_id,
    cr.id,
    coalesce(vp.rischio_associato, true),
    coalesce(vp.stato, 'Trascurabile'),
    vp.probabilita,
    vp.gravita,
    vp.indice_rischio,
    coalesce(vp.livello_rischio, 'Trascurabile'),
    vp.testo_dvr_id,
    coalesce(vp.testo_valutazione,
      'Rischio non rilevato per il profilo professionale.'),
    p_user_id
  from public.catalogo_rischi cr
  left join public.valutazioni_rischio vp
    on  vp.azienda_id  = p_azienda_id
    and vp.profilo_id  = p_profilo_id
    and vp.rischio_id  = cr.id
    and vp.profilo_fase_id is null
  where cr.attivo = true
  on conflict (azienda_id, profilo_id, profilo_fase_id, rischio_id)
    where (profilo_fase_id is not null)
  do nothing;
end;
$$;

revoke all on function public._fn_crea_valutazioni_fase(uuid, uuid, uuid, text, text, uuid) from public;
revoke all on function public._fn_crea_valutazioni_fase(uuid, uuid, uuid, text, text, uuid) from authenticated;

create or replace function public.fn_associa_profilo_azienda(
  p_azienda_id uuid,
  p_profilo_id uuid,
  p_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_associazione_id uuid;
  v_partita_iva     text;
  v_existing_count  integer;
  v_fase            record;
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  if p_azienda_id is null or p_profilo_id is null then
    raise exception 'azienda_id e profilo_id sono obbligatori';
  end if;

  select count(*) into v_existing_count
  from public.aziende_profili
  where azienda_id = p_azienda_id
    and profilo_id = p_profilo_id;

  if v_existing_count > 0 then
    raise exception 'Associazione azienda/profilo gia esistente';
  end if;

  insert into public.aziende_profili (azienda_id, profilo_id, created_by)
  values (p_azienda_id, p_profilo_id, p_user_id)
  returning id into v_associazione_id;

  select partita_iva into v_partita_iva
  from public.aziende
  where id = p_azienda_id;

  if v_partita_iva is null then
    raise exception 'Azienda non trovata';
  end if;

  -- 1. Valutazioni a livello profilo (retrocompatibili, profilo_fase_id = NULL)
  perform public._fn_crea_valutazioni_profilo(
    p_azienda_id, p_profilo_id, v_partita_iva, p_user_id
  );

  -- 2. Valutazioni per ogni fase già definita sul profilo
  for v_fase in
    select id, nome
    from public.profilo_fasi
    where profilo_id = p_profilo_id
    order by ordine
  loop
    perform public._fn_crea_valutazioni_fase(
      p_azienda_id, p_profilo_id, v_fase.id, v_fase.nome,
      v_partita_iva, p_user_id
    );
  end loop;

  return v_associazione_id;
end;
$$;

revoke all on function public.fn_associa_profilo_azienda(uuid, uuid, uuid) from public;
grant execute on function public.fn_associa_profilo_azienda(uuid, uuid, uuid) to authenticated;

-- ── Aggiungi una fase a un profilo e clona le valutazioni ────────────────────
-- Chiamata dalla UI anagrafica profili quando l'utente aggiunge una fase.
-- Crea la riga in profilo_fasi e clona le valutazioni per tutte le aziende
-- associate al profilo.
create or replace function public.fn_aggiungi_fase_profilo(
  p_profilo_id uuid,
  p_nome_fase  text,
  p_ordine     integer default null,
  p_user_id    uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fase_id     uuid;
  v_ordine_max  integer;
  v_az          record;
  v_partita_iva text;
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  if p_profilo_id is null or trim(p_nome_fase) = '' then
    raise exception 'profilo_id e nome_fase sono obbligatori';
  end if;

  -- Calcola ordine se non fornito
  if p_ordine is null then
    select coalesce(max(ordine), 0) + 1
    into v_ordine_max
    from public.profilo_fasi
    where profilo_id = p_profilo_id;
  else
    v_ordine_max := p_ordine;
  end if;

  insert into public.profilo_fasi (profilo_id, nome, ordine)
  values (p_profilo_id, trim(p_nome_fase), v_ordine_max)
  returning id into v_fase_id;

  -- Clona valutazioni per ogni azienda associata al profilo
  for v_az in
    select ap.azienda_id, az.partita_iva
    from public.aziende_profili ap
    join public.aziende az on az.id = ap.azienda_id
    where ap.profilo_id = p_profilo_id
  loop
    perform public._fn_crea_valutazioni_fase(
      v_az.azienda_id, p_profilo_id, v_fase_id, trim(p_nome_fase),
      v_az.partita_iva, p_user_id
    );
  end loop;

  return v_fase_id;
end;
$$;

revoke all on function public.fn_aggiungi_fase_profilo(uuid, text, integer, uuid) from public;
grant execute on function public.fn_aggiungi_fase_profilo(uuid, text, integer, uuid) to authenticated;

-- ── Rinomina una fase (id stabile, valutazioni invariate) ────────────────────
create or replace function public.fn_rinomina_fase_profilo(
  p_fase_id  uuid,
  p_nuovo_nome text,
  p_user_id  uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  if trim(p_nuovo_nome) = '' then
    raise exception 'Il nome della fase non può essere vuoto';
  end if;

  update public.profilo_fasi
  set nome = trim(p_nuovo_nome)
  where id = p_fase_id;

  if not found then
    raise exception 'Fase non trovata';
  end if;
end;
$$;

revoke all on function public.fn_rinomina_fase_profilo(uuid, text, uuid) from public;
grant execute on function public.fn_rinomina_fase_profilo(uuid, text, uuid) to authenticated;

-- ── Rimuovi una fase (CASCADE DELETE valutazioni legate) ─────────────────────
create or replace function public.fn_rimuovi_fase_profilo(
  p_fase_id uuid,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  -- Il CASCADE su profilo_fasi.id → valutazioni_rischio.profilo_fase_id
  -- elimina automaticamente le valutazioni legate alla fase.
  delete from public.profilo_fasi
  where id = p_fase_id;

  if not found then
    raise exception 'Fase non trovata';
  end if;
end;
$$;

revoke all on function public.fn_rimuovi_fase_profilo(uuid, uuid) from public;
grant execute on function public.fn_rimuovi_fase_profilo(uuid, uuid) to authenticated;

-- ── Sync profili.fasi_lavoro[] → profilo_fasi (+ valutazioni per fasi nuove) ─
create or replace function public.fn_sincronizza_fasi_da_array(
  p_profilo_id uuid,
  p_user_id    uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fase      text;
  v_ord       integer;
  v_fase_id   uuid;
  v_is_new    boolean;
  v_nomi      text[] := '{}';
  v_az        record;
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  select coalesce(
    array_agg(trim(f) order by ord)
      filter (where trim(f) <> ''),
    '{}'::text[]
  )
  into v_nomi
  from (
    select trim(f) as f, row_number() over () as ord
    from public.profili p,
         unnest(coalesce(p.fasi_lavoro, '{}'::text[])) as f
    where p.id = p_profilo_id
  ) s;

  -- Rimuove fasi non più nell'array (CASCADE sulle valutazioni per fase)
  delete from public.profilo_fasi pf
  where pf.profilo_id = p_profilo_id
    and not (pf.nome = any (v_nomi));

  v_ord := 0;
  foreach v_fase in array v_nomi loop
    v_ord := v_ord + 1;
    v_is_new := false;

    select id into v_fase_id
    from public.profilo_fasi
    where profilo_id = p_profilo_id and nome = v_fase;

    if v_fase_id is null then
      insert into public.profilo_fasi (profilo_id, nome, ordine)
      values (p_profilo_id, v_fase, v_ord)
      returning id into v_fase_id;
      v_is_new := true;
    else
      update public.profilo_fasi
      set ordine = v_ord
      where id = v_fase_id;
    end if;

    if v_is_new then
      for v_az in
        select ap.azienda_id, az.partita_iva
        from public.aziende_profili ap
        join public.aziende az on az.id = ap.azienda_id
        where ap.profilo_id = p_profilo_id
      loop
        perform public._fn_crea_valutazioni_fase(
          v_az.azienda_id, p_profilo_id, v_fase_id, v_fase,
          v_az.partita_iva, p_user_id
        );
      end loop;
    end if;
  end loop;
end;
$$;

revoke all on function public.fn_sincronizza_fasi_da_array(uuid, uuid) from public;
grant execute on function public.fn_sincronizza_fasi_da_array(uuid, uuid) to authenticated;

create or replace function public.fn_set_valutazione(
  p_valutazione_id uuid,
  p_stato public.stato_valutazione_enum,
  p_probabilita integer default null,
  p_gravita integer default null,
  p_testo_dvr_id uuid default null,
  p_note text default null
)
returns public.valutazioni_rischio
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calc record;
  v_result public.valutazioni_rischio;
begin
  if not public.app_is_internal_user() then
    raise exception 'Permessi insufficienti';
  end if;

  if p_stato = 'Trascurabile' then
    update public.valutazioni_rischio
    set stato = p_stato,
        probabilita = null,
        gravita = null,
        indice_rischio = null,
        livello_rischio = 'Trascurabile',
        testo_dvr_id = p_testo_dvr_id,
        note = p_note,
        data_valutazione = current_date,
        valutatore_id = auth.uid()
    where id = p_valutazione_id
    returning * into v_result;
    return v_result;
  end if;

  select * into v_calc
  from public.fn_calcola_indice_livello(p_probabilita, p_gravita);

  update public.valutazioni_rischio
  set stato = p_stato,
      probabilita = p_probabilita,
      gravita = p_gravita,
      indice_rischio = v_calc.indice_rischio,
      livello_rischio = v_calc.livello_rischio,
      testo_dvr_id = p_testo_dvr_id,
      note = p_note,
      data_valutazione = current_date,
      valutatore_id = auth.uid()
  where id = p_valutazione_id
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.fn_set_valutazione(uuid, public.stato_valutazione_enum, integer, integer, uuid, text) from public;
grant execute on function public.fn_set_valutazione(uuid, public.stato_valutazione_enum, integer, integer, uuid, text) to authenticated;
