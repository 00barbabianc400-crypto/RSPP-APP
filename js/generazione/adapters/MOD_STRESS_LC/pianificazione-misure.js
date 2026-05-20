/**
 * Catalogo misure §6.4 «In particolare la Direzione si è attivata per:»
 * Output: elenco puntato continuo (• su ogni riga, senza intestazioni di area).
 */
(function () {
  'use strict';

  const PIANIFICAZIONE_MISURE_GROUPS = [
    {
      id: 'FM1',
      title: 'Generale',
      hint: 'Interventi trasversali: collegarli agli indicatori aziendali (assenze, rotazione, formazione) emersi dal questionario.',
      items: [
        { id: 'FM1_01', text: 'Riorganizzare le attività in termini di carico del lavoro, tempi e risorse.' },
        { id: 'FM1_02', text: 'Adeguamento delle attrezzature e strumentazioni presenti o dei tempi di esecuzione del compito.' },
        { id: 'FM1_03', text: 'Rotazione, implementazione della mansione.' },
        { id: 'FM1_04', text: 'Ricognizione di documenti che descrivano eventuali cambiamenti intercorsi nelle procedure, processi e flussi di lavoro relativi a specifiche attività.' },
        { id: 'FM1_05', text: 'Ricognizione e divulgazione chiara degli eventuali cambiamenti intercorsi nelle procedure, ruoli e compiti assegnati a ciascun lavoratore.' },
        { id: 'FM1_06', text: 'Formazione sulle skills e procedure propedeutiche.' },
      ],
    },
    {
      id: 'FM2',
      title: 'Pianificazione dei compiti',
      hint: 'Contestualizzare se in CONTENUTO risultano criticità su pianificazione, carico, pause o lavoro da remoto.',
      items: [
        { id: 'FM2_01', text: 'Interventi sui tempi o sulle variazioni dei carichi anche implementando l\'autonomia del lavoratore nell\'esecuzione dei compiti.' },
        { id: 'FM2_02', text: 'Identificazioni di attività secondarie da effettuare nei tempi di inattività, anche su proposta dei lavoratori in linea con le esigenze aziendali.' },
        { id: 'FM2_03', text: 'Possibilità di rotazione del personale o inserimento di pause durante il turno.' },
        { id: 'FM2_04', text: 'Migliorare la pianificazione dei compiti e se possibile implementare l\'autonomia del lavoratore.' },
        { id: 'FM2_05', text: 'Inserimento pause durante il turno di lavoro.' },
        { id: 'FM2_06', text: 'Revisione e ridistribuzione dei carichi di lavoro in funzione delle competenze individuali.' },
        { id: 'FM2_07', text: 'Effettuare un\'attenta valutazione delle situazioni di sovraccarico lavorativo.' },
        { id: 'FM2_08', text: 'Identificazione delle responsabilità, formazione e comunicazione.' },
        { id: 'FM2_09', text: 'Stabilire in maniera chiara e condivisa le fasce orarie in cui i lavoratori da remoto siano disponibili, garantendo il diritto alla disconnessione.' },
      ],
    },
    {
      id: 'FM3',
      title: 'Carico / ritmo di lavoro',
      hint: 'Usare se compaiono criticità su ritmo, variazioni impreviste del carico o turni.',
      items: [
        { id: 'FM3_01', text: 'Ricognizione e divulgazione chiara degli eventuali cambiamenti intercorsi nelle procedure, ruoli e compiti assegnati a ciascun lavoratore.' },
        { id: 'FM3_02', text: 'Programmazione dell\'orario di lavoro per conciliazione vita/lavoro, dove possibile implementare flessibilità.' },
        { id: 'FM3_03', text: 'Programmazione orario di lavoro e comunicazione ai lavoratori.' },
        { id: 'FM3_04', text: 'Limitare il più possibile variazioni, corretta pianificazione dei compiti.' },
        { id: 'FM3_05', text: 'Implementazione del sistema informativo e partecipativo dei lavoratori coinvolti.' },
        { id: 'FM3_06', text: 'Favorire una migliore organizzazione dei turni di lavoro, al fine di consentire un maggior riposo e garantire il recupero del lavoratore.' },
      ],
    },
    {
      id: 'FM4',
      title: 'Orario di lavoro',
      hint: 'Collegare a criticità su orario, comunicazione interna, formazione e aggiornamenti informativi.',
      items: [
        { id: 'FM4_01', text: 'Individuazione di momenti e strumenti che agevolino il livello di conoscenza dell\'organigramma aziendale e verifica congruità con la realtà.' },
        { id: 'FM4_02', text: 'Ricognizione di documenti che descrivano procedure, processi e flussi di lavoro e diffusione ai lavoratori.' },
        { id: 'FM4_03', text: 'Individuazione di momenti e strumenti (mail aziendale, circolari, intranet, ecc.) che agevolino il processo di diffusione.' },
        { id: 'FM4_04', text: 'Comunicazione interna in precisi periodi dell\'anno o verifica obiettivi.' },
        { id: 'FM4_05', text: 'Individuazione chiara delle responsabilità, procedure, processi e relative risorse.' },
        { id: 'FM4_06', text: 'Programmazione di incontri/momenti di confronto tra i lavoratori e i loro dirigenti.' },
        { id: 'FM4_07', text: 'Oltre alla formazione obbligatoria, prevedere corsi di formazione trasversali in linea con gli obiettivi aziendali accessibili a tutti i lavoratori.' },
        { id: 'FM4_08', text: 'Adozione del codice di comportamento da parte del DL il quale affida l\'applicazione ai dirigenti e indica le procedure che i lavoratori possono adottare.' },
        { id: 'FM4_09', text: 'Individuazione di una persona o ufficio competente e di fiducia e ne dà la massima divulgazione' },
        { id: 'FM4_10', text: 'Formazione ai nuovi arrivati sulle skills necessarie.' },
        { id: 'FM4_11', text: 'Predisposizione di incontri/momenti di confronto sulle necessità lavorative insorte.' },
        { id: 'FM4_12', text: 'Fornire ai lavoratori aggiornamenti precisi e puntuali su ciò che sta accadendo (es. procedure) e sulle misure implementate.' },
      ],
    },
    {
      id: 'FM5',
      title: 'Funzione e cultura organizzativa',
      hint: 'Per criticità su organigramma, obiettivi, coordinamento e cultura della sicurezza.',
      items: [
        { id: 'FM5_01', text: 'Diffusione organigramma, obiettivi e procedure.' },
        { id: 'FM5_02', text: 'Ricognizione e diffusione chiara dei compiti, responsabilità e risultati da raggiungere in funzione delle restrizioni e procedure imposte.' },
        { id: 'FM5_03', text: 'Formazione nella gestione di più ruoli e informativa rispetto alle responsabilità che queste comportano.' },
        { id: 'FM5_04', text: 'Momenti di coordinamento tra dirigenti e preposti.' },
        { id: 'FM5_05', text: 'Condivisione dei criteri di valutazione della dirigenza in merito alla gestione del personale.' },
        { id: 'FM5_06', text: 'Diffondere documenti sull\'utilizzo dei DPI, attrezzature e rispetto della normativa su salute e sicurezza.' },
      ],
    },
    {
      id: 'FM6',
      title: 'Ruolo nell\'ambito dell\'organizzazione',
      hint: 'Se emergono criticità su chiarezza del ruolo, responsabilità e valutazione.',
      items: [
        { id: 'FM6_01', text: 'Identificare obiettivi di carriera.' },
        { id: 'FM6_02', text: 'Sviluppare attività formative che stimolino gli interessi di crescita e tengano conto delle necessità formative del lavoratore.' },
        { id: 'FM6_03', text: 'Garantire una regolare valutazione delle prestazioni.' },
        { id: 'FM6_04', text: 'Pianificare e condividere procedure chiare per un equo sviluppo di carriera.' },
        { id: 'FM6_05', text: 'Sostenere i lavoratori nel percorso di sviluppo anche attraverso attività di coaching e mentoring.' },
        { id: 'FM6_06', text: 'Fornire informazioni rispetto le possibili opportunità di avanzamento di carriera.' },
      ],
    },
    {
      id: 'FM7',
      title: 'Evoluzione della carriera',
      hint: 'Per criticità su crescita, formazione e percorsi di carriera.',
      items: [
        { id: 'FM7_01', text: 'Implementazione della conoscenza da parte dei lavoratori del ciclo produttivo e delle risorse presenti.' },
        { id: 'FM7_02', text: 'Valorizzare l\'esperienza di ogni lavoratore e implementare l\'autonomia.' },
        { id: 'FM7_03', text: 'Implementazione del sistema informativo anche in merito alle motivazioni delle decisioni prese, che limiti eventuali resistenze agite dai lavoratori.' },
        { id: 'FM7_04', text: 'Programmazione di incontri/momenti di confronto tra i lavoratori e i loro dirigenti.' },
        { id: 'FM7_05', text: 'Condivisione dei protocolli, procedure e criteri di valutazione del lavoro svolto dai singoli lavoratori.' },
        { id: 'FM7_06', text: 'Predisposizione di incontri/momenti di confronto sulle necessità lavorative insorte.' },
        { id: 'FM7_07', text: 'Formazione del dirigente in merito al codice etico e sua applicazione anche con l\'ausilio di un suo referente interno.' },
        { id: 'FM7_08', text: 'Il dirigente si preoccupa della gestione dei conflitti e attiva le procedure di contenimento/contrasto.' },
        { id: 'FM7_09', text: 'Presenza di procedure e politiche in grado di offrire sostegno adeguato ai lavoratori.' },
        { id: 'FM7_10', text: 'Introduzione di una policy aziendale che assicuri allo staff adeguata protezione e che contribuisca ad inibire forme di discriminazione e violenza.' },
      ],
    },
    {
      id: 'FM8',
      title: 'Autonomia decisionale e controllo',
      hint: 'Per criticità su autonomia, controllo e partecipazione alle decisioni.',
      items: [
        { id: 'FM8_01', text: 'Possibilità di discutere e affrontare le problematiche lavorative (in riunioni e/o incontri individuali).' },
        { id: 'FM8_02', text: 'Identificazione e intervento tempestivo sui conflitti.' },
        { id: 'FM8_03', text: 'Possibile formazione sulla gestione dei conflitti.' },
        { id: 'FM8_04', text: 'Favorire la conoscenza da parte dei lavoratori delle modalità di accesso alle informazioni, regole e procedure utili alle loro problematiche.' },
        { id: 'FM8_05', text: 'Presenza di procedure e politiche in grado di offrire sostegno adeguato ai lavoratori.' },
        { id: 'FM8_06', text: 'Sviluppare una policy aziendale sulla violenza e le aggressioni e assicurarsi che tutti i lavoratori ne siano al corrente e che la rispettino.' },
        { id: 'FM8_07', text: 'Procedure di identificazione e intervento tempestivo sui conflitti.' },
        { id: 'FM8_08', text: 'Chiara progettazione del lavoro e dei compiti.' },
        { id: 'FM8_09', text: 'Definizione condivisa degli obiettivi e delle responsabilità.' },
        { id: 'FM8_10', text: 'Promozione da parte dell\'azienda di comportamenti positivi sul lavoro, per evitare conflitti e garantire correttezza nei comportamenti.' },
        { id: 'FM8_11', text: 'Esistenza di sistemi per favorire la segnalazione, da parte dei lavoratori, di insorgenza di comportamenti inaccettabili.' },
      ],
    },
    {
      id: 'FM9',
      title: 'Rapporti interpersonali',
      hint: 'Per criticità su conflitti, supporto, comunicazione e clima relazionale.',
      items: [
        { id: 'FM9_01', text: 'Revisione e ridistribuzione del carico di lavoro.' },
        { id: 'FM9_02', text: 'Promozione, ove possibile, di forme di lavoro da remoto.' },
        { id: 'FM9_03', text: 'Formare i lavoratori da remoto su come lavorare da casa in modo sicuro ed efficace, prendendo in considerazioni i rischi ergonomici, fisici e di natura psicosociale.' },
        { id: 'FM9_04', text: 'Fornire ai manager indicazioni su come interagire correttamente ed essere da guida e supporto per i lavoratori da remoto.' },
        { id: 'FM9_05', text: 'Stabilire in maniera chiara e condivisa le fasce orarie in cui i lavoratori da remoto siano disponibili, garantendo il diritto alla disconnessione e la conciliazione dei tempi di vita.' },
      ],
    },
    {
      id: 'FM10',
      title: 'Interfaccia casa / lavoro',
      hint: 'Se emergono criticità su equilibrio vita-lavoro e lavoro agile.',
      items: [
        { id: 'FM10_01', text: 'Fornire idonea dotazione tecnologica per lo svolgimento del lavoro da remoto.' },
        { id: 'FM10_02', text: 'Prevedere programmi di formazione/aggiornamento sulla strumentazione tecnologica da utilizzare per il lavoro da remoto.' },
        { id: 'FM10_03', text: 'Considerare sessioni formative/informative rispetto alle modalità organizzative e gestionali connesse al lavoro da remoto.' },
        { id: 'FM10_04', text: 'Stabilire modalità di indirizzo/coordinamento e/o verifica/rendicontazione delle attività da remoto tra i lavoratori ed il responsabile.' },
        { id: 'FM10_05', text: 'Identificare le attività che possono essere effettuate da remoto.' },
        { id: 'FM10_06', text: 'Introdurre misure tecniche e organizzative necessarie per assicurare la disconnessione del lavoratore dalle strumentazioni tecnologiche di lavoro.' },
        { id: 'FM10_07', text: 'Fornire un\'informativa sulla salute e sicurezza relativa al lavoro da remoto.' },
        { id: 'FM10_08', text: 'Incoraggiare le interazioni sociali dei lavoratori da remoto anche attraverso la modalità virtuale.' },
      ],
    },
    {
      id: 'FM11',
      title: 'Lavoro da remoto e innovazione tecnologica',
      hint: 'Specifico per organizzazione del lavoro agile, strumenti e sicurezza da remoto.',
      items: [
        { id: 'FM11_01', text: 'Fornire idonea dotazione tecnologica per lo svolgimento del lavoro da remoto.' },
        { id: 'FM11_02', text: 'Prevedere programmi di formazione/aggiornamento sulla strumentazione tecnologica da utilizzare per il lavoro da remoto.' },
        { id: 'FM11_03', text: 'Considerare sessioni formative/informative rispetto alle modalità organizzative e gestionali connesse al lavoro da remoto.' },
        { id: 'FM11_04', text: 'Stabilire modalità di indirizzo/coordinamento e/o verifica/rendicontazione delle attività da remoto tra i lavoratori ed il responsabile.' },
        { id: 'FM11_05', text: 'Identificare le attività che possono essere effettuate da remoto.' },
        { id: 'FM11_06', text: 'Introdurre misure tecniche e organizzative necessarie per assicurare la disconnessione del lavoratore dalle strumentazioni tecnologiche di lavoro.' },
        { id: 'FM11_07', text: 'Fornire un\'informativa sulla salute e sicurezza relativa al lavoro da remoto.' },
        { id: 'FM11_08', text: 'Incoraggiare le interazioni sociali dei lavoratori da remoto anche attraverso la modalità virtuale.' },
      ],
    },
  ];

  function allMisureItems() {
    const out = [];
    for (const g of PIANIFICAZIONE_MISURE_GROUPS) {
      for (const it of g.items) {
        out.push({ ...it, groupId: g.id, groupTitle: g.title, groupHint: g.hint });
      }
    }
    return out;
  }

  function defaultMisureMap() {
    const m = {};
    for (const it of allMisureItems()) m[it.id] = it.text;
    return m;
  }

  /** @param {Record<string, string|boolean|null|undefined>} wizardMisure */
  function buildPianificazioneMisureElenco(wizardMisure) {
    const w = wizardMisure && typeof wizardMisure === 'object' ? wizardMisure : {};
    const lines = [];
    for (const it of allMisureItems()) {
      const raw = Object.prototype.hasOwnProperty.call(w, it.id) ? w[it.id] : it.text;
      if (raw === false || raw === null) continue;
      const t = String(raw ?? '').trim();
      if (!t) continue;
      lines.push('•\t' + t);
    }
    return lines.join('\n');
  }

  window.GEN_STRESS_MISURE = {
    PIANIFICAZIONE_MISURE_GROUPS,
    allMisureItems,
    defaultMisureMap,
    buildPianificazioneMisureElenco,
  };
})();
