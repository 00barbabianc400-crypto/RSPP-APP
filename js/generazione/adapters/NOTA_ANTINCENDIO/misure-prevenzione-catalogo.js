/**
 * Catalogo punti elenco — sezione 3.1 MISURE DI PREVENZIONE (NOTA_ANTINCENDIO).
 */
(function () {
  'use strict';

  const MISURE_PREVENZIONE_CATALOGO = [
    {
      id: 'DEPOSITO_INFIAMMABILI',
      testo:
        'È fatto assoluto divieto di deposito o manipolazione di sostanze infiammabili o combustibili all’interno degli ambienti di lavoro; in caso di eventuale deposito o manipolazione di sostanze infiammabili o combustibili, quando autorizzato dal Datore di Lavoro, lo stesso dovrà essere effettuato in modo tale da evitare l’innesco di incendi: in particolare evitare stoccaggi di materiali infiammabili o combustibili in prossimità di sorgenti di calore, quadri elettrici o altri elementi che possano innescare un incendio;',
    },
    { id: 'RIFIUTI', testo: 'evitare accumulo di rifiuti;' },
    {
      id: 'FIAMME_LIBERE',
      testo:
        'È fatto assoluto divieto l’utilizzo di fiamme libere e di apparecchi generatori di calore all’interno degli ambienti di lavoro; nel caso in cui sia necessario l’utilizzo di fiamme libere e di apparecchi generatori di calore, quando autorizzato dal Datore di Lavoro, rispettare sempre le misure di sicurezza necessarie e prevenire l’innesco e la propagazione di incendi;',
    },
    {
      id: 'RIPARAZIONI_ELETTRICHE',
      testo:
        'divieto assoluto di effettuare riparazioni di impianti elettrici da parte di persone non qualificate;',
    },
    {
      id: 'IMPIANTI_ELETTRICI',
      testo:
        'gli impianti elettrici devono essere realizzati e manutenuti a regola d’arte in conformità con le norme tecniche di riferimento e corredati da apposite certificazioni ed omologazioni;',
    },
    {
      id: 'INTRODUZIONE_ATTREZZATURE',
      testo:
        'È rigorosamente vietato introdurre all’interno dell’azienda attrezzature, macchine, arredi, prodotti sostanze a qualsiasi altro materiale non sia stato approvato preliminarmente dal Datore di Lavoro;',
    },
    {
      id: 'MARCATURA_CE',
      testo:
        'divieto assoluto di utilizzare sprovviste di marcatura CE ed in non perfette condizioni manutentive;',
    },
    {
      id: 'DISTACCO_ELETTRICO',
      testo:
        'è raccomandato il distacco delle apparecchiature elettriche quando non utilizzate ed in particolare al termine della giornata lavorativa;',
    },
    {
      id: 'VENTILAZIONE',
      testo: 'evitare l’ostruzione della ventilazione di apparecchi elettrici o da ufficio;',
    },
    { id: 'DIVIETO_FUMO', testo: 'divieto di fumo in aree ove è proibito;' },
    {
      id: 'PORTE_REI',
      solo_se_porte_rei: true,
      testo:
        'È fatto assoluto divieto di compromettere la chiusura delle porte tagliafuoco (Porte REI) mediante dispositivi artigianali (quali zeppe, corde, etc.); Occorre che tali porte siano sempre mantenute chiuse ove sprovviste di appositi elettromagneti;',
    },
    {
      id: 'VIE_ESODO',
      testo:
        'è fatto obbligo mantenere sempre fruibili e sgombere le vie di esodo e le uscite di emergenza;',
    },
    {
      id: 'SEGNALAZIONE_DEFICIENZE',
      testo:
        'ogni lavoratore ha l’obbligo di segnalare immediatamente al datore di lavoro, al dirigente o al preposto le deficienze dei mezzi e dei dispositivi di sicurezza e di lotta antincendio nonché qualsiasi eventuale condizione di pericolo di cui vengano a conoscenza, adoperandosi direttamente, in caso di urgenza, nell’ambito delle proprie competenze e possibilità per eliminare o ridurre le situazioni di pericolo grave e incombente, dandone notizia al rappresentante dei lavoratori per la sicurezza;',
    },
    {
      id: 'NEGLIGENZE_APPALTATORI',
      testo:
        'Segnalare alla Direzione aziendale eventuali negligenze di appaltatori o di addetti alla manutenzione.',
    },
  ];

  window.NOTA_ANTINCENDIO_MISURE_PREVENZIONE = {
    MISURE_PREVENZIONE_CATALOGO,
  };
})();
