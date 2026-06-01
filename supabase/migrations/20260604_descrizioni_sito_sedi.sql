-- Descrizione del sito per sede (indice allineato a sede_operativa + sedi_operative)
alter table public.aziende
  add column if not exists descrizioni_sito_sedi text[] not null default '{}';

comment on column public.aziende.descrizioni_sito_sedi is
  'Parallelo alle sedi: [0] sede_operativa, [1..n] sedi_operative[n-1] — Appendici B.2 / B.3';
