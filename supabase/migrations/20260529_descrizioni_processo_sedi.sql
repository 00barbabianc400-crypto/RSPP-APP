-- Descrizione processo produttivo per sede (indice allineato a getSediOperativeLista: [0]=principale, [1+]=sedi_operative)
alter table public.aziende
  add column if not exists descrizioni_processo_sedi text[] not null default '{}';

comment on column public.aziende.descrizioni_processo_sedi is
  'Parallelo alle sedi: [0] sede_operativa, [1..n] sedi_operative[n-1]';
