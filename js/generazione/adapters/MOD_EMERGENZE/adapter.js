/**
 * Adapter MOD_EMERGENZE — Piano di gestione delle emergenze (stub iniziale).
 */
(function () {
  'use strict';

  const CODICE = 'MOD_EMERGENZE';
  const NOME = 'Piano di gestione delle emergenze';

  const PARAGRAFO_PREMESSA_COORD_INOLTRE =
    'Inoltre, per attività facenti capo a diversi Datori di Lavoro ubicati nello stesso edificio, '
    + 'il p.to 8 del p.to 1.3 dell\'Allegato I del D.M. 02/09/2021, prevede che vi sia la collaborazione '
    + 'ed il coordinamento tra tutte le organizzazioni che occupano l\'edificio per la realizzazione '
    + 'delle esercitazioni antincendio';

  const PARAGRAFO_PREMESSA_COORD_RIMANDO =
    'Per maggiori dettagli si rimanda al Piano di emergenza coordinato predisposto dalla struttura.';

  function pianoEmergenzaCoordinatoSi(v) {
    return v === true || v === 'true' || v === 1 || v === '1';
  }

  /** Incluso nel Word solo se è presente l’allarme generale (riusabile in altre sezioni). */
  const TESTO_ALLARME_GENERALE_OR_SI = 'l\u2019allarme generale o ';

  function allarmeGeneraleSi(v) {
    return v === true || v === 'true' || v === 1 || v === '1';
  }

  function boolSi(v) {
    return allarmeGeneraleSi(v);
  }

  function normalizeSegnalazioneDestinatario(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'posto_chiamata' || s === 'posto') return 'posto_chiamata';
    if (s === 'responsabile') return 'responsabile';
    return 'nessuno';
  }

  function testoRuoloSegnalazione(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'Posto di chiamata';
      case 'responsabile':
        return 'Responsabile delle emergenze';
      default:
        return '';
    }
  }

  function testoAllarmeGeneraleOr(wizard) {
    return allarmeGeneraleSi(wizard?.allarme_generale) ? TESTO_ALLARME_GENERALE_OR_SI : '';
  }

  function premessaPianoCoordinatoFields(wizard) {
    const si = pianoEmergenzaCoordinatoSi(wizard?.piano_emergenza_coordinato);
    return {
      PARAGRAFO_PREMESSA_COORD_INOLTRE: si ? PARAGRAFO_PREMESSA_COORD_INOLTRE : '',
      PARAGRAFO_PREMESSA_COORD_RIMANDO: si ? PARAGRAFO_PREMESSA_COORD_RIMANDO : '',
    };
  }

  const DEFAULT_IMMOBILE_ADIBITO_A = 'ad ufficio';

  function immobileAdibitoA(wizard) {
    const raw =
      wizard?.immobile_adibito_a != null ? String(wizard.immobile_adibito_a).trim() : '';
    return raw || DEFAULT_IMMOBILE_ADIBITO_A;
  }

  function sezione12Fields(wizard) {
    return {
      TESTO_RUOLO_SEGNALAZIONE: testoRuoloSegnalazione(wizard),
      TESTO_ALLARME_GENERALE_OR: testoAllarmeGeneraleOr(wizard),
    };
  }

  const DEFAULT_RIGHE_PIANO_LUOGHI = [
    {
      edificio: 'Interrato',
      attivita: 'Archivi e magazzini ad uso delle unità produttive insediate',
      numero_persone: 'x',
    },
    {
      edificio: 'Terra',
      attivita: 'Uffici\nServizi igienici\nLocale tecnico',
      numero_persone: 'x',
    },
    {
      edificio: 'Primo',
      attivita: 'Uffici\nServizi igienici\nLocale tecnico',
      numero_persone: 'x',
    },
    {
      edificio: 'Secondo',
      attivita: 'Uffici\nServizi igienici\nLocale tecnico',
      numero_persone: 'x',
    },
    {
      edificio: 'Terzo',
      attivita: 'Uffici\nServizi igienici\nLocale tecnico',
      numero_persone: 'x',
    },
    {
      edificio: 'Quarto',
      attivita: 'Uffici\nServizi igienici\nLocale tecnico',
      numero_persone: 'x',
    },
    {
      edificio: 'Quinto',
      attivita: 'Uffici\nServizi igienici\nLocale tecnico',
      numero_persone: 'x',
    },
    {
      edificio: 'Sesto',
      attivita: 'Locali tecnici\nLocali ad uso delle unità produttive insediate',
      numero_persone: 'x',
    },
  ];

  function normalizeRigaPianoLuoghi(r) {
    return {
      edificio: String(r?.edificio || '').trim(),
      attivita: String(r?.attivita ?? '').trim(),
      numero_persone: String(r?.numero_persone ?? '').trim(),
    };
  }

  function normalizeRighePianoLuoghiList(list) {
    if (!Array.isArray(list) || !list.length) {
      return DEFAULT_RIGHE_PIANO_LUOGHI.map((row) => ({ ...row }));
    }
    return list.map(normalizeRigaPianoLuoghi);
  }

  function righePianoLuoghiForTemplate(wizard) {
    const rows = normalizeRighePianoLuoghiList(wizard?.righe_piano_luoghi);
    return rows.map((row) => ({
      edificio: row.edificio,
      attivita: row.attivita,
      numero_persone: row.numero_persone || 'x',
    }));
  }

  // ── §2.1 Affollamento ────────────────────────────────────────────────────

  const DENSITA_AFFOLLAMENTO_OPTIONS = [
    { value: '2,0', label: 'Ambiti all\'aperto destinati a spettacolo o intrattenimento, delimitati e privi di posti a sedere' },
    { value: '2,0', label: 'Locali al chiuso di spettacolo o intrattenimento privi di posti a sedere e arredi, con qf ≤ 50 MJ/m²' },
    { value: '1,2', label: 'Ambiti per mostre, esposizioni' },
    { value: '1,2', label: 'Ambiti di spettacolo o intrattenimento con arredi o qf > 50 MJ/m²' },
    { value: '0,7', label: 'Ambiti adibiti a ristorazione' },
    { value: '0,4', label: 'Attività scolastica e laboratori senza posti a sedere' },
    { value: '0,4', label: 'Sale d\'attesa' },
    { value: '0,4', label: 'Uffici' },
    { value: '0,4', label: 'Piccole attività commerciali al dettaglio con settore alimentare o misto' },
    { value: '0,2', label: 'Medie e grandi attività commerciali al dettaglio con settore alimentare o misto' },
    { value: '0,2', label: 'Attività commerciali al dettaglio senza settore alimentare' },
    { value: '0,2', label: 'Sale di lettura di biblioteche, archivi' },
    { value: '0,2', label: 'Ambulatori' },
    { value: '0,1', label: 'Attività commerciali all\'ingrosso' },
    { value: '0,1', label: 'Piccole attività commerciali al dettaglio con specifica gamma merceologica non alimentare' },
    { value: '0,05', label: 'Civile abitazione' },
  ];

  function rischioIncendioBasso(wizard) {
    const v = wizard?.rischio_incendio_basso;
    if (v === null || v === undefined) return null;
    return v === true || v === 'true' || v === 1 || v === '1';
  }

  const TESTO_P1_BASSO =
    'In relazione a quanto previsto dal punto 4.2.2. del D.M 03/09/2021, l\u2019affollamento massimo di ciascun locale \u00e8 stato determinato moltiplicando la densit\u00e0 di affollamento pari a 0,7 persone/m\u00b2 per la superficie lorda del locale stesso.';

  const TESTO_P2_STANDARD =
    'Il datore di lavoro ha dichiarato un valore dell\u2019affollamento inferiore a quanto previsto, impegnandosi a verificare e rispettarlo per ogni locale ed in ogni condizione d\u2019esercizio dell\u2019attivit\u00e0.';

  const TESTO_P2_CONTEGGIO =
    'Il datore di lavoro si impegna a verificare e rispettare tale limite per ogni locale ed in ogni condizione d\u2019esercizio dell\u2019attivit\u00e0.';

  function buildParafoAffollamento1(wizard) {
    const basso = rischioIncendioBasso(wizard);
    if (basso === null) return '';
    if (basso === true) return TESTO_P1_BASSO;
    const modalita = wizard?.affollamento_modalita || 'densita';
    if (modalita === 'densita') {
      const densita = String(wizard?.densita_affollamento || '0,4').trim();
      return (
        'In relazione a quanto previsto, l\u2019affollamento massimo di ciascun locale \u00e8 stato determinato '
        + 'moltiplicando la densit\u00e0 di affollamento pari a ' + densita
        + ' persone/m\u00b2 per la superficie lorda del locale stesso.'
      );
    }
    const n = String(wizard?.numero_affollamento || '30').trim();
    return (
      'In relazione a quanto previsto, il numero massimo di persone ammesse nei locali \u00e8 pari a ' + n + ' persone.'
    );
  }

  function buildParafoAffollamento2(wizard) {
    const basso = rischioIncendioBasso(wizard);
    if (basso === null) return '';
    const modalita = wizard?.affollamento_modalita || 'densita';
    if (basso === false && modalita === 'conteggio') return TESTO_P2_CONTEGGIO;
    return TESTO_P2_STANDARD;
  }

  function sezione21AffollamentoFields(wizard) {
    const p1Override = wizard?.paragrafo_affollamento_1;
    const p2Override = wizard?.paragrafo_affollamento_2;
    const basso = rischioIncendioBasso(wizard);
    // Se il wizard cambia scenario, invalida gli override manualmente impostati
    // (l'override è mantenuto solo finché l'utente non tocca uno switch principale)
    return {
      PARAGRAFO_AFFOLLAMENTO_1:
        p1Override != null && basso !== null ? String(p1Override) : buildParafoAffollamento1(wizard),
      PARAGRAFO_AFFOLLAMENTO_2:
        p2Override != null && basso !== null ? String(p2Override) : buildParafoAffollamento2(wizard),
    };
  }

  function sezione21Fields(wizard) {
    return {
      IMMOBILE_ADIBITO_A: immobileAdibitoA(wizard),
      righe_piano_luoghi: righePianoLuoghiForTemplate(wizard),
      ...sezione21AffollamentoFields(wizard),
    };
  }

  // ── §2.2 Rilevazione e diffusione allarme ───────────────────────────────

  const DEFAULT_ALLARME_SENZA = [
    'La sede operativa \u00e8 sprovvista di impianti di rilevazione e di diffusione dell\u2019allarme.',
    'La gestione di un eventuale incendio \u00e8 descritta al paragrafo 2.5.',
  ];

  const DEFAULT_ALLARME_CON = [
    'All\u2019interno della sede \u00e8 presente un impianto di rilevazione e di diffusione dell\u2019allarme incendio.',
    'Tale sistema \u00e8 settato in modo da allertare gli addetti alle emergenze (tramite segnale di preallerta ed indicazione del locale interessato) ed attivare automaticamente il segnale di evacuazione (allarme antincendio).',
    'Le procedure di dettaglio sul funzionamento della centralina antincendio sono fornite agli addetti alle emergenze.',
    'L\u2019ubicazione dei pulsanti di allarme incendio e della centralina antincendio \u00e8 indicata nelle planimetrie di evacuazione esposte in sede',
  ];

  function normalizeRilevazioneAllarme(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'senza' || s === 'senza_impianto') return 'senza';
    if (s === 'con' || s === 'con_impianto') return 'con';
    return null;
  }

  function bloccoTestoToParagrafi(testo, defaults) {
    const raw = testo != null ? String(testo).trim() : '';
    if (!raw) return defaults.map((p) => p);
    const parts = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return defaults.map((p) => p);
    return defaults.map((_, i) => parts[i] != null ? parts[i] : '');
  }

  function joinBloccoParagrafi(paragrafi) {
    return (paragrafi || []).join('\n\n');
  }

  function getAllarmeSenzaParagrafi(wizard) {
    if (wizard?.testo_blocco_allarme_senza != null) {
      return bloccoTestoToParagrafi(wizard.testo_blocco_allarme_senza, DEFAULT_ALLARME_SENZA);
    }
    return DEFAULT_ALLARME_SENZA.map((p) => p);
  }

  function getAllarmeConParagrafi(wizard) {
    if (wizard?.testo_blocco_allarme_con != null) {
      return bloccoTestoToParagrafi(wizard.testo_blocco_allarme_con, DEFAULT_ALLARME_CON);
    }
    return DEFAULT_ALLARME_CON.map((p) => p);
  }

  function testoBloccoAllarmeSenzaDefault() {
    return joinBloccoParagrafi(DEFAULT_ALLARME_SENZA);
  }

  function testoBloccoAllarmeConDefault() {
    return joinBloccoParagrafi(DEFAULT_ALLARME_CON);
  }

  function sezione22Fields(wizard) {
    const scelta = normalizeRilevazioneAllarme(wizard?.rilevazione_allarme);
    const senza = getAllarmeSenzaParagrafi(wizard);
    const con = getAllarmeConParagrafi(wizard);
    const vuoto = scelta === null;
    return {
      PARAGRAFO_ALLARME_SENZA_1: !vuoto && scelta === 'senza' ? senza[0] || '' : '',
      PARAGRAFO_ALLARME_SENZA_2: !vuoto && scelta === 'senza' ? senza[1] || '' : '',
      PARAGRAFO_ALLARME_CON_1: !vuoto && scelta === 'con' ? con[0] || '' : '',
      PARAGRAFO_ALLARME_CON_2: !vuoto && scelta === 'con' ? con[1] || '' : '',
      PARAGRAFO_ALLARME_CON_3: !vuoto && scelta === 'con' ? con[2] || '' : '',
      PARAGRAFO_ALLARME_CON_4: !vuoto && scelta === 'con' ? con[3] || '' : '',
    };
  }

  // ── §2.3 Lavoratori esposti a rischi particolari ─────────────────────────

  const TESTO_RISCHI_NESSUNO_DEFAULT =
    'Non sono presenti specifiche mansioni che comportano un rischio di incendio particolare '
    + 'e non si rende necessaria l\u2019adozione di ulteriori misure specifiche differenti '
    + 'da quelle previste per tutti i lavoratori.';

  const TESTO_RISCHI_INTRO_DEFAULT =
    'Nella tabella che segue vengono indicati i lavoratori e/o le situazioni che espongono i lavoratori '
    + 'a rischi particolari in caso di emergenza e le misure specifiche adottate dalla societ\u00e0:';

  const DEFAULT_RIGHE_RISCHI_PARTICOLARI = [
    {
      id: 'notte',
      selezionato: true,
      situazione: 'Lavoratori che operano in solitario nel turno di notte',
      misure: 'Dispositivo automatico di chiamata dei soccorsi/ dispositivo di allarme in caso di uomo a terra',
    },
    {
      id: 'manutenzione',
      selezionato: true,
      situazione: 'Lavoratori che operano in solitario in attivit\u00e0 di manutenzione',
      misure: 'Dispositivo automatico di chiamata dei soccorsi/ dispositivo di allarme in caso di uomo a terra',
    },
    {
      id: 'telefono',
      selezionato: true,
      situazione: 'Lavoratori che presidiano aree del sito sprovviste di collegamento telefonico interno o esterno',
      misure: 'Dispositivo automatico di chiamata dei soccorsi/ dispositivo di allarme in caso di uomo a terra',
    },
    {
      id: 'incendio_esplosione',
      selezionato: true,
      situazione: 'Lavoratori che operano in prossimit\u00e0 di locali a rischio di incendio elevato o a rischio di esplosione',
      misure: 'Formazione ed informazione specifica sulle procedure da attuare in caso di incendio o esplosione',
    },
    {
      id: 'alluvione',
      selezionato: true,
      situazione: 'Lavoratori che occupano postazioni in locali sotterranei e semi sotterranei e che possono essere esposti a rischio in caso di alluvione',
      misure: 'Dispositivi di allarme specifici in caso di allagamento',
    },
    {
      id: 'gas',
      selezionato: true,
      situazione: 'Lavoratori che operano in locali ove, in caso di guasto, \u00e8 possibile la fuoriuscita di sostanze tossiche o asfissianti',
      misure: 'Rilevatori di gas nocivi / ossimetri',
    },
  ];

  function normalizeRischiParticolariModalita(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'nessuno' || s === 'no' || s === 'assente') return 'nessuno';
    if (s === 'tabella' || s === 'si' || s === 'presenti') return 'tabella';
    return null;
  }

  function normalizeRigaRischiParticolari(r, idx) {
    const row = r || {};
    return {
      id: String(row.id || 'r' + idx).trim(),
      selezionato: row.selezionato !== false,
      situazione: String(row.situazione || '').trim(),
      misure: String(row.misure || '').trim(),
    };
  }

  function mergeRigheRischiParticolariWizard(wizard) {
    const incoming = wizard?.righe_rischi_particolari;
    if (!Array.isArray(incoming) || !incoming.length) {
      return DEFAULT_RIGHE_RISCHI_PARTICOLARI.map((row) => ({ ...row }));
    }
    const byId = new Map();
    incoming.forEach((r, i) => {
      const n = normalizeRigaRischiParticolari(r, i);
      if (n.id) byId.set(n.id, n);
    });
    const defaults = DEFAULT_RIGHE_RISCHI_PARTICOLARI.map((d) => {
      const w = byId.get(d.id);
      if (w) {
        return {
          id: d.id,
          selezionato: w.selezionato,
          situazione: w.situazione || d.situazione,
          misure: w.misure || d.misure,
        };
      }
      return { ...d, selezionato: false };
    });
    const extra = incoming
      .filter((r, i) => {
        const n = normalizeRigaRischiParticolari(r, i);
        return !DEFAULT_RIGHE_RISCHI_PARTICOLARI.some((d) => d.id === n.id);
      })
      .map((r, i) => normalizeRigaRischiParticolari(r, i));
    return defaults.concat(extra);
  }

  function righeRischiParticolariForTemplate(wizard) {
    return mergeRigheRischiParticolariWizard(wizard)
      .filter((r) => r.selezionato && (String(r.situazione).trim() || String(r.misure).trim()))
      .map((r) => ({
        situazione: r.situazione,
        misure: r.misure,
      }));
  }

  function testoRischiNessuno(wizard) {
    if (wizard?.paragrafo_rischi_nessuno != null) return String(wizard.paragrafo_rischi_nessuno);
    return TESTO_RISCHI_NESSUNO_DEFAULT;
  }

  function testoRischiIntro(wizard) {
    if (wizard?.paragrafo_rischi_intro != null) return String(wizard.paragrafo_rischi_intro);
    return TESTO_RISCHI_INTRO_DEFAULT;
  }

  function sezione23Fields(wizard) {
    const mod = normalizeRischiParticolariModalita(wizard?.rischi_particolari_modalita);
    if (mod === null) {
      return {
        PARAGRAFO_RISCHI_PARTICOLARI_NESSUNO: '',
        PARAGRAFO_RISCHI_PARTICOLARI_INTRO: '',
        righe_rischi_particolari: [],
      };
    }
    if (mod === 'nessuno') {
      return {
        PARAGRAFO_RISCHI_PARTICOLARI_NESSUNO: testoRischiNessuno(wizard),
        PARAGRAFO_RISCHI_PARTICOLARI_INTRO: '',
        righe_rischi_particolari: [],
      };
    }
    return {
      PARAGRAFO_RISCHI_PARTICOLARI_NESSUNO: '',
      PARAGRAFO_RISCHI_PARTICOLARI_INTRO: testoRischiIntro(wizard),
      righe_rischi_particolari: righeRischiParticolariForTemplate(wizard),
    };
  }

  // ── §2.4 Aree ad elevato rischio incendio ─────────────────────────────────

  const TESTO_RISCHI_INCENDIO_NESSUNO_DEFAULT =
    'Non sono presenti aree ad elevato rischio incendio.';

  const DEFAULT_RISCHI_INCENDIO_ALTO = [
    'All\u2019interno della sede si individuano alcune aree ad elevato rischio di incendio per le quali '
    + '(rif. Valutazione del rischio di incendio) si sono resi necessari specifici approfondimenti.',
    'In particolare, l\u2019area XXXXXXXXXXX (descrivere cosa si fa e quali sono le misure di contenimento '
    + 'specifico ovvero no estintori ma sistemi particolari di protezione antincendio come compartimentazioni REI, '
    + 'impianti automatici di spegnimento, o procedure specifiche di gestione e/o di evacuazione).',
  ];

  function normalizeRischiIncendioAltoModalita(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'nessuno' || s === 'no' || s === 'assente') return 'nessuno';
    if (s === 'presenti' || s === 'si' || s === 'tabella') return 'presenti';
    return null;
  }

  function getRischiIncendioAltoParagrafi(wizard) {
    if (wizard?.testo_blocco_rischi_incendio_alto != null) {
      return bloccoTestoToParagrafi(wizard.testo_blocco_rischi_incendio_alto, DEFAULT_RISCHI_INCENDIO_ALTO);
    }
    return DEFAULT_RISCHI_INCENDIO_ALTO.map((p) => p);
  }

  function testoRischiIncendioNessuno(wizard) {
    if (wizard?.paragrafo_rischi_incendio_nessuno != null) {
      return String(wizard.paragrafo_rischi_incendio_nessuno);
    }
    return TESTO_RISCHI_INCENDIO_NESSUNO_DEFAULT;
  }

  function testoBloccoRischiIncendioAltoDefault() {
    return joinBloccoParagrafi(DEFAULT_RISCHI_INCENDIO_ALTO);
  }

  function sezione24Fields(wizard) {
    const mod = normalizeRischiIncendioAltoModalita(wizard?.rischi_incendio_alto_modalita);
    if (mod === null) {
      return {
        PARAGRAFO_RISCHI_INCENDIO_NESSUNO: '',
        PARAGRAFO_RISCHI_INCENDIO_ALTO_1: '',
        PARAGRAFO_RISCHI_INCENDIO_ALTO_2: '',
      };
    }
    if (mod === 'nessuno') {
      return {
        PARAGRAFO_RISCHI_INCENDIO_NESSUNO: testoRischiIncendioNessuno(wizard),
        PARAGRAFO_RISCHI_INCENDIO_ALTO_1: '',
        PARAGRAFO_RISCHI_INCENDIO_ALTO_2: '',
      };
    }
    const alto = getRischiIncendioAltoParagrafi(wizard);
    return {
      PARAGRAFO_RISCHI_INCENDIO_NESSUNO: '',
      PARAGRAFO_RISCHI_INCENDIO_ALTO_1: alto[0] || '',
      PARAGRAFO_RISCHI_INCENDIO_ALTO_2: alto[1] || '',
    };
  }

  // ── §2.5 Persone con esigenze speciali ────────────────────────────────────

  const TESTO_ESIGENZE_NESSUNA_DEFAULT =
    'Non \u00e8 prevista la presenza di persone con esigenze speciali quali ed esempio persone con ridotte '
    + 'capacit\u00e0 sensoriali o motorie e, pertanto, non \u00e8 stato necessario adottare ulteriori misure '
    + 'specifiche di prevenzione e protezione.';

  const TESTO_ESIGENZE_CHIUSURA_DEFAULT =
    'Sono state predisposte specifiche procedure per la gestione di persone con esigenze speciali '
    + '(si rimanda al paragrafo 3 del presente documento).';

  const TESTO_ESIGENZE_INTRO_PUBBLICO =
    'Per la sede, essendo prevista la presenza di persone con esigenze particolari, anche legate al fatto che '
    + 'il luogo di lavoro \u00e8 aperto al pubblico, sono state adottate le seguenti misure aggiuntive:';

  const TESTO_ESIGENZE_INTRO_STANDARD =
    'Per la sede, essendo prevista la presenza di persone con esigenze particolari, '
    + 'sono state adottate le seguenti misure aggiuntive:';

  const DEFAULT_MISURE_ESIGENZE_SPECIALI = [
    { id: 'spazi_calmi', selezionato: true, testo: 'Spazi calmi con compartimentazione REI;' },
    { id: 'segnalatori_ottici', selezionato: true, testo: 'Sistemi di segnalazione potenziati con segnalatori ottici;' },
    { id: 'dispositivi_vibranti', selezionato: true, testo: 'Sistemi di segnalazione potenziati con dispositivi vibranti;' },
    { id: 'evac', selezionato: true, testo: 'Messaggi acustici di evacuazione (sistema EVAC).' },
  ];

  function normalizeEsigenzeSpecialiModalita(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'nessuna' || s === 'no' || s === 'assente') return 'nessuna';
    if (s === 'presenti' || s === 'si') return 'presenti';
    return null;
  }

  function luogoApertoPubblicoSi(v) {
    return v === true || v === 'true' || v === 1 || v === '1';
  }

  function normalizeRigaMisuraEsigenze(r, idx) {
    const row = r || {};
    return {
      id: String(row.id || 'm' + idx).trim(),
      selezionato: row.selezionato !== false,
      testo: String(row.testo || '').trim(),
    };
  }

  function mergeMisureEsigenzeWizard(wizard) {
    const incoming = wizard?.misure_esigenze_speciali;
    if (!Array.isArray(incoming) || !incoming.length) {
      return DEFAULT_MISURE_ESIGENZE_SPECIALI.map((row) => ({ ...row }));
    }
    const byId = new Map();
    incoming.forEach((r, i) => {
      const n = normalizeRigaMisuraEsigenze(r, i);
      if (n.id) byId.set(n.id, n);
    });
    const defaults = DEFAULT_MISURE_ESIGENZE_SPECIALI.map((d) => {
      const w = byId.get(d.id);
      if (w) {
        return { id: d.id, selezionato: w.selezionato, testo: w.testo || d.testo };
      }
      return { ...d, selezionato: false };
    });
    const extra = incoming
      .filter((r, i) => {
        const n = normalizeRigaMisuraEsigenze(r, i);
        return !DEFAULT_MISURE_ESIGENZE_SPECIALI.some((d) => d.id === n.id);
      })
      .map((r, i) => normalizeRigaMisuraEsigenze(r, i));
    return defaults.concat(extra);
  }

  function listaMisureEsigenzeForTemplate(wizard) {
    return mergeMisureEsigenzeWizard(wizard)
      .filter((r) => r.selezionato && r.testo)
      .map((r) => '-\t' + r.testo)
      .join('\n');
  }

  function testoEsigenzeNessuna(wizard) {
    if (wizard?.paragrafo_esigenze_nessuna != null) return String(wizard.paragrafo_esigenze_nessuna);
    return TESTO_ESIGENZE_NESSUNA_DEFAULT;
  }

  function testoEsigenzeChiusura(wizard) {
    if (wizard?.paragrafo_esigenze_chiusura != null) return String(wizard.paragrafo_esigenze_chiusura);
    return TESTO_ESIGENZE_CHIUSURA_DEFAULT;
  }

  function testoEsigenzeIntro(wizard) {
    if (wizard?.paragrafo_esigenze_intro != null) return String(wizard.paragrafo_esigenze_intro);
    return luogoApertoPubblicoSi(wizard?.luogo_aperto_pubblico)
      ? TESTO_ESIGENZE_INTRO_PUBBLICO
      : TESTO_ESIGENZE_INTRO_STANDARD;
  }

  function sezione25Fields(wizard) {
    const mod = normalizeEsigenzeSpecialiModalita(wizard?.esigenze_speciali_modalita);
    const chiusura = mod ? testoEsigenzeChiusura(wizard) : '';
    if (mod === null) {
      return {
        PARAGRAFO_ESIGENZE_NESSUNA: '',
        PARAGRAFO_ESIGENZE_INTRO: '',
        LISTA_MISURE_ESIGENZE: '',
        PARAGRAFO_ESIGENZE_CHIUSURA: '',
      };
    }
    if (mod === 'nessuna') {
      return {
        PARAGRAFO_ESIGENZE_NESSUNA: testoEsigenzeNessuna(wizard),
        PARAGRAFO_ESIGENZE_INTRO: '',
        LISTA_MISURE_ESIGENZE: '',
        PARAGRAFO_ESIGENZE_CHIUSURA: chiusura,
      };
    }
    return {
      PARAGRAFO_ESIGENZE_NESSUNA: '',
      PARAGRAFO_ESIGENZE_INTRO: testoEsigenzeIntro(wizard),
      LISTA_MISURE_ESIGENZE: listaMisureEsigenzeForTemplate(wizard),
      PARAGRAFO_ESIGENZE_CHIUSURA: chiusura,
    };
  }

  // ── §2.6 Misure di protezione (elenchi attive / passive) ─────────────────

  const DEFAULT_PROTEZIONI_ATTIVE = [
    { id: 'estintori', testo: 'Dispositivi di lotta antincendio (estintori a polvere, estintori del tipo a CO2, ecc.)' },
    { id: 'rilevazione', testo: 'Impianti di rilevazione incendi' },
    { id: 'allarme', testo: 'Impianto di allarme antincendio' },
  ];

  const DEFAULT_PROTEZIONI_PASSIVE = [
    { id: 'porte', testo: 'Porte tagliafuoco' },
    { id: 'compartimentazioni', testo: 'Compartimentazioni' },
    { id: 'vie_uscita', testo: 'Vie di uscita ed emergenza' },
    { id: 'segnaletica', testo: 'Segnaletica di sicurezza' },
  ];

  function normalizeVoceProtezione(r, idx) {
    const row = r || {};
    return {
      id: String(row.id || 'p' + idx).trim(),
      testo: String(row.testo || '').trim(),
    };
  }

  function mergeProtezioniList(wizardKey, defaults, wizard) {
    const incoming = wizard?.[wizardKey];
    if (!Array.isArray(incoming) || !incoming.length) {
      return defaults.map((row) => ({ ...row }));
    }
    const byId = new Map();
    incoming.forEach((r, i) => {
      const n = normalizeVoceProtezione(r, i);
      if (n.id) byId.set(n.id, n);
    });
    const merged = defaults.map((d) => {
      const w = byId.get(d.id);
      return w ? { id: d.id, testo: w.testo || d.testo } : { ...d };
    });
    const extra = incoming
      .filter((r, i) => {
        const n = normalizeVoceProtezione(r, i);
        return !defaults.some((d) => d.id === n.id);
      })
      .map((r, i) => normalizeVoceProtezione(r, i));
    return merged.concat(extra);
  }

  function listaProtezioniToText(rows) {
    return (rows || [])
      .filter((r) => String(r.testo || '').trim())
      .map((r) => '\u2022\t' + String(r.testo).trim())
      .join('\n');
  }

  function protezioniAttiveForTemplate(wizard) {
    return mergeProtezioniList('protezioni_attive', DEFAULT_PROTEZIONI_ATTIVE, wizard).map((r) => ({
      testo: r.testo,
    }));
  }

  function protezioniPassiveForTemplate(wizard) {
    return mergeProtezioniList('protezioni_passive', DEFAULT_PROTEZIONI_PASSIVE, wizard).map((r) => ({
      testo: r.testo,
    }));
  }

  function sezione26Fields(wizard) {
    const attive = protezioniAttiveForTemplate(wizard);
    const passive = protezioniPassiveForTemplate(wizard);
    return {
      LISTA_PROTEZIONI_ATTIVE: listaProtezioniToText(attive),
      LISTA_PROTEZIONI_PASSIVE: listaProtezioniToText(passive),
      protezioni_attive: attive,
      protezioni_passive: passive,
    };
  }

  const DEFAULT_LUOGO_CENTRO_COORDINAMENTO = 'RECEPTION';
  const DEFAULT_LUOGO_POSTO_CHIAMATA = 'RECEPTION';
  const DEFAULT_LUOGO_PUNTO_RACCOLTA = "AREA ANTISTANTE L'INGRESSO PRINCIPALE DELLA SALA";

  function luogoCentroCoordinamento(wizard) {
    const raw =
      wizard?.luogo_centro_coordinamento != null
        ? String(wizard.luogo_centro_coordinamento).trim()
        : '';
    return raw || DEFAULT_LUOGO_CENTRO_COORDINAMENTO;
  }

  function luogoPostoChiamata(wizard) {
    const raw =
      wizard?.luogo_posto_chiamata != null ? String(wizard.luogo_posto_chiamata).trim() : '';
    return raw || DEFAULT_LUOGO_POSTO_CHIAMATA;
  }

  function luogoPuntoRaccolta(wizard) {
    const raw =
      wizard?.luogo_punto_raccolta != null ? String(wizard.luogo_punto_raccolta).trim() : '';
    return raw || DEFAULT_LUOGO_PUNTO_RACCOLTA;
  }

  function sezione28Fields(wizard) {
    return {
      LUOGO_CENTRO_COORDINAMENTO: luogoCentroCoordinamento(wizard),
      LUOGO_POSTO_CHIAMATA: luogoPostoChiamata(wizard),
      LUOGO_PUNTO_RACCOLTA: luogoPuntoRaccolta(wizard),
    };
  }

  function normalizeCentraleSegnalazioneIncendio(v) {
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return null;
  }

  function centraleSegnalazioneIncendioSi(wizard) {
    return normalizeCentraleSegnalazioneIncendio(wizard?.centrale_segnalazione_incendio) === true;
  }

  function segnalazioneIncendioImpiantoRivelazioneSi(wizard) {
    return boolSi(wizard?.segnalazione_incendio_impianto_rivelazione);
  }

  function segnalazioneIncendioPostoChiamataEsternoSi(wizard) {
    return boolSi(wizard?.segnalazione_incendio_posto_chiamata_esterno);
  }

  const TESTO_CENTRALE_SEGNALAZIONE_INCENDIO_SI =
    'o il lavoratore che riceve la segnalazione dell\u2019incendio dalla centrale, ';

  const VOCE_IMPIANTO_RIVELAZIONE_SEGNALAZIONE = 'impianto di rivelazione;';
  const VOCE_POSTO_CHIAMATA_ESTERNO_SEGNALAZIONE = 'Posto di chiamata esterno.';

  function testoCentraleSegnalazioneIncendioOr(wizard) {
    return centraleSegnalazioneIncendioSi(wizard) ? TESTO_CENTRALE_SEGNALAZIONE_INCENDIO_SI : '';
  }

  /**
   * Riga DESTINATARIO «Addetto Posto di Chiamata / Responsabile…» — riusa §1.2.
   * Usata in §2.9 (attivazione squadra, richiesta soccorso esterno, ecc.).
   */
  function testoDestinatarioRuoloEmergenza(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'Addetto Posto di Chiamata';
      case 'responsabile':
        return 'Responsabile dell\u2019emergenza';
      default:
        return 'Addetto Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  /** Destinatario nella frase §2.9 segnalazione incendio — riusa §1.2. */
  function testoDestinatarioSegnalazioneIncendio(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'all\u2019addetto al Posto di Chiamata';
      case 'responsabile':
        return 'al Responsabile dell\u2019emergenza';
      default:
        return 'all\u2019addetto al Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function paragrafoQuandoSegnalazioneIncendio(wizard) {
    return (
      'Il testimone dell\u2019evento, '
      + testoCentraleSegnalazioneIncendioOr(wizard)
      + 'segnala l\u2019evento '
      + testoDestinatarioSegnalazioneIncendio(wizard)
      + ' fornendo le seguenti indicazioni:'
    );
  }

  function listaSegnalazioneIncendioOpzionali(wizard) {
    const rows = [];
    if (segnalazioneIncendioImpiantoRivelazioneSi(wizard)) {
      rows.push(VOCE_IMPIANTO_RIVELAZIONE_SEGNALAZIONE);
    }
    if (segnalazioneIncendioPostoChiamataEsternoSi(wizard)) {
      rows.push(VOCE_POSTO_CHIAMATA_ESTERNO_SEGNALAZIONE);
    }
    return rows.map((r) => '\u2022\t' + r).join('\n');
  }

  function normalizeImpiantoGasDistribuzione(v) {
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return null;
  }

  function impiantoGasDistribuzionePresente(wizard) {
    return normalizeImpiantoGasDistribuzione(wizard?.impianto_gas_distribuzione_presente) === true;
  }

  const VOCE_DISATTIVAZIONE_GAS =
    'Eseguire la disattivazione dell\u2019impianto di distribuzione del gas '
    + '(ove presente nei locali di pertinenza diretta);';

  function voceDisattivazioneGas(wizard) {
    return impiantoGasDistribuzionePresente(wizard) ? VOCE_DISATTIVAZIONE_GAS : '';
  }

  /** §2.9 evacuazione — blocco «Addetto al Posto di Chiamata» se §1.2 ≠ Nessuno. */
  function mostraAddettoPostoChiamataEvacuazione(wizard) {
    return normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario) !== 'nessuno';
  }

  function testoDestinatarioComportamentiIncendio(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'Posto di Chiamata';
      case 'responsabile':
        return 'Responsabile dell\u2019emergenza';
      default:
        return 'Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function testoIlDestinatarioEmergenza(wizard) {
    return 'il ' + testoDestinatarioComportamentiIncendio(wizard);
  }

  function voceComportamentiSegnalazioneEvento(wizard) {
    return (
      'segnalare, come indicato nella apposita procedura, l\u2019evento al '
      + testoDestinatarioComportamentiIncendio(wizard)
      + ';'
    );
  }

  function normalizeComportamentiAscensori(v) {
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return null;
  }

  function normalizeComportamentiPorteRei(v) {
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return null;
  }

  function comportamentiAscensoriEsodoSi(wizard) {
    return normalizeComportamentiAscensori(wizard?.comportamenti_vietato_ascensori) === true;
  }

  function comportamentiPorteReiSi(wizard) {
    return normalizeComportamentiPorteRei(wizard?.comportamenti_porte_rei) === true;
  }

  const VOCE_COMPORTAMENTI_ASCENSORI =
    '\u00e8 fatto divieto utilizzare gli ascensori per l\u2019esodo, salvo che siano stati appositamente realizzati per tale scopo.';

  const VOCE_COMPORTAMENTI_PORTE_REI =
    'durante l\u2019evacuazione tutte le porte \u201cREI\u201d eventualmente presenti devono rimanere chiuse dopo l\u2019utilizzo;';

  function voceComportamentiAscensori(wizard) {
    return comportamentiAscensoriEsodoSi(wizard) ? VOCE_COMPORTAMENTI_ASCENSORI : '';
  }

  function voceComportamentiPorteRei(wizard) {
    return comportamentiPorteReiSi(wizard) ? VOCE_COMPORTAMENTI_PORTE_REI : '';
  }

  function sezioneComportamentiIncendioFields(wizard) {
    return {
      VOCE_COMPORTAMENTI_SEGNALAZIONE_EVENTO: voceComportamentiSegnalazioneEvento(wizard),
      VOCE_COMPORTAMENTI_ASCENSORI: voceComportamentiAscensori(wizard),
      VOCE_COMPORTAMENTI_PORTE_REI: voceComportamentiPorteRei(wizard),
      comportamenti_vietato_ascensori: comportamentiAscensoriEsodoSi(wizard),
      comportamenti_porte_rei: comportamentiPorteReiSi(wizard),
    };
  }

  const VOCE_RESET_CENTRALE_ANTINCENDIO =
    'provvede, se necessario, al reset della centrale antincendio.';

  /** §4.2 preallarme — ultimo punto solo se §2.9 centrale segnalazione = Sì. */
  function voceResetCentraleAntincendio(wizard) {
    return centraleSegnalazioneIncendioSi(wizard) ? VOCE_RESET_CENTRALE_ANTINCENDIO : '';
  }

  function sezione42Fields(wizard) {
    return {
      VOCE_RESET_CENTRALE_ANTINCENDIO: voceResetCentraleAntincendio(wizard),
    };
  }

  function normalizeDiffusioneEvacuazioneAntincendio(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'allarme' || s === 'segnalazione') return 'allarme';
    if (s === 'verbale' || s === 'verbale_diffusione') return 'verbale';
    return null;
  }

  const TESTO_DIFFUSIONE_EVACUAZIONE_ALLARME =
    'attivano la segnalazione acustica o sonora di evacuazione, ovvero l\u2019allarme di evacuazione.';

  const TESTO_DIFFUSIONE_EVACUAZIONE_VERBALE =
    'diffondono verbalmente l\u2019ordine di evacuazione.';

  function paragrafoDiffusioneEvacuazioneAntincendio(wizard) {
    const intro = 'Su disposizione del Responsabile delle emergenze, ';
    switch (normalizeDiffusioneEvacuazioneAntincendio(wizard?.diffusione_evacuazione_antincendio)) {
      case 'allarme':
        return intro + TESTO_DIFFUSIONE_EVACUAZIONE_ALLARME;
      case 'verbale':
        return intro + TESTO_DIFFUSIONE_EVACUAZIONE_VERBALE;
      default:
        return '';
    }
  }

  const DEFAULT_LIVELLO_RISCHIO_INCENDIO = '1';
  const DEFAULT_LIVELLO_ADDESTRAMENTO_EMERGENZE = 'II';

  function livelloRischioIncendio(wizard) {
    const raw =
      wizard?.livello_rischio_incendio != null ? String(wizard.livello_rischio_incendio).trim() : '';
    return raw || DEFAULT_LIVELLO_RISCHIO_INCENDIO;
  }

  function livelloAddestramentoEmergenze(wizard) {
    const raw =
      wizard?.livello_addestramento_emergenze != null
        ? String(wizard.livello_addestramento_emergenze).trim()
        : '';
    return raw || DEFAULT_LIVELLO_ADDESTRAMENTO_EMERGENZE;
  }

  function testoSoggettoPreallarmeAntincendio(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'Il Posto di Chiamata';
      case 'responsabile':
        return 'Il Responsabile dell\u2019emergenza';
      default:
        return 'Il Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function paragrafoPreallarmeAntincendioIntro(wizard) {
    return (
      testoSoggettoPreallarmeAntincendio(wizard)
      + ' in fase di preallarme consulta l\u2019elenco delle squadre a sua disposizione '
      + 'e allerta un addetto antincendio affinch\u00e9:'
    );
  }

  function normalizeEsitoInterventoComunicazioneA(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'centro' || s === 'centro_coordinamento') return 'centro';
    if (s === 'responsabile') return 'responsabile';
    if (s === 'entrambi' || s === 'centro_e_responsabile') return 'entrambi';
    return null;
  }

  function testoEsitoInterventoComunicazioneA(wizard) {
    switch (normalizeEsitoInterventoComunicazioneA(wizard?.esito_intervento_comunicazione_a)) {
      case 'centro':
        return 'al Centro di coordinamento';
      case 'responsabile':
        return 'al Responsabile delle emergenze';
      default:
        return 'al Centro di coordinamento/Responsabile delle emergenze';
    }
  }

  function voceEsitoInterventoAntincendio(wizard) {
    return (
      'comunichi l\u2019esito dell\u2019intervento '
      + testoEsitoInterventoComunicazioneA(wizard)
      + ';'
    );
  }

  function testoDestinatarioComunicaEvacuazioneAntincendio(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'Posto di Chiamata';
      case 'responsabile':
        return 'Responsabile dell\u2019emergenza';
      default:
        return 'Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function voceEvacComunicaEsitoAntincendio(wizard) {
    return (
      'comunica al '
      + testoDestinatarioComunicaEvacuazioneAntincendio(wizard)
      + ' l\u2019esito dell\u2019intervento rappresentando la necessit\u00e0 di evacuazione;'
    );
  }

  function normalizeModalitaAllarmeEvacuazioneAntincendio(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'pulsante' || s === 'allarme') return 'pulsante';
    if (s === 'verbale' || s === 'solo_verbale') return 'verbale';
    return null;
  }

  const VOCE_EVAC_PULSANTE_ALLARME =
    'attiva, su ordine del Responsabile dell\u2019emergenza, il pulsante di allarme (attivazione allarme generale);';

  const VOCE_EVAC_ALLARME_FALLBACK_VERBALE =
    'nella remota possibilit\u00e0 che l\u2019impianto di allarme non funzioni, diffonde verbalmente '
    + 'l\u2019ordine di evacuazione impartito dal Responsabile dell\u2019emergenza.';

  const VOCE_EVAC_SOLO_VERBALE_ALLARME =
    'diffonde verbalmente l\u2019ordine di evacuazione impartito dal Responsabile dell\u2019emergenza.';

  function voceEvacAttivazioneAllarme(wizard) {
    const mod = normalizeModalitaAllarmeEvacuazioneAntincendio(wizard?.modalita_allarme_evacuazione_antincendio);
    if (mod === 'pulsante') return VOCE_EVAC_PULSANTE_ALLARME;
    if (mod === 'verbale') return VOCE_EVAC_SOLO_VERBALE_ALLARME;
    return '';
  }

  function voceEvacAllarmeFallbackVerbale(wizard) {
    return normalizeModalitaAllarmeEvacuazioneAntincendio(wizard?.modalita_allarme_evacuazione_antincendio)
      === 'pulsante'
      ? VOCE_EVAC_ALLARME_FALLBACK_VERBALE
      : '';
  }

  function sezione43Fields(wizard) {
    return {
      PARAGRAFO_DIFFUSIONE_EVACUAZIONE_ANTINCENDIO: paragrafoDiffusioneEvacuazioneAntincendio(wizard),
      LIVELLO_RISCHIO_INCENDIO: livelloRischioIncendio(wizard),
      PARAGRAFO_PREALLARME_ANTINCENDIO_INTRO: paragrafoPreallarmeAntincendioIntro(wizard),
      VOCE_ESITO_INTERVENTO_ANTINCENDIO: voceEsitoInterventoAntincendio(wizard),
      VOCE_EVAC_COMUNICA_ESITO: voceEvacComunicaEsitoAntincendio(wizard),
      VOCE_EVAC_ATTIVAZIONE_ALLARME: voceEvacAttivazioneAllarme(wizard),
      VOCE_EVAC_ALLARME_FALLBACK_VERBALE: voceEvacAllarmeFallbackVerbale(wizard),
    };
  }

  function testoRuoloSegnalaAddettoPostoChiamata(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'all\u2019addetto al Posto di Chiamata';
      case 'responsabile':
        return 'al Responsabile dell\u2019emergenza';
      default:
        return 'all\u2019addetto al Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function testoRuoloComunicazioneDa(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'dal Posto di Chiamata';
      case 'responsabile':
        return 'dal Responsabile dell\u2019emergenza';
      default:
        return 'dal Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function testoRuoloCoordinaCon(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'Posto di Chiamata';
      case 'responsabile':
        return 'Responsabile dell\u2019emergenza';
      default:
        return 'Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function voceSfollamentoSegnalaSoccorso(wizard) {
    return (
      'aiutano le persone in difficolt\u00e0 ad uscire dal sito ed in caso di particolari difficolt\u00e0, le segnalano '
      + testoRuoloSegnalaAddettoPostoChiamata(wizard)
      + ', affinch\u00e9 siano inviati i soccorsi;'
    );
  }

  function vocePrimoSoccorsoComunicazione(wizard) {
    return (
      'la comunicazione viene data '
      + testoRuoloComunicazioneDa(wizard)
      + ' o da un testimone;'
    );
  }

  function vocePrimoSoccorsoCoordina118(wizard) {
    return (
      'un altro incaricato si coordina con il '
      + testoRuoloCoordinaCon(wizard)
      + ', ed effettua la chiamata al numero telefonico 118 \u201cSoccorso Sanitario\u201d, '
      + 'stabilendo i necessari rapporti con i servizi esterni, anche per il trasporto dei lavoratori infortunati.'
    );
  }

  function sezione44e45Fields(wizard) {
    return {
      VOCE_SFOLLAMENTO_SEGNALA_SOCCORSI: voceSfollamentoSegnalaSoccorso(wizard),
      VOCE_PRIMO_SOCCORSO_COMUNICAZIONE: vocePrimoSoccorsoComunicazione(wizard),
      VOCE_PRIMO_SOCCORSO_COORDINA_118: vocePrimoSoccorsoCoordina118(wizard),
    };
  }

  function testoTelefonataSoccorsoDa(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'dall\u2019addetto al Posto di Chiamata';
      case 'responsabile':
        return 'dal Responsabile dell\u2019emergenza';
      default:
        return 'dall\u2019addetto al Posto di Chiamata/Responsabile dell\u2019emergenza';
    }
  }

  function paragrafoTelefonataSoccorsoPostoChiamata(wizard) {
    return (
      'La telefonata di soccorso dovr\u00e0 essere effettuata '
      + testoTelefonataSoccorsoDa(wizard)
    );
  }

  const TESTO_RICEVE_INFO_CENTRALE_ANTINCENDIO =
    ' o da chi ha rilevato un allarme dalla centrale antincendio';

  function vocePostoChiamataRiceveInformazioni(wizard) {
    const base =
      'riceve le informazioni relative all\u2019emergenza dal testimone dell\u2019evento';
    return (
      base
      + (centraleSegnalazioneIncendioSi(wizard) ? TESTO_RICEVE_INFO_CENTRALE_ANTINCENDIO : '')
      + ';'
    );
  }

  function sezione46Fields(wizard) {
    return {
      PARAGRAFO_TELEFONATA_SOCCORSO_POSTO_CHIAMATA: paragrafoTelefonataSoccorsoPostoChiamata(wizard),
      VOCE_POSTO_CHIAMATA_RICEVE_INFORMAZIONI: vocePostoChiamataRiceveInformazioni(wizard),
    };
  }

  function sezione52Fields(wizard) {
    return {
      LIVELLO_ADDESTRAMENTO_EMERGENZE: livelloAddestramentoEmergenze(wizard),
    };
  }

  /** §6.1 — primo punto elenco «informare» (testo in maiuscolo). */
  function voceEmergenzaSanitariaDestinatario(wizard) {
    switch (normalizeSegnalazioneDestinatario(wizard?.segnalazione_destinatario)) {
      case 'posto_chiamata':
        return 'POSTO DI CHIAMATA';
      case 'responsabile':
        return 'RESPONSABILE DELL\u2019EMERGENZA';
      default:
        return 'POSTO DI CHIAMATA/RESPONSABILE DELL\u2019EMERGENZA';
    }
  }

  function sezione61Fields(wizard) {
    return {
      VOCE_EMERGENZA_SANITARIA_DESTINATARIO: voceEmergenzaSanitariaDestinatario(wizard),
    };
  }

  /** §6.2 — «… il più presto al Posto di Chiamata/Responsabile …» (riusa §1.2). */
  function sezione62Fields(wizard) {
    return {
      TESTO_RINVENIMENTO_OGGETTO_SOSPETTO_DESTINATARIO: testoDestinatarioComportamentiIncendio(wizard),
    };
  }

  function sezione67e68Fields(wizard) {
    const dest = testoDestinatarioComportamentiIncendio(wizard);
    return {
      VOCE_COMPORTAMENTI_67_AVVISA_DESTINATARIO: dest,
      VOCE_COMPORTAMENTI_67_EVACUA_DESTINATARIO: testoIlDestinatarioEmergenza(wizard),
      VOCE_COMPORTAMENTI_68_ALLERTA_DESTINATARIO: dest,
    };
  }

  function sezione29Fields(wizard) {
    const gasPresente = impiantoGasDistribuzionePresente(wizard);
    return {
      LISTA_SEGNALAZIONE_INCENDIO_OPZIONALI: listaSegnalazioneIncendioOpzionali(wizard),
      PARAGRAFO_QUANDO_SEGNALAZIONE_INCENDIO: paragrafoQuandoSegnalazioneIncendio(wizard),
      TESTO_DESTINATARIO_RUOLO_EMERGENZA: testoDestinatarioRuoloEmergenza(wizard),
      impianto_gas_distribuzione_presente: gasPresente,
      VOCE_DISATTIVAZIONE_GAS: voceDisattivazioneGas(wizard),
      mostra_addetto_posto_chiamata_evacuazione: mostraAddettoPostoChiamataEvacuazione(wizard),
    };
  }

  function emergenzeWizardFields(wizard) {
    return {
      ...premessaPianoCoordinatoFields(wizard),
      ...sezione12Fields(wizard),
      ...sezione21Fields(wizard),
      ...sezione22Fields(wizard),
      ...sezione23Fields(wizard),
      ...sezione24Fields(wizard),
      ...sezione25Fields(wizard),
      ...sezione26Fields(wizard),
      ...sezione28Fields(wizard),
      ...sezione29Fields(wizard),
      ...sezioneComportamentiIncendioFields(wizard),
      ...sezione42Fields(wizard),
      ...sezione43Fields(wizard),
      ...sezione44e45Fields(wizard),
      ...sezione46Fields(wizard),
      ...sezione52Fields(wizard),
      ...sezione61Fields(wizard),
      ...sezione62Fields(wizard),
      ...sezione67e68Fields(wizard),
    };
  }

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  function templateValue(v) {
    if (v == null || v === undefined) return '';
    return String(v);
  }

  function luogoDaSede(sede) {
    const s = sede || '';
    const m = s.match(/^([^,–—-]+)/);
    return m ? m[1].trim() : s.trim();
  }

  function formatModuloNumero(raw, fallback) {
    const s = raw != null && String(raw).trim() !== '' ? String(raw).trim() : String(fallback || '1');
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0) return '01';
    return String(n).padStart(2, '0');
  }

  function buildData(azienda, rilevamenti, opts) {
    const o = opts || {};
    const dataEmissione = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(o.modulo_numero, '1'),
      DATA_EMISSIONE: dataEmissione,
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      LOGO_PREVIEW_URL: o.logo_url || '',
      _logo_buffer: o.logo_buffer || null,
      _logo_path: o.logo_path || '',
      NOTE_WIZARD: o.note_wizard != null ? String(o.note_wizard) : '',
      _rilevamenti: rilevamenti || [],
      ...emergenzeWizardFields(o),
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '01';
    return {
      ...base,
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      MODULO_NUMERO: modNum,
      ...emergenzeWizardFields(w),
      _emergenze_wizard: { ...w },
    };
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    const righe = data.righe_piano_luoghi || [];
    if (!righe.length) {
      errors.push('§2.1: tabella «Edificio / Attività / Numero persone» — almeno una riga');
    }
    righe.forEach((row, i) => {
      if (!String(row.edificio || '').trim()) {
        errors.push('§2.1: riga ' + (i + 1) + ' — colonna «Edificio» mancante');
      }
    });
    if (!normalizeRilevazioneAllarme(data._emergenze_wizard?.rilevazione_allarme ?? data.rilevazione_allarme)) {
      errors.push('§2.2: selezionare la modalità di rilevazione e diffusione dell\u2019allarme');
    }
    const w = data._emergenze_wizard || {};
    const modRischi = normalizeRischiParticolariModalita(w.rischi_particolari_modalita);
    if (!modRischi) {
      errors.push('§2.3: indicare se sono presenti lavoratori esposti a rischi particolari');
    } else if (modRischi === 'tabella') {
      const righeSel = righeRischiParticolariForTemplate(w);
      if (!righeSel.length) {
        errors.push('§2.3: selezionare almeno una riga nella tabella rischi particolari');
      }
    }
    if (!normalizeRischiIncendioAltoModalita(w.rischi_incendio_alto_modalita)) {
      errors.push('§2.4: indicare se sono presenti aree ad elevato rischio incendio');
    }
    const modEs = normalizeEsigenzeSpecialiModalita(w.esigenze_speciali_modalita);
    if (!modEs) {
      errors.push('§2.5: indicare se sono presenti persone con esigenze speciali');
    } else if (modEs === 'presenti') {
      const lista = listaMisureEsigenzeForTemplate(w);
      if (!lista.trim()) {
        errors.push('§2.5: selezionare almeno una misura aggiuntiva per le esigenze speciali');
      }
    }
    if (!luogoCentroCoordinamento(w).trim()) {
      errors.push('§2.8: indicare il luogo del Centro di coordinamento');
    }
    if (!luogoPostoChiamata(w).trim()) {
      errors.push('§2.8: indicare il luogo del Posto di chiamata');
    }
    if (!luogoPuntoRaccolta(w).trim()) {
      errors.push('§2.8: indicare il luogo del Punto di raccolta');
    }
    if (normalizeCentraleSegnalazioneIncendio(w.centrale_segnalazione_incendio) === null) {
      errors.push(
        '§2.9: indicare se \u00e8 presente la centrale di segnalazione dell\u2019incendio',
      );
    }
    if (normalizeImpiantoGasDistribuzione(w.impianto_gas_distribuzione_presente) === null) {
      errors.push(
        '§2.9 disattivazione forniture: indicare se \u00e8 presente l\u2019impianto di distribuzione del gas',
      );
    }
    if (normalizeComportamentiAscensori(w.comportamenti_vietato_ascensori) === null) {
      errors.push(
        'Comportamenti incendio: indicare se applicare il divieto di utilizzo ascensori per l\u2019esodo',
      );
    }
    if (normalizeComportamentiPorteRei(w.comportamenti_porte_rei) === null) {
      errors.push(
        'Comportamenti incendio: indicare se sono presenti porte REI da menzionare',
      );
    }
    if (!normalizeDiffusioneEvacuazioneAntincendio(w.diffusione_evacuazione_antincendio)) {
      errors.push(
        '§4.3: selezionare la modalit\u00e0 di diffusione dell\u2019ordine di evacuazione (addetti antincendio)',
      );
    }
    if (!livelloRischioIncendio(w).trim()) {
      errors.push('§4.3: indicare il livello di rischio incendio (es. 1, 2, 3)');
    }
    if (!normalizeEsitoInterventoComunicazioneA(w.esito_intervento_comunicazione_a)) {
      errors.push(
        '§4.3 preallarme: indicare a chi comunicare l\u2019esito dell\u2019intervento (centro / responsabile / entrambi)',
      );
    }
    if (!normalizeModalitaAllarmeEvacuazioneAntincendio(w.modalita_allarme_evacuazione_antincendio)) {
      errors.push(
        '§4.3 evacuazione: selezionare la modalit\u00e0 di attivazione allarme (pulsante o solo verbale)',
      );
    }
    return errors;
  }

  async function generateDocx(templateArrayBuffer, data) {
    const DocxtemplaterCtor = getDocxtemplaterCtor();
    if (!window.PizZip) throw new Error('PizZip non caricato');
    if (!DocxtemplaterCtor) throw new Error('Docxtemplater non caricato');

    const logoBuffer = data._logo_buffer || null;
    const logoPathHint = data._logo_path || '';
    if (logoBuffer && window.GEN_LOGO_DOCX?.isSvgBuffer(logoBuffer, logoPathHint)) {
      throw new Error('Il logo in formato SVG non è supportato nel Word. Carica PNG o JPEG in Loghi.');
    }

    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (k === 'LOGO_PREVIEW_URL') continue;
      if (k === 'righe_piano_luoghi' && Array.isArray(v)) {
        templateData[k] = v.map((row) => ({
          edificio: templateValue(row.edificio),
          attivita: templateValue(row.attivita),
          numero_persone: templateValue(row.numero_persone),
        }));
        continue;
      }
      if (k === 'righe_rischi_particolari' && Array.isArray(v)) {
        templateData[k] = v.map((row) => ({
          situazione: templateValue(row.situazione),
          misure: templateValue(row.misure),
        }));
        continue;
      }
      if ((k === 'protezioni_attive' || k === 'protezioni_passive') && Array.isArray(v)) {
        templateData[k] = v.map((row) => ({ testo: templateValue(row.testo) }));
        continue;
      }
      templateData[k] = templateValue(v);
    }

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const repair = window.GEN_DOCX_REPAIR;
    let zip = new window.PizZip(templateArrayBuffer);
    if (repair?.repairDocxTemplateZip) {
      zip = repair.repairDocxTemplateZip(zip);
    }

    const docOpts = repair?.DOCXTEMPLATER_OPTIONS || { paragraphLoop: true, linebreaks: true };
    const doc = new DocxtemplaterCtor(zip, { ...docOpts });
    doc.setData(templateData);
    try {
      doc.render();
    } catch (err) {
      const msg = repair?.formatDocxtemplaterErrors
        ? repair.formatDocxtemplaterErrors(err)
        : (err.properties?.errors
          ? err.properties.errors.map((e) => e.message).join('; ')
          : err.message);
      throw new Error('Errore rendering template emergenze: ' + msg);
    }

    const outZip = doc.getZip();
    if (logoBuffer && window.GEN_LOGO_DOCX?.injectLogoIntoDocxZip) {
      await window.GEN_LOGO_DOCX.injectLogoIntoDocxZip(outZip, logoBuffer, logoPathHint);
    }
    return outZip.generate({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  window.GEN_ADAPTERS = window.GEN_ADAPTERS || {};
  window.GEN_ADAPTERS[CODICE] = {
    codice: CODICE,
    nome: NOME,
    PARAGRAFO_PREMESSA_COORD_INOLTRE,
    PARAGRAFO_PREMESSA_COORD_RIMANDO,
    pianoEmergenzaCoordinatoSi,
    allarmeGeneraleSi,
    TESTO_ALLARME_GENERALE_OR_SI,
    normalizeSegnalazioneDestinatario,
    testoRuoloSegnalazione,
    testoAllarmeGeneraleOr,
    DEFAULT_IMMOBILE_ADIBITO_A,
    immobileAdibitoA,
    DEFAULT_RIGHE_PIANO_LUOGHI,
    normalizeRigaPianoLuoghi,
    normalizeRighePianoLuoghiList,
    righePianoLuoghiForTemplate,
    DENSITA_AFFOLLAMENTO_OPTIONS,
    rischioIncendioBasso,
    TESTO_P1_BASSO,
    TESTO_P2_STANDARD,
    TESTO_P2_CONTEGGIO,
    buildParafoAffollamento1,
    buildParafoAffollamento2,
    DEFAULT_ALLARME_SENZA,
    DEFAULT_ALLARME_CON,
    normalizeRilevazioneAllarme,
    joinBloccoParagrafi,
    testoBloccoAllarmeSenzaDefault,
    testoBloccoAllarmeConDefault,
    getAllarmeSenzaParagrafi,
    getAllarmeConParagrafi,
    TESTO_RISCHI_NESSUNO_DEFAULT,
    TESTO_RISCHI_INTRO_DEFAULT,
    DEFAULT_RIGHE_RISCHI_PARTICOLARI,
    normalizeRischiParticolariModalita,
    mergeRigheRischiParticolariWizard,
    righeRischiParticolariForTemplate,
    testoRischiNessuno,
    testoRischiIntro,
    TESTO_RISCHI_INCENDIO_NESSUNO_DEFAULT,
    DEFAULT_RISCHI_INCENDIO_ALTO,
    normalizeRischiIncendioAltoModalita,
    testoBloccoRischiIncendioAltoDefault,
    getRischiIncendioAltoParagrafi,
    testoRischiIncendioNessuno,
    TESTO_ESIGENZE_NESSUNA_DEFAULT,
    TESTO_ESIGENZE_CHIUSURA_DEFAULT,
    TESTO_ESIGENZE_INTRO_PUBBLICO,
    TESTO_ESIGENZE_INTRO_STANDARD,
    DEFAULT_MISURE_ESIGENZE_SPECIALI,
    normalizeEsigenzeSpecialiModalita,
    luogoApertoPubblicoSi,
    mergeMisureEsigenzeWizard,
    listaMisureEsigenzeForTemplate,
    testoEsigenzeNessuna,
    testoEsigenzeChiusura,
    testoEsigenzeIntro,
    DEFAULT_PROTEZIONI_ATTIVE,
    DEFAULT_PROTEZIONI_PASSIVE,
    mergeProtezioniList,
    protezioniAttiveForTemplate,
    protezioniPassiveForTemplate,
    DEFAULT_LUOGO_CENTRO_COORDINAMENTO,
    DEFAULT_LUOGO_POSTO_CHIAMATA,
    DEFAULT_LUOGO_PUNTO_RACCOLTA,
    luogoCentroCoordinamento,
    luogoPostoChiamata,
    luogoPuntoRaccolta,
    normalizeCentraleSegnalazioneIncendio,
    centraleSegnalazioneIncendioSi,
    segnalazioneIncendioImpiantoRivelazioneSi,
    segnalazioneIncendioPostoChiamataEsternoSi,
    testoCentraleSegnalazioneIncendioOr,
    testoDestinatarioRuoloEmergenza,
    testoDestinatarioSegnalazioneIncendio,
    paragrafoQuandoSegnalazioneIncendio,
    listaSegnalazioneIncendioOpzionali,
    normalizeImpiantoGasDistribuzione,
    impiantoGasDistribuzionePresente,
    VOCE_DISATTIVAZIONE_GAS,
    voceDisattivazioneGas,
    mostraAddettoPostoChiamataEvacuazione,
    testoDestinatarioComportamentiIncendio,
    testoIlDestinatarioEmergenza,
    voceComportamentiSegnalazioneEvento,
    normalizeComportamentiAscensori,
    normalizeComportamentiPorteRei,
    comportamentiAscensoriEsodoSi,
    comportamentiPorteReiSi,
    voceComportamentiAscensori,
    voceComportamentiPorteRei,
    VOCE_RESET_CENTRALE_ANTINCENDIO,
    voceResetCentraleAntincendio,
    normalizeDiffusioneEvacuazioneAntincendio,
    paragrafoDiffusioneEvacuazioneAntincendio,
    DEFAULT_LIVELLO_RISCHIO_INCENDIO,
    livelloRischioIncendio,
    DEFAULT_LIVELLO_ADDESTRAMENTO_EMERGENZE,
    livelloAddestramentoEmergenze,
    voceEmergenzaSanitariaDestinatario,
    paragrafoPreallarmeAntincendioIntro,
    normalizeEsitoInterventoComunicazioneA,
    voceEsitoInterventoAntincendio,
    voceEvacComunicaEsitoAntincendio,
    normalizeModalitaAllarmeEvacuazioneAntincendio,
    voceEvacAttivazioneAllarme,
    voceEvacAllarmeFallbackVerbale,
    voceSfollamentoSegnalaSoccorso,
    vocePrimoSoccorsoComunicazione,
    vocePrimoSoccorsoCoordina118,
    paragrafoTelefonataSoccorsoPostoChiamata,
    vocePostoChiamataRiceveInformazioni,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
