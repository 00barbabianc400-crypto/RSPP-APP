/**
 * Catalogo punti elenco — sezione 3.2 PROTEZIONI ATTIVE / PASSIVE (NOTA_ANTINCENDIO).
 */
(function () {
  'use strict';

  const PROTEZIONI_ATTIVE_CATALOGO = [
    { id: 'ESTINTORI_POLVERE', testo: 'Estintori a polvere', default_selezionato: true },
    { id: 'ESTINTORI_CO2', testo: 'Estintori del tipo a CO2', default_selezionato: true },
    {
      id: 'RILEVAZIONE',
      testo: 'Impianti di rilevazione incendi',
      default_selezionato: true,
      escluso_se_irai: true,
    },
    {
      id: 'ALLARME',
      testo: 'Impianto di allarme antincendio',
      default_selezionato: true,
      escluso_se_irai: true,
    },
    {
      id: 'IRAI',
      testo: 'Impianti IRAI',
      default_selezionato: false,
      hint: 'Se selezionato, nel Word non compaiono rilevazione e allarme separati.',
    },
    { id: 'EVACUATORI', testo: 'Evacuatori di fumo e calore', default_selezionato: true },
  ];

  const PROTEZIONI_PASSIVE_CATALOGO = [
    { id: 'PORTE_TAGLIAFUOCO', testo: 'Porte tagliafuoco', default_selezionato: true },
    { id: 'COMPARTIMENTAZIONI', testo: 'Compartimentazioni', default_selezionato: true },
    { id: 'VIE_USCITA', testo: 'Vie di uscita ed emergenza', default_selezionato: true },
    { id: 'SEGNALETICA', testo: 'Segnaletica di sicurezza', default_selezionato: true },
  ];

  window.NOTA_ANTINCENDIO_MISURE_PROTEZIONE = {
    PROTEZIONI_ATTIVE_CATALOGO,
    PROTEZIONI_PASSIVE_CATALOGO,
  };
})();
