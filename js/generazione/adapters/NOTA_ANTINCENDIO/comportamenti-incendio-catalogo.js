/**
 * § 4.1 Comportamenti in emergenza incendio — elenchi A (pre-evacuazione) e B (evacuazione).
 */
(function () {
  'use strict';

  const COMPORTAMENTI_INCENDIO_A_CATALOGO = [
    {
      id: 'PORTE_SCORREVOLI',
      solo_se_porte_scorrevoli: true,
      testo:
        'Le porte scorrevoli installate in corrispondenza dei percorsi di esodo le stesse dovranno essere mantenute aperte già in fase di allerta antincendio attuando le specifiche procedure;',
    },
    {
      id: 'FIAMME_FUMO',
      testo:
        'In presenza di fiamme o fumo, allontanarsi rapidamente dal locale chiudendo la porta dietro di sé ed attivare le procedure di emergenza;',
    },
    {
      id: 'FUMO_VIE_ESODO',
      testo:
        "In presenza di fumo sulle vie di esodo in quantità tale da rendere difficoltosa la respirazione ricordare che in basso l'aria è maggiormente respirabile;",
    },
    {
      id: 'RESTARE_IN_LOCALE',
      testo:
        'Nel caso non fosse possibile lasciare il locale per impedimenti dovuti a fiamme, fumo e calore, restare nell’ambiente in cui ci si trova chiudendo la porta di accesso e, se possibile, sigillando eventuali fessure con indumenti (possibilmente bagnati);',
    },
    {
      id: 'FINESTRE',
      testo:
        'Le finestre, se il locale non è invaso dal fumo, devono essere mantenute chiuse, salvo il tempo necessario a segnalare la presenza ad eventuali soccorritori;',
    },
    {
      id: 'VIETATO_SPEGNERE',
      testo:
        'E’ vietato, a chiunque non abbia una preparazione specifica, tentare di spegnere gli incendi con le dotazioni mobili esistenti ed è comunque vietato usare acqua comune per spegnere eventuali focolai di incendio in prossimità di apparecchiature o quadri elettrici;',
    },
    {
      id: 'ESTINTORI_PERSONE',
      testo:
        'Non utilizzare mai estintori sulle persone cui hanno preso fuoco gli abiti. In tale evenienza il soggetto dovrà essere steso a terra facendolo rotolare per soffocare le fiamme levando ossigeno;',
    },
    {
      id: 'ADDETTI_INTERVENTO',
      testo:
        'Gli addetti antincendio, senza mettere a rischio la loro ed altrui incolumità, intervengono sul focolaio d’incendio con i mezzi di estinzione portatili disponibili nel luogo di lavoro;',
    },
  ];

  const COMPORTAMENTI_INCENDIO_B_CATALOGO = [
    { id: 'CALMA', testo: 'mantenere la calma;' },
    {
      id: 'ORDINE_EVACUAZIONE',
      testo:
        "al segnale/ordine di evacuazione abbandonare l'area senza indugi, ordinatamente e senza corre o gridare, procedendo verso le uscite seguendo le indicazioni degli addetti alle emergenze",
    },
    {
      id: 'USCITA_SENZA_INGOMBRI',
      testo:
        'Uscire dal sito senza portare pacchi ingombranti, ombrelli, borse o materiale voluminoso;',
    },
    {
      id: 'ADDETTI_USCITA',
      testo: 'Avviarsi verso l’uscita seguendo le indicazioni degli Addetti alle emergenze;',
    },
    {
      id: 'ASCENSORI',
      solo_se_ascensori: true,
      testo: 'È vietato l’utilizzo degli ascensori;',
    },
    {
      id: 'VIE_FUGA',
      testo: "Non percorrere le vie di fuga, in senso contrario all'esodo;",
    },
    { id: 'NON_OSTRUIRE', testo: 'Non ostruire i percorsi;' },
    {
      id: 'PUNTO_RACCOLTA',
      testo:
        'Recarsi ordinatamente presso il punto di raccolta per poter procedere ad un appello nominale e ricevere eventuali ulteriori indicazioni.',
    },
  ];

  window.NOTA_ANTINCENDIO_COMPORTAMENTI_INCENDIO = {
    COMPORTAMENTI_INCENDIO_A_CATALOGO,
    COMPORTAMENTI_INCENDIO_B_CATALOGO,
  };
})();
