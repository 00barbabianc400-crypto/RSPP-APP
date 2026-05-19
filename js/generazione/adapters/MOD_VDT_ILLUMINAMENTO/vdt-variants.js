/**
 * Testi che differiscono tra versione VDT e NON VDT nel template Word.
 * Riferimento: fields-map.md §3
 */
(function () {
  'use strict';

  window.VDT_VARIANTS = [
    {
      id: 'titolo_modulo',
      label: 'Titolo modulo (copertina)',
      sezione: 'Copertina',
      vdt: 'Analisi delle postazioni munite di videoterminale e dei livelli di illuminamento',
      nonVdt: 'Analisi dei livelli di illuminamento delle postazioni di lavoro',
    },
    {
      id: 'cap2_titolo',
      label: 'Titolo cap. 2 ILLUMINAMENTO',
      sezione: 'Cap. 2',
      vdt: 'ILLUMINAMENTO E VIDEOTERMINALI',
      nonVdt: 'ILLUMINAMENTO',
    },
    {
      id: 'premessa_ergonomia',
      label: 'Premessa — indagini ergonomia',
      sezione: '§1 Premessa',
      vdt: 'indagini sull\'ergonomia delle postazioni al videoterminale e sui livelli di illuminamento',
      nonVdt: 'indagini sull\'ergonomia delle postazioni di lavoro (comprensive anche di videoterminali) e sui livelli di illuminamento',
    },
    {
      id: 'premessa_nota_assenza',
      label: 'Premessa — nota assenza VDT',
      sezione: '§1 Premessa',
      vdt: '(non aggiunta — presenza VDT sistematici)',
      nonVdt: 'Dall\'analisi del ciclo produttivo della società si è rilevata l\'assenza di gruppi omogenei di lavoratori classificabili come videoterminalisti, in quanto se pur presenti sistemi informatici nella struttura, essi vengono utilizzati in modo sistematico o abituale per meno di 20 ore/settimana.',
      onlyNonVdt: true,
    },
    {
      id: 'intro_21',
      label: '§2.1 Introduzione illuminamento / VDT',
      sezione: '§2.1',
      vdt: 'Testo su definizione videoterminalista (D.Lgs. 81/08), soglia 20 h/sett., visite mediche biennali.',
      nonVdt: 'Testo su obblighi generali di illuminazione (D.Lgs. 81/08, Allegato IV), senza riferimento ai videoterminali.',
    },
    {
      id: 'ergonomia_23',
      label: '§2.3 Principi ergonomici VDT',
      sezione: '§2.3',
      vdt: 'Sezione ergonomia VDT presente nel documento Word.',
      nonVdt: 'Paragrafo introduttivo: assenza di videoterminalisti sistematici, con riferimento ai principi ergonomici per idoneità della postazione.',
      onlyNonVdt: true,
    },
    {
      id: 'igiene_24',
      label: '§2.4 Igiene del lavoro',
      sezione: '§2.4',
      vdt: 'Titolo: «Igiene del lavoro al videoterminale».',
      nonVdt: 'Titolo: «Igiene del lavoro» + nota finale su assenza di videoterminalisti sistematici.',
    },
    {
      id: 'misure_352',
      label: '§3.5.2 Titolo risultati misure',
      sezione: '§3.5.2',
      vdt: 'Risultati delle misure per le postazioni videoterminali',
      nonVdt: 'Risultati delle misure per le postazioni DI LAVORO',
    },
    {
      id: 'conclusioni',
      label: '§4 Conclusioni',
      sezione: '§4',
      vdt: '«Dall\'analisi condotta sulle postazioni al VDT… è emerso che…» + riferimenti a registro manutenzione monitor.',
      nonVdt: '«Dall\'analisi condotta sulle postazioni di lavoro… si può quindi affermare che…» + nota assenza videoterminalisti sistematici.',
    },
    {
      id: 'strumento_34',
      label: '§3.4 Strumentazione (lampade)',
      sezione: '§3.4',
      vdt: 'lampade al neon / LED e lampade da tavolo',
      nonVdt: 'lampade al neon e lampade da tavolo',
    },
  ];
})();
