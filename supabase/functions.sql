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
  v_partita_iva text;
  v_existing_count integer;
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

  insert into public.valutazioni_rischio (
    chiave_valutazione,
    azienda_id,
    profilo_id,
    rischio_id,
    rischio_associato,
    stato,
    livello_rischio,
    testo_valutazione,
    valutatore_id
  )
  select
    v_partita_iva || '_' || p_profilo_id::text || '_' || cr.id_rischio,
    p_azienda_id,
    p_profilo_id,
    cr.id,
    true,
    'Trascurabile',
    'Trascurabile',
    'Rischio non rilevato per il profilo professionale. Le caratteristiche dell''attivita e dell''ambiente di lavoro non comportano esposizione a tale tipologia di rischio.',
    p_user_id
  from public.catalogo_rischi cr
  where cr.attivo = true
  on conflict (azienda_id, profilo_id, rischio_id) do nothing;

  return v_associazione_id;
end;
$$;

revoke all on function public.fn_associa_profilo_azienda(uuid, uuid, uuid) from public;
grant execute on function public.fn_associa_profilo_azienda(uuid, uuid, uuid) to authenticated;

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
