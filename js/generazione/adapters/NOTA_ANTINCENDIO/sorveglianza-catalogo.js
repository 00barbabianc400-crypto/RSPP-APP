/**
 * Catalogo §9.1 — verifiche sorveglianza squadra emergenza in esercizio.
 */
(function () {
  'use strict';

  const SORVEGLIANZA_VERIFICHE_CATALOGO = [
    {
      id: 'VIE_ESODO',
      testo:
        'la fruibilità delle vie di esodo (es. corridoi, porte, scale, compartimentazioni ove presenti, ecc.);',
      default_selezionato: true,
    },
    {
      id: 'PORTE_REI',
      testo: 'l’efficienza dei sistemi di chiusura delle porte resistenti al fuoco;',
      default_selezionato: true,
    },
    {
      id: 'IMPIANTI_DIFESA',
      testo:
        'l’efficienza degli impianti ed attrezzature di difesa/contrasto (es. estintori, idranti, cassetta sanitaria, porte antincendio, ecc.);',
      default_selezionato: true,
    },
    {
      id: 'IMPIANTI_ALLARME',
      testo:
        'l’efficienza degli impianti di sicurezza e d’allarme (illuminazione, campanelli e diffusori sonori ove presenti, cartellonistica di sicurezza, ecc.);',
      default_selezionato: true,
    },
    {
      id: 'DIVIETO_FUMO',
      testo:
        'il divieto di fumare e di accendere fiamme libere nelle aree interdette ed a rischio specifico di incendio;',
      default_selezionato: true,
    },
    {
      id: 'DPI_ANTINCENDIO',
      testo:
        'il corretto posizionamento e l’efficienza dei dispositivi di protezione individuale finalizzati alla sicurezza antincendio.',
      default_selezionato: true,
    },
    {
      id: 'SEGNALETICA',
      testo:
        'eventuali deterioramenti della segnaletica di sicurezza (verificando che sia presente e facilmente visibile).',
      default_selezionato: true,
    },
  ];

  window.NOTA_ANTINCENDIO_SORVEGLIANZA = {
    SORVEGLIANZA_VERIFICHE_CATALOGO,
  };
})();
