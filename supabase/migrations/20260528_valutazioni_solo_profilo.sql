-- Rollback chirurgico: valutazioni solo a livello profilo (no moltiplicazione per fase)

-- 1) Rimuove tutte le valutazioni per-fase già generate
delete from public.valutazioni_rischio
where profilo_fase_id is not null;

-- 2) Ripristina vincolo univoco classico (azienda, profilo, rischio)
drop index if exists public.uq_valutazioni_azienda_profilo_fase_rischio;
drop index if exists public.uq_valutazioni_profilo_livello;
drop index if exists public.uq_valutazioni_azienda_profilo_rischio;

create unique index uq_valutazioni_azienda_profilo_rischio
  on public.valutazioni_rischio(azienda_id, profilo_id, rischio_id);
