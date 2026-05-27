-- ============================================================
-- Migration: profilo_fasi + valutazioni per fase
-- Approccio B: fasi come entità con id stabile
--
-- Regole:
--   - profilo_fase_id NULL in valutazioni_rischio = valutazione
--     a livello di profilo (retrocompatibile con dati esistenti)
--   - Nuova fase → clona valutazioni livello-profilo
--   - Fase rimossa → CASCADE DELETE valutazioni legate alla fase
-- ============================================================

-- ── 1. Tabella profilo_fasi ───────────────────────────────────
create table if not exists public.profilo_fasi (
  id          uuid primary key default gen_random_uuid(),
  profilo_id  uuid not null references public.profili(id) on delete cascade,
  nome        text not null check (char_length(trim(nome)) > 0),
  ordine      integer not null default 0,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  unique (profilo_id, nome)
);

create index if not exists idx_profilo_fasi_profilo
  on public.profilo_fasi(profilo_id);

drop trigger if exists trg_profilo_fasi_updated_at on public.profilo_fasi;
create trigger trg_profilo_fasi_updated_at
  before update on public.profilo_fasi
  for each row execute function public.set_updated_at();


-- ── 2. FK su valutazioni_rischio ─────────────────────────────
--   Nullable: NULL = valutazione a livello profilo (dati esistenti)
alter table public.valutazioni_rischio
  add column if not exists profilo_fase_id uuid
    references public.profilo_fasi(id) on delete cascade;

create index if not exists idx_valutazioni_fase
  on public.valutazioni_rischio(profilo_fase_id)
  where profilo_fase_id is not null;


-- ── 3. Nuovo unique constraint per valutazioni con fase ───────
--   L'unique esistente (azienda_id, profilo_id, rischio_id) resta
--   per le righe a livello profilo (profilo_fase_id IS NULL).
--   Aggiungiamo un partial unique per le righe con fase.
create unique index if not exists
  uq_valutazioni_azienda_profilo_fase_rischio
  on public.valutazioni_rischio(azienda_id, profilo_id, profilo_fase_id, rischio_id)
  where profilo_fase_id is not null;


-- ── 4. chiave_valutazione: aggiorna formula per righe con fase ─
--   Non possiamo modificare l'unique su chiave_valutazione in modo
--   retrocompatibile senza riscriverla, ma il campo è già UNIQUE.
--   La nuova RPC userà:
--     {piva}_{profilo_id}_{fase_id}_{id_rischio}
--   per righe fase; il formato esistente resta per livello profilo.


-- ── 5. Migrazione dati: popola profilo_fasi da profili.fasi_lavoro ─
--   Per ogni profilo con fasi non vuote, inserisce una riga in
--   profilo_fasi per ogni elemento dell'array (con ordine da posizione).
--   Le valutazioni esistenti rimangono a livello profilo (profilo_fase_id = NULL).
do $$
declare
  r record;
  v_fase text;
  v_ordine integer;
begin
  for r in
    select id, fasi_lavoro
    from public.profili
    where array_length(fasi_lavoro, 1) > 0
  loop
    v_ordine := 0;
    foreach v_fase in array r.fasi_lavoro loop
      v_ordine := v_ordine + 1;
      insert into public.profilo_fasi (profilo_id, nome, ordine)
      values (r.id, trim(v_fase), v_ordine)
      on conflict (profilo_id, nome) do update
        set ordine = excluded.ordine;
    end loop;
  end loop;
end;
$$;
