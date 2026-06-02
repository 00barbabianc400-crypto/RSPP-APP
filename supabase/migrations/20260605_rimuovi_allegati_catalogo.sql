-- Rimuove allegati non più gestiti dall'app (catalogo modelli + anagrafica azienda).
delete from public.documenti_catalogo
where codice in (
  'ALLEGATO_TITOLI_RSPP',
  'ALLEGATO_QUESTIONARIO_STRESS',
  'ALLEGATO_RISCHIO_MOLESTIE'
);
