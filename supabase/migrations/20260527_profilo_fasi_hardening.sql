-- Hardening profilo_fasi + vincoli valutazioni per livello profilo/fase

-- ── 1. Unique: profilo vs fase (il vincolo tabella bloccava righe per fase) ──
alter table public.valutazioni_rischio
  drop constraint if exists valutazioni_rischio_azienda_id_profilo_id_rischio_id_key;

create unique index if not exists uq_valutazioni_profilo_livello
  on public.valutazioni_rischio(azienda_id, profilo_id, rischio_id)
  where profilo_fase_id is null;

-- ── 2. Helper interni: non invocabili da client ─────────────────────────────
revoke all on function public._fn_crea_valutazioni_profilo(uuid, uuid, text, uuid) from public;
revoke all on function public._fn_crea_valutazioni_profilo(uuid, uuid, text, uuid) from authenticated;

revoke all on function public._fn_crea_valutazioni_fase(uuid, uuid, uuid, text, text, uuid) from public;
revoke all on function public._fn_crea_valutazioni_fase(uuid, uuid, uuid, text, text, uuid) from authenticated;

-- ── 3. profilo_fasi: sola lettura via API; scritture solo RPC ────────────────
drop policy if exists profilo_fasi_write_internal on public.profilo_fasi;
