/**
 * Adapter MOD_INCENDIO — Valutazione del rischio incendio (scaffold iniziale).
 */
(function () {
  'use strict';

  const CODICE = 'MOD_INCENDIO';
  const NOME = 'Valutazione del rischio incendio';

  const REDATTO_DA_DEFAULT = 'Team della Studio Rivelli Consulting S.r.l.';

  const TESTO_2_1_P1_DEFAULT =
    'La sede operativa di {{RAGIONE_SOCIALE}} \u00e8 insediata all\'interno di un immobile del tipo Multitenant con presenza di attivit\u00e0 commerciali al piano terra con ingresso indipendente. L\'immobile di 7 piani fuori terra \u00e8 del tipo misto con 24 unit\u00e0 immobiliari, 5 unit\u00e0 immobiliari ed ha anche un ingresso indipendente per i condomini.';

  const TESTO_2_1_P2_DEFAULT =
    'La sede operativa \u00e8 insediata al piano terra dell\'Immobile multitenant. Gli ambienti di lavoro sono di circa 120 mq ed al suo interno si individuano aree espositive, postazioni di lavoro al videoterminale, locali ad uso esclusivo del personale, ed un servizio igienico (presente, inoltre, una piccola area esterna non utilizzata).';

  const TESTO_2_1_P3_DEFAULT =
    '{{RAGIONE_SOCIALE}} ha per oggetto la commercializzazione al dettaglio e all\u2019ingrosso di articoli e merci per l\u2019edilizia e l\u2019arredamento in genere ed in particolare nel settore degli infissi e serramenti e strutture finalizzate alla sicurezza degli edifici, distribuzione di marchi, prodotto, brevetti.';

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  function luogoDaSede(sede) {
    const s = sede || '';
    const m = s.match(/^([^,–—-]+)/);
    return m ? m[1].trim() : s.trim();
  }

  function templateValue(v) {
    if (v == null || v === undefined) return '';
    return String(v);
  }

  function formatModuloNumero(raw, fallback) {
    const s = raw != null && String(raw).trim() !== '' ? String(raw).trim() : String(fallback || '1');
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0) return '01';
    return String(n).padStart(2, '0');
  }

  function fillRagioneSocialeInTesto(testo, ragioneSociale) {
    return String(testo || '').replace(/\{\{RAGIONE_SOCIALE\}\}/g, ragioneSociale || '');
  }

  function normalizeTesto21Raw(wizard, key, defaultVal) {
    const w = wizard || {};
    const v = w[key];
    if (v != null && String(v).trim() !== '') return String(v);
    return defaultVal;
  }

  function testo21RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_2_1_p1: normalizeTesto21Raw(w, 'testo_2_1_p1', TESTO_2_1_P1_DEFAULT),
      testo_2_1_p2: normalizeTesto21Raw(w, 'testo_2_1_p2', TESTO_2_1_P2_DEFAULT),
      testo_2_1_p3: normalizeTesto21Raw(w, 'testo_2_1_p3', TESTO_2_1_P3_DEFAULT),
    };
  }

  function testo21ForTemplate(ragioneSociale, wizard) {
    const raw = testo21RawFromWizard(wizard);
    return {
      TESTO_2_1_P1: fillRagioneSocialeInTesto(raw.testo_2_1_p1, ragioneSociale),
      TESTO_2_1_P2: fillRagioneSocialeInTesto(raw.testo_2_1_p2, ragioneSociale),
      TESTO_2_1_P3: fillRagioneSocialeInTesto(raw.testo_2_1_p3, ragioneSociale),
      _testo_2_1_raw: raw,
    };
  }

  const TESTO_2_2_NOTA_DPR_DEFAULT =
    'L\u2019attivit\u00e0 in esame non ricade e non \u00e8 insediata all\u2019interno di un contesto con attivit\u00e0 disciplinate dal D.P.R. 01 Agosto 2011 n. 151.';

  const TESTO_2_2_CONCLUSIONE_DEFAULT =
    'Pertanto, i luoghi di lavoro, rispondendo a tutti i requisiti aggiuntivi pervisti dal D.M. 03/09/2021, sono considerati a:';

  const DEFAULT_RIGHE_REQUISITI_BASSO_RISCHIO = [
    {
      elemento:
        'Affollamento complessivo \u2264 100 occupanti (presenze totali compreso pubblico/utenti/visitatori)',
      scelta: 'si',
    },
    {
      elemento: 'Superficie lorda complessiva \u2264 1000 m2',
      scelta: 'si',
    },
    {
      elemento: 'Piani situati a quota compresa tra -5 m e 24 m',
      scelta: 'si',
    },
    {
      elemento:
        'Presenza di materiali combustibili in quantit\u00e0 significative (qf> 900Mj/m2)',
      scelta: 'no',
    },
    {
      elemento: 'Presenza di sostanze o miscele pericolose in quantit\u00e0 significative',
      scelta: 'no',
    },
    {
      elemento: 'Presenza di lavorazioni pericolose ai fini dell\u2019incendio.',
      scelta: 'no',
    },
  ];

  function normalizeSceltaRequisito(v) {
    const s = String(v || '').trim().toLowerCase();
    return s === 'no' ? 'no' : 'si';
  }

  function normalizeRequisitoRow(row, fallback) {
    const fb = fallback || { elemento: '', scelta: 'si' };
    const elemento =
      row != null && row.elemento != null && String(row.elemento).trim() !== ''
        ? String(row.elemento).trim()
        : fb.elemento;
    return {
      elemento,
      scelta: normalizeSceltaRequisito(row?.scelta != null ? row.scelta : fb.scelta),
    };
  }

  function mergeRigheRequisitiWizard(wizard) {
    const incoming = Array.isArray(wizard?.righe_requisiti_basso_rischio)
      ? wizard.righe_requisiti_basso_rischio
      : [];
    if (incoming.length) {
      return incoming.map((r, i) =>
        normalizeRequisitoRow(r, DEFAULT_RIGHE_REQUISITI_BASSO_RISCHIO[i] || { elemento: '', scelta: 'si' })
      );
    }
    return DEFAULT_RIGHE_REQUISITI_BASSO_RISCHIO.map((r) => ({ ...r }));
  }

  function requisitiBassoRischioForTemplate(wizard) {
    return mergeRigheRequisitiWizard(wizard).map((row) => ({
      ELEMENTO: row.elemento,
      MARK_SI: row.scelta === 'si' ? 'X' : '',
      MARK_NO: row.scelta === 'no' ? 'X' : '',
    }));
  }

  function testo22RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_2_2_nota_dpr: normalizeTesto21Raw(w, 'testo_2_2_nota_dpr', TESTO_2_2_NOTA_DPR_DEFAULT),
      testo_2_2_conclusione: normalizeTesto21Raw(
        w,
        'testo_2_2_conclusione',
        TESTO_2_2_CONCLUSIONE_DEFAULT
      ),
      righe_requisiti_basso_rischio: mergeRigheRequisitiWizard(w),
    };
  }

  function testo22ForTemplate(wizard) {
    const raw = testo22RawFromWizard(wizard);
    return {
      TESTO_2_2_NOTA_DPR: raw.testo_2_2_nota_dpr,
      TESTO_2_2_CONCLUSIONE: raw.testo_2_2_conclusione,
      RIGHE_REQUISITI_BASSO_RISCHIO: requisitiBassoRischioForTemplate(wizard),
      _testo_2_2_raw: raw,
    };
  }

  const TESTO_2_3_1_P1_DEFAULT =
    'Le potenziali fonti d\'innesco sono limitate al malfunzionamento delle apparecchiature elettriche, di illuminazione dei locali nonch\u00e9 all\u2019errore umano; non \u00e8 infatti previsto l\u2019utilizzo di fiamme libere o altre fonti di calore critiche ai fini del rischio incendio. Nel locale vige il divieto di fumo. L\'impianto elettrico non presenta criticit\u00e0 potenziali o in atto in quanto \u00e8 stato realizzato secondo la regola dell\u2019arte.';

  const TESTO_2_3_1_P2_DEFAULT =
    'In relazione alle possibili sorgenti d\u2019innesco di natura elettrica, gli utilizzatori e le apparecchiature, dotate di marcatura CE, sono mantenute in buono stato di manutenzione, con speciale riguardo alle parti relative a spine, cavi; non si individuano fasi del ciclo produttivo in cui potrebbero verificarsi fenomeni di sovraccarico dell\u2019impianto elettrico. L\u2019impianto elettrico dovr\u00e0 essere mantenuto in efficienza ed in buono stato di conservazione tramite i necessari interventi programmati di manutenzione.';

  const TESTO_2_3_2_P1_DEFAULT =
    'I materiali combustibili e le sostanze infiammabili presenti all\u2019interno della sede operativa sono rappresentati dai normali arredi e materiali di consumo.';

  const TESTO_2_3_2_P2_DEFAULT =
    'Particolare attenzione sar\u00e0 posta ai prodotti presenti in esposizione che possono contenere materiali combustibili (per esempio plastica), che potrebbero potenzialmente alimentare in maniera rilevante un eventuale incendio, favorendo il fenomeno della combustione.';

  const TESTO_2_3_4_DEFAULT =
    'All\u2019interno della sede operativa \u00e8 da considerarsi remota la probabilit\u00e0 di interazione inneschi-combustibili in quanto, come evidenziato al par. 2.5.1, le sorgenti di innesco sono limitate al malfunzionamento delle apparecchiature elettriche, le quali saranno mantenute lontano dal materiale combustibile.';

  function testo23RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_2_3_1_p1: normalizeTesto21Raw(w, 'testo_2_3_1_p1', TESTO_2_3_1_P1_DEFAULT),
      testo_2_3_1_p2: normalizeTesto21Raw(w, 'testo_2_3_1_p2', TESTO_2_3_1_P2_DEFAULT),
      testo_2_3_2_p1: normalizeTesto21Raw(w, 'testo_2_3_2_p1', TESTO_2_3_2_P1_DEFAULT),
      testo_2_3_2_p2: normalizeTesto21Raw(w, 'testo_2_3_2_p2', TESTO_2_3_2_P2_DEFAULT),
      testo_2_3_4: normalizeTesto21Raw(w, 'testo_2_3_4', TESTO_2_3_4_DEFAULT),
    };
  }

  function testo23ForTemplate(wizard) {
    const raw = testo23RawFromWizard(wizard);
    return {
      TESTO_2_3_1_P1: raw.testo_2_3_1_p1,
      TESTO_2_3_1_P2: raw.testo_2_3_1_p2,
      TESTO_2_3_2_P1: raw.testo_2_3_2_p1,
      TESTO_2_3_2_P2: raw.testo_2_3_2_p2,
      TESTO_2_3_4: raw.testo_2_3_4,
      _testo_2_3_raw: raw,
    };
  }

  const TESTO_2_4_P1_DEFAULT =
    'Il contesto nel quale \u00e8 inserita l\u2019attivit\u00e0 riguarda il piano terra, avente superficie lorda complessiva pari a circa 300 m2, di un edificio di 9 piani fuori terra. L\u2019edificio \u00e8 ubicato in contesto urbano a {{SEDE_OPERATIVA}}. Le condizioni di accessibilit\u00e0 all\u2019edificio, ubicato in zona idoneamente servita dalla viabilit\u00e0 pubblica, non presentano elementi di criticit\u00e0 rispetto all\u2019operativit\u00e0 antincendio. L\u2019area, infatti, \u00e8 agevolmente accessibile ai mezzi dei VV.F., in grado di raggiungere l\u2019edificio, in caso di emergenza, entro pochi minuti.';

  const TESTO_2_4_P2_DEFAULT =
    'I locali presentano una buona condizione generale di sicurezza per quanto attiene l\u2019affollamento, la capacit\u00e0 di deflusso e la presenza di mezzi di estinzione incendio. Le vie di esodo saranno mantenute costantemente sgombre. La superficie d\u2019aerazione, determinata considerando tutte le superfici vetrate o apribili che in caso d\u2019incendio consentiranno lo smaltimento del fumo e del calore, risulta ampiamente contenuta nei criteri generali previsti pari a 1/8 della superficie in pianta.';

  function testo24RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_2_4_p1: normalizeTesto21Raw(w, 'testo_2_4_p1', TESTO_2_4_P1_DEFAULT),
      testo_2_4_p2: normalizeTesto21Raw(w, 'testo_2_4_p2', TESTO_2_4_P2_DEFAULT),
    };
  }

  function testo24ForTemplate(wizard, sedeOperativa) {
    const raw = testo24RawFromWizard(wizard);
    return {
      TESTO_2_4_P1: fillAnagraficaInTesto(raw.testo_2_4_p1, '', sedeOperativa),
      TESTO_2_4_P2: raw.testo_2_4_p2,
      _testo_2_4_raw: raw,
    };
  }

  const DEFAULT_VOCI_OCCUPANTI_ESPOSTI = [
    { id: 'lavoratori', testo: 'lavoratori;', attivo: true },
    { id: 'visitatori', testo: 'i visitatori, clienti;', attivo: true },
    {
      id: 'ditte_esterne',
      testo:
        'i dipendenti di ditte esterne che prestano occasionalmente servizio presso la sede operativa (personale di imprese esterne, manutentori, ecc.).',
      attivo: true,
    },
  ];

  const DEFAULT_VOCI_TIPOLOGIA_OCCUPANTI = [
    {
      id: 'sistematici',
      testo:
        'Lavoratori presenti in maniera sistematica che hanno familiarit\u00e0 con i luoghi e le relative vie di esodo;',
      attivo: true,
    },
    {
      id: 'occasionali',
      testo:
        'Persone presenti in maniera occasionale e che non hanno familiarit\u00e0 con i luoghi e con le relative vie di esodo;',
      attivo: true,
    },
    {
      id: 'esterne',
      testo:
        'Lavoratori di ditte esterne che non hanno familiarit\u00e0 con i luoghi e con le relative vie di esodo (es. addetti alla manutenzione dei dispositivi di lotta antincendio).',
      attivo: true,
    },
  ];

  function normalizeVoceElenco(row, idx, fallback) {
    const fb = fallback || { id: 'v' + idx, testo: '', attivo: true };
    const id =
      row != null && row.id != null && String(row.id).trim()
        ? String(row.id).trim()
        : fb.id || 'v' + idx;
    const testo =
      row != null && row.testo != null && String(row.testo).trim() !== ''
        ? String(row.testo).trim()
        : fb.testo;
    const attivo = row != null && row.attivo === false ? false : fb.attivo !== false;
    return { id, testo, attivo };
  }

  function mergeVociElencoWizard(wizardKey, defaults, wizard) {
    const incoming = Array.isArray(wizard?.[wizardKey]) ? wizard[wizardKey] : [];
    if (!incoming.length) {
      return defaults.map((r) => ({ ...r }));
    }
    const byId = new Map();
    incoming.forEach((r, i) => {
      const n = normalizeVoceElenco(r, i, defaults[i]);
      if (n.id) byId.set(n.id, n);
    });
    const merged = defaults.map((d) => {
      const w = byId.get(d.id);
      return w
        ? { id: d.id, testo: w.testo || d.testo, attivo: w.attivo !== false }
        : { ...d };
    });
    const extra = incoming
      .filter((r, i) => {
        const n = normalizeVoceElenco(r, i);
        return !defaults.some((d) => d.id === n.id);
      })
      .map((r, i) => normalizeVoceElenco(r, i));
    return merged.concat(extra);
  }

  function vociElencoForTemplate(rows) {
    return (rows || [])
      .filter((r) => r.attivo !== false && String(r.testo || '').trim())
      .map((r) => ({ TESTO: String(r.testo).trim() }));
  }

  function testo25RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      voci_occupanti_esposti: mergeVociElencoWizard(
        'voci_occupanti_esposti',
        DEFAULT_VOCI_OCCUPANTI_ESPOSTI,
        w
      ),
      voci_tipologia_occupanti: mergeVociElencoWizard(
        'voci_tipologia_occupanti',
        DEFAULT_VOCI_TIPOLOGIA_OCCUPANTI,
        w
      ),
    };
  }

  function testo25ForTemplate(wizard) {
    const raw = testo25RawFromWizard(wizard);
    return {
      VOCI_OCCUPANTI_ESPOSTI: vociElencoForTemplate(raw.voci_occupanti_esposti),
      VOCI_TIPOLOGIA_OCCUPANTI: vociElencoForTemplate(raw.voci_tipologia_occupanti),
      _testo_2_5_raw: raw,
    };
  }

  const TESTO_2_9_5_DEFAULT =
    'Al fine di garantire le operazioni di primo intervento, sono previsti nei locali dell\u2019attivit\u00e0, estintori portatili, in numero tale da garantire una distanza massima di raggiungimento pari a 30 m (in prossimit\u00e0 del quadro elettrico generale e/o apparecchiature elettriche potr\u00e0 essere previsto un estintore a CO2), opportunamente segnalati da idonea segnaletica di sicurezza.';

  function testo295RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_2_9_5: normalizeTesto21Raw(w, 'testo_2_9_5', TESTO_2_9_5_DEFAULT),
    };
  }

  function testo295ForTemplate(wizard) {
    const raw = testo295RawFromWizard(wizard);
    return {
      TESTO_2_9_5: raw.testo_2_9_5,
      _testo_2_9_5_raw: raw,
    };
  }

  const TESTO_3_1_P1_DEFAULT =
    'All\u2019interno dell\u2019attivit\u00e0 \u00e8 possibile la presenza occasionale di occupanti che abbiano ridotte od impedite capacit\u00e0 motorie. Non \u00e8 stato necessario adottare ulteriori misure specifiche di prevenzione e protezione in quanto \u00e8 presente un sistema di esodo orizzontale verso luogo sicuro (pubblica via).';

  const TESTO_3_1_P2_DEFAULT =
    'Sono state comunque predisposte specifiche procedure per la gestione di persone con esigenze speciali.';

  function testo31RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_3_1_p1: normalizeTesto21Raw(w, 'testo_3_1_p1', TESTO_3_1_P1_DEFAULT),
      testo_3_1_p2: normalizeTesto21Raw(w, 'testo_3_1_p2', TESTO_3_1_P2_DEFAULT),
    };
  }

  function testo31ForTemplate(wizard) {
    const raw = testo31RawFromWizard(wizard);
    return {
      TESTO_3_1_P1: raw.testo_3_1_p1,
      TESTO_3_1_P2: raw.testo_3_1_p2,
      _testo_3_1_raw: raw,
    };
  }

  const TESTO_3_2_ULTIMO_PUNTO_DEFAULT =
    'Le porte di uscita di emergenza dei n. 2 percorsi di esodo non hanno un\u2019apertura nel senso dell\u2019esodo in quanto, secondo quanto riportato nel paragrafo successivo 3.3, l\u2019affollamento massimo di persone presenti contemporaneamente all\u2019interno dell\u2019attivit\u00e0 \u00e8 inferiore ai 25 occupanti.';

  const DEFAULT_RIGHE_AFFOLLAMENTO_331 = [
    {
      edificio_area: 'Sede di Via Alessio Baldovinetti, 4 Roma',
      superficie: '120 m.q.',
      numero_persone: '84',
    },
  ];

  const TESTO_3_3_1_P2_DEFAULT =
    'Come indicato al punto 4.2.2 comma 2 del D.M. 03/09/2021 il datore di lavoro ha dichiarato un valore dell\u2019affollamento inferiore a quello determinato nella tabella precedente.';

  const TESTO_3_3_1_P3_DEFAULT =
    'In particolare, Il Datore di lavoro dichiara un valore massimo di affollamento pari a 25 persone, impegnandosi a verificare e rispettare tale parametro in ogni condizione d\u2019esercizio dell\u2019attivit\u00e0.';

  const TESTO_3_4_P1_DEFAULT =
    'All\u2019interno dello studio odontoiatrico sono presenti n. 2 vie di esodo indipendenti al fine di minimizzare la probabilit\u00e0 che possano essere contemporaneamente rese indisponibili dagli effetti dell\u2019incendio.';

  const TESTO_3_4_P2_DEFAULT =
    'Al fine di limitare il tempo necessario agli occupanti per abbandonare il compartimento di primo innesco dell\u2019incendio, le lunghezze d\u2019esodo determinate da qualsiasi punto dei locali sono \u2264 60 m. Tale prescrizione risulta soddisfatta per entrambe le vie di esodo. Considerando il punto maggiormente sfavorevole, infatti la lunghezza d\u2019esodo massima risulta pari a circa 25 metri.';

  const TESTO_3_4_2_CONCLUSIONE_DEFAULT =
    'La larghezza di ciascun percorso di esodo orizzontale \u00e8 \u2265 90 cm. Inoltre, tutti i varchi presentano larghezza \u2265 80 cm.';

  const TESTO_3_5_P1_DEFAULT =
    'Per consentire la pronta estinzione di un principio di incendio, nell\u2019attivit\u00e0 in esame sono previsti n.1 estintori a polvere da 6kg e con capacit\u00e0 estinguente pari 34 A 233 BC, in numero tale da garantire una distanza massima di raggiungimento pari a 30 m.';

  const TESTO_3_6_P1_DEFAULT =
    'La rivelazione e la diffusione dell\u2019allarme incendio \u00e8 generalmente demandata alla sorveglianza da parte degli occupanti.';

  const TESTO_3_7_P1_DEFAULT =
    'Le dimensioni delle aperture di smaltimento di fumo e calore d\u2019emergenza presenti all\u2019interno dell\u2019attivit\u00e0 presentano superficie ampiamente superiore alle dimensioni minime prescritte, in virt\u00f9 della presenza delle finestrature ordinarie presenti sulle pareti esterne. Lo smaltimento dei fumi e del calore risulta garantito attraverso la presenza di aperture negli infissi gi\u00e0 presenti e richiesti per il luogo di lavoro ai fini igienico-sanitari.';

  const TESTO_3_8_P1_DEFAULT =
    'L\u2019edificio \u00e8 facilmente avvicinabile, ad una distanza < 50 m, dai mezzi di soccorso senza limitazioni di peso e dimensioni per i veicoli, con possibilit\u00e0 di raggi di sterzata adeguati ai veicoli ed ai mezzi di soccorso. L\u2019accessibilit\u00e0 ai mezzi di soccorso \u00e8 sempre garantita e l\u2019area di manovra dedicata agli autoveicoli garantir\u00e0, in caso di emergenza, l\u2019eventuale esodo rapido degli occupanti.';

  function normalizeRigaAffollamento331(row, fallback) {
    const fb = fallback || { edificio_area: '', superficie: '', numero_persone: '' };
    return {
      edificio_area:
        row != null && row.edificio_area != null && String(row.edificio_area).trim() !== ''
          ? String(row.edificio_area).trim()
          : fb.edificio_area,
      superficie:
        row != null && row.superficie != null && String(row.superficie).trim() !== ''
          ? String(row.superficie).trim()
          : fb.superficie,
      numero_persone:
        row != null && row.numero_persone != null && String(row.numero_persone).trim() !== ''
          ? String(row.numero_persone).trim()
          : fb.numero_persone,
    };
  }

  function mergeRigheAffollamento331Wizard(wizard) {
    const incoming = Array.isArray(wizard?.righe_affollamento_331)
      ? wizard.righe_affollamento_331
      : [];
    if (!incoming.length) {
      return DEFAULT_RIGHE_AFFOLLAMENTO_331.map((r) => ({ ...r }));
    }
    return incoming.map((r, i) =>
      normalizeRigaAffollamento331(r, DEFAULT_RIGHE_AFFOLLAMENTO_331[i] || {})
    );
  }

  function righeAffollamento331ForTemplate(wizard) {
    return mergeRigheAffollamento331Wizard(wizard).map((row) => ({
      EDIFICIO_AREA: row.edificio_area,
      SUPERFICIE: row.superficie,
      NUMERO_PERSONE: row.numero_persone,
    }));
  }

  function strategia3RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_3_2_ultimo_punto: normalizeTesto21Raw(
        w,
        'testo_3_2_ultimo_punto',
        TESTO_3_2_ULTIMO_PUNTO_DEFAULT
      ),
      righe_affollamento_331: mergeRigheAffollamento331Wizard(w),
      testo_3_3_1_p2: normalizeTesto21Raw(w, 'testo_3_3_1_p2', TESTO_3_3_1_P2_DEFAULT),
      testo_3_3_1_p3: normalizeTesto21Raw(w, 'testo_3_3_1_p3', TESTO_3_3_1_P3_DEFAULT),
      testo_3_4_p1: normalizeTesto21Raw(w, 'testo_3_4_p1', TESTO_3_4_P1_DEFAULT),
      testo_3_4_p2: normalizeTesto21Raw(w, 'testo_3_4_p2', TESTO_3_4_P2_DEFAULT),
      testo_3_4_2_conclusione: normalizeTesto21Raw(
        w,
        'testo_3_4_2_conclusione',
        TESTO_3_4_2_CONCLUSIONE_DEFAULT
      ),
      testo_3_5_p1: normalizeTesto21Raw(w, 'testo_3_5_p1', TESTO_3_5_P1_DEFAULT),
      testo_3_6_p1: normalizeTesto21Raw(w, 'testo_3_6_p1', TESTO_3_6_P1_DEFAULT),
      testo_3_7_p1: normalizeTesto21Raw(w, 'testo_3_7_p1', TESTO_3_7_P1_DEFAULT),
      testo_3_8_p1: normalizeTesto21Raw(w, 'testo_3_8_p1', TESTO_3_8_P1_DEFAULT),
    };
  }

  function strategia3ForTemplate(wizard) {
    const raw = strategia3RawFromWizard(wizard);
    return {
      TESTO_3_2_ULTIMO_PUNTO: raw.testo_3_2_ultimo_punto,
      RIGHE_AFFOLLAMENTO_331: righeAffollamento331ForTemplate(wizard),
      TESTO_3_3_1_P2: raw.testo_3_3_1_p2,
      TESTO_3_3_1_P3: raw.testo_3_3_1_p3,
      TESTO_3_4_P1: raw.testo_3_4_p1,
      TESTO_3_4_P2: raw.testo_3_4_p2,
      TESTO_3_4_2_CONCLUSIONE: raw.testo_3_4_2_conclusione,
      TESTO_3_5_P1: raw.testo_3_5_p1,
      TESTO_3_6_P1: raw.testo_3_6_p1,
      TESTO_3_7_P1: raw.testo_3_7_p1,
      TESTO_3_8_P1: raw.testo_3_8_p1,
      _strategia_3_raw: raw,
    };
  }

  const TESTO_4_LISTA2_P1_DEFAULT =
    'predisporre un registro dei controlli, da tenere a disposizione degli organi di controllo, dove siano annotati i controlli periodici e gli interventi di manutenzione su impianti, attrezzature ed altri sistemi di sicurezza antincendio, secondo le cadenze temporali indicate da disposizioni, norme e specifiche tecniche pertinenti, nazionali o internazionali, nonch\u00e9 dal manuale d\u2019uso e manutenzione;';

  const TESTO_4_LISTA2_P2_DEFAULT =
    'accertare preliminarmente la qualifica e l\u2019idoneit\u00e0 dei tecnici manutentori cui affidare l\u2019incarico;';

  const TESTO_4_LISTA2_P3_DEFAULT =
    'designare il personale addetto alla \u201csorveglianza antincendio\u201d, individuato tra gli addetti alla gestione delle emergenze ed opportunamente istruito, affinch\u00e9 possa provvedere alla regolare verifica di tutte le misure attive e passive antincendio installate, mediante la compilazione di idonee liste di controllo.';

  const DEFAULT_MISURE_CONCLUSIONI = [
    {
      id: 'manutenzione_estintori',
      testo: 'Manutenzione periodica dei dispositivi di lotta antincendio;',
      selezionato: true,
    },
    {
      id: 'segnaletica',
      testo: 'Verifica del corretto posizionamento della segnaletica di sicurezza;',
      selezionato: true,
    },
    { id: 'informazione', testo: 'Informazione del personale;', selezionato: true },
    {
      id: 'vie_fuga',
      testo:
        'Verifica periodica della corretta fruibilit\u00e0 delle vie di fuga (sgombre da ostacoli e/o materiali);',
      selezionato: true,
    },
    {
      id: 'stato_estintori',
      testo:
        'Verifica del corretto stato manutentivo e la corretta fruibilit\u00e0 dei dispositivi di lotta antincendio da parte del personale addetto alla sorveglianza;',
      selezionato: true,
    },
    {
      id: 'illuminazione_emergenza',
      testo:
        'Verifica del corretto funzionamento dell\u2019impianto di illuminazione di emergenza;',
      selezionato: true,
    },
    {
      id: 'deposito_materiali',
      testo:
        'Monitoraggio del corretto deposito ed impiego di materiali, attrezzature e sostanze;',
      selezionato: true,
    },
    {
      id: 'appalto_interferenze',
      testo:
        'Supervisione delle eventuali attivit\u00e0 affidate in regime di appalto con particolare riferimento ai rischi da interferenza introdotti in caso di lavorazioni pericolose.',
      selezionato: true,
    },
  ];

  function normalizeMisuraConclusione(row, idx, fallback) {
    const fb = fallback || { id: 'm' + idx, testo: '', selezionato: true };
    return {
      id: String(row?.id || fb.id || 'm' + idx).trim(),
      testo:
        row != null && row.testo != null && String(row.testo).trim() !== ''
          ? String(row.testo).trim()
          : fb.testo,
      selezionato: row != null && row.selezionato === false ? false : fb.selezionato !== false,
    };
  }

  function mergeMisureConclusioniWizard(wizard) {
    const incoming = Array.isArray(wizard?.misure_conclusioni) ? wizard.misure_conclusioni : [];
    if (!incoming.length) {
      return DEFAULT_MISURE_CONCLUSIONI.map((r) => ({ ...r }));
    }
    const byId = new Map();
    incoming.forEach((r, i) => {
      const n = normalizeMisuraConclusione(r, i);
      if (n.id) byId.set(n.id, n);
    });
    const merged = DEFAULT_MISURE_CONCLUSIONI.map((d) => {
      const w = byId.get(d.id);
      return w
        ? { id: d.id, testo: w.testo || d.testo, selezionato: w.selezionato !== false }
        : { ...d };
    });
    const extra = incoming
      .filter((r, i) => {
        const n = normalizeMisuraConclusione(r, i);
        return !DEFAULT_MISURE_CONCLUSIONI.some((d) => d.id === n.id);
      })
      .map((r, i) => normalizeMisuraConclusione(r, i));
    return merged.concat(extra);
  }

  function misureConclusioniForTemplate(wizard) {
    return mergeMisureConclusioniWizard(wizard)
      .filter((m) => m.selezionato !== false && String(m.testo || '').trim())
      .map((m) => ({ TESTO: String(m.testo).trim() }));
  }

  function sezione45RawFromWizard(wizard) {
    const w = wizard || {};
    return {
      testo_4_lista2_p1: normalizeTesto21Raw(w, 'testo_4_lista2_p1', TESTO_4_LISTA2_P1_DEFAULT),
      testo_4_lista2_p2: normalizeTesto21Raw(w, 'testo_4_lista2_p2', TESTO_4_LISTA2_P2_DEFAULT),
      testo_4_lista2_p3: normalizeTesto21Raw(w, 'testo_4_lista2_p3', TESTO_4_LISTA2_P3_DEFAULT),
      misure_conclusioni: mergeMisureConclusioniWizard(w),
    };
  }

  function sezione45ForTemplate(wizard) {
    const raw = sezione45RawFromWizard(wizard);
    return {
      TESTO_4_LISTA2_P1: raw.testo_4_lista2_p1,
      TESTO_4_LISTA2_P2: raw.testo_4_lista2_p2,
      TESTO_4_LISTA2_P3: raw.testo_4_lista2_p3,
      VOCI_CONCLUSIONI_MISURE: misureConclusioniForTemplate(wizard),
      _sezione_4_5_raw: raw,
    };
  }

  function fillAnagraficaInTesto(testo, ragioneSociale, sedeOperativa) {
    return String(testo || '')
      .replace(/\{\{RAGIONE_SOCIALE\}\}/g, ragioneSociale || '')
      .replace(/\{\{SEDE_OPERATIVA\}\}/g, sedeOperativa || '');
  }

  function normalizeMetodoCaricoIncendio(v) {
    const s = String(v || '').trim().toLowerCase();
    return s === 'claraf' ? 'claraf' : 'tabellare';
  }

  const TESTO_CASO1_ASSIMILAZIONE_DEFAULT =
    'Per la realt\u00e0 in esame il carico di incendio \u00e8 stato pertanto stimato assimilandola a quella di un ufficio delle stanze di un ospedale';

  const TESTO_CASO2_INTRO_DEFAULT =
    'Per la sede della {{RAGIONE_SOCIALE}} di {{SEDE_OPERATIVA}}, il carico di incendio specifico di progetto \u00e8:';

  function caricoIncendioRawFromWizard(wizard) {
    const w = wizard || {};
    return {
      metodo_carico_incendio: normalizeMetodoCaricoIncendio(w.metodo_carico_incendio),
      testo_caso1_assimilazione: normalizeTesto21Raw(
        w,
        'testo_caso1_assimilazione',
        TESTO_CASO1_ASSIMILAZIONE_DEFAULT
      ),
      testo_caso2_intro: normalizeTesto21Raw(w, 'testo_caso2_intro', TESTO_CASO2_INTRO_DEFAULT),
    };
  }

  function caricoIncendioForTemplate(wizard, ragioneSociale, sedeOperativa) {
    const raw = caricoIncendioRawFromWizard(wizard);
    const tabellare = raw.metodo_carico_incendio === 'tabellare';
    return {
      METODO_CARICO_INCENDIO: raw.metodo_carico_incendio,
      CASO_CARICO_TABELLARE: tabellare,
      CASO_CARICO_CLARAF: !tabellare,
      TESTO_CASO1_ASSIMILAZIONE: raw.testo_caso1_assimilazione,
      TESTO_CASO2_INTRO: fillAnagraficaInTesto(raw.testo_caso2_intro, ragioneSociale, sedeOperativa),
      _carico_incendio_raw: raw,
    };
  }

  function buildData(azienda, rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const ragioneSociale = azienda?.ragione_sociale || '';
    const testo21 = testo21ForTemplate(ragioneSociale, w);
    const testo22 = testo22ForTemplate(w);
    const testo23 = testo23ForTemplate(w);
    const testo24 = testo24ForTemplate(w, azienda?.sede_operativa || '');
    const testo25 = testo25ForTemplate(w);
    const testo295 = testo295ForTemplate(w);
    const testo31 = testo31ForTemplate(w);
    const strategia3 = strategia3ForTemplate(w);
    const sezione45 = sezione45ForTemplate(w);
    const carico = caricoIncendioForTemplate(w, ragioneSociale, azienda?.sede_operativa || '');

    return {
      RAGIONE_SOCIALE: ragioneSociale,
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '1'),
      DATA_EMISSIONE: dataEmissione,
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      REDATTO_DA: w.redatto_da != null && String(w.redatto_da).trim()
        ? String(w.redatto_da).trim()
        : REDATTO_DA_DEFAULT,
      TESTO_2_1_P1: testo21.TESTO_2_1_P1,
      TESTO_2_1_P2: testo21.TESTO_2_1_P2,
      TESTO_2_1_P3: testo21.TESTO_2_1_P3,
      TESTO_2_2_NOTA_DPR: testo22.TESTO_2_2_NOTA_DPR,
      TESTO_2_2_CONCLUSIONE: testo22.TESTO_2_2_CONCLUSIONE,
      RIGHE_REQUISITI_BASSO_RISCHIO: testo22.RIGHE_REQUISITI_BASSO_RISCHIO,
      TESTO_2_3_1_P1: testo23.TESTO_2_3_1_P1,
      TESTO_2_3_1_P2: testo23.TESTO_2_3_1_P2,
      TESTO_2_3_2_P1: testo23.TESTO_2_3_2_P1,
      TESTO_2_3_2_P2: testo23.TESTO_2_3_2_P2,
      TESTO_2_3_4: testo23.TESTO_2_3_4,
      TESTO_2_4_P1: testo24.TESTO_2_4_P1,
      TESTO_2_4_P2: testo24.TESTO_2_4_P2,
      VOCI_OCCUPANTI_ESPOSTI: testo25.VOCI_OCCUPANTI_ESPOSTI,
      VOCI_TIPOLOGIA_OCCUPANTI: testo25.VOCI_TIPOLOGIA_OCCUPANTI,
      TESTO_2_9_5: testo295.TESTO_2_9_5,
      TESTO_3_1_P1: testo31.TESTO_3_1_P1,
      TESTO_3_1_P2: testo31.TESTO_3_1_P2,
      TESTO_3_2_ULTIMO_PUNTO: strategia3.TESTO_3_2_ULTIMO_PUNTO,
      RIGHE_AFFOLLAMENTO_331: strategia3.RIGHE_AFFOLLAMENTO_331,
      TESTO_3_3_1_P2: strategia3.TESTO_3_3_1_P2,
      TESTO_3_3_1_P3: strategia3.TESTO_3_3_1_P3,
      TESTO_3_4_P1: strategia3.TESTO_3_4_P1,
      TESTO_3_4_P2: strategia3.TESTO_3_4_P2,
      TESTO_3_4_2_CONCLUSIONE: strategia3.TESTO_3_4_2_CONCLUSIONE,
      TESTO_3_5_P1: strategia3.TESTO_3_5_P1,
      TESTO_3_6_P1: strategia3.TESTO_3_6_P1,
      TESTO_3_7_P1: strategia3.TESTO_3_7_P1,
      TESTO_3_8_P1: strategia3.TESTO_3_8_P1,
      TESTO_4_LISTA2_P1: sezione45.TESTO_4_LISTA2_P1,
      TESTO_4_LISTA2_P2: sezione45.TESTO_4_LISTA2_P2,
      TESTO_4_LISTA2_P3: sezione45.TESTO_4_LISTA2_P3,
      VOCI_CONCLUSIONI_MISURE: sezione45.VOCI_CONCLUSIONI_MISURE,
      METODO_CARICO_INCENDIO: carico.METODO_CARICO_INCENDIO,
      CASO_CARICO_TABELLARE: carico.CASO_CARICO_TABELLARE,
      CASO_CARICO_CLARAF: carico.CASO_CARICO_CLARAF,
      TESTO_CASO1_ASSIMILAZIONE: carico.TESTO_CASO1_ASSIMILAZIONE,
      TESTO_CASO2_INTRO: carico.TESTO_CASO2_INTRO,
      LOGO_PREVIEW_URL: w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _rilevamenti: rilevamenti || [],
      _testo_2_1_raw: testo21._testo_2_1_raw,
      _testo_2_2_raw: testo22._testo_2_2_raw,
      _testo_2_3_raw: testo23._testo_2_3_raw,
      _testo_2_4_raw: testo24._testo_2_4_raw,
      _testo_2_5_raw: testo25._testo_2_5_raw,
      _testo_2_9_5_raw: testo295._testo_2_9_5_raw,
      _testo_3_1_raw: testo31._testo_3_1_raw,
      _strategia_3_raw: strategia3._strategia_3_raw,
      _sezione_4_5_raw: sezione45._sezione_4_5_raw,
      _carico_incendio_raw: carico._carico_incendio_raw,
      _incendio_wizard: { ...w },
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '01';

    const ragioneSociale = base.RAGIONE_SOCIALE || '';
    const testo21 = testo21ForTemplate(ragioneSociale, {
      ...(base._testo_2_1_raw || {}),
      ...w,
    });
    const testo22 = testo22ForTemplate({
      ...(base._testo_2_2_raw || {}),
      ...w,
    });
    const testo23 = testo23ForTemplate({
      ...(base._testo_2_3_raw || {}),
      ...w,
    });
    const testo24 = testo24ForTemplate(
      { ...(base._testo_2_4_raw || {}), ...w },
      base.SEDE_OPERATIVA || ''
    );
    const testo25 = testo25ForTemplate({
      ...(base._testo_2_5_raw || {}),
      ...w,
    });
    const testo295 = testo295ForTemplate({
      ...(base._testo_2_9_5_raw || {}),
      ...w,
    });
    const testo31 = testo31ForTemplate({
      ...(base._testo_3_1_raw || {}),
      ...w,
    });
    const strategia3 = strategia3ForTemplate({
      ...(base._strategia_3_raw || {}),
      ...w,
    });
    const sezione45 = sezione45ForTemplate({
      ...(base._sezione_4_5_raw || {}),
      ...w,
    });
    const carico = caricoIncendioForTemplate(
      { ...(base._carico_incendio_raw || {}), ...w },
      ragioneSociale,
      base.SEDE_OPERATIVA || ''
    );

    return {
      ...base,
      MODULO_NUMERO: modNum,
      REDATTO_DA:
        w.redatto_da != null && String(w.redatto_da).trim()
          ? String(w.redatto_da).trim()
          : base.REDATTO_DA || REDATTO_DA_DEFAULT,
      TESTO_2_1_P1: testo21.TESTO_2_1_P1,
      TESTO_2_1_P2: testo21.TESTO_2_1_P2,
      TESTO_2_1_P3: testo21.TESTO_2_1_P3,
      TESTO_2_2_NOTA_DPR: testo22.TESTO_2_2_NOTA_DPR,
      TESTO_2_2_CONCLUSIONE: testo22.TESTO_2_2_CONCLUSIONE,
      RIGHE_REQUISITI_BASSO_RISCHIO: testo22.RIGHE_REQUISITI_BASSO_RISCHIO,
      TESTO_2_3_1_P1: testo23.TESTO_2_3_1_P1,
      TESTO_2_3_1_P2: testo23.TESTO_2_3_1_P2,
      TESTO_2_3_2_P1: testo23.TESTO_2_3_2_P1,
      TESTO_2_3_2_P2: testo23.TESTO_2_3_2_P2,
      TESTO_2_3_4: testo23.TESTO_2_3_4,
      TESTO_2_4_P1: testo24.TESTO_2_4_P1,
      TESTO_2_4_P2: testo24.TESTO_2_4_P2,
      VOCI_OCCUPANTI_ESPOSTI: testo25.VOCI_OCCUPANTI_ESPOSTI,
      VOCI_TIPOLOGIA_OCCUPANTI: testo25.VOCI_TIPOLOGIA_OCCUPANTI,
      TESTO_2_9_5: testo295.TESTO_2_9_5,
      TESTO_3_1_P1: testo31.TESTO_3_1_P1,
      TESTO_3_1_P2: testo31.TESTO_3_1_P2,
      TESTO_3_2_ULTIMO_PUNTO: strategia3.TESTO_3_2_ULTIMO_PUNTO,
      RIGHE_AFFOLLAMENTO_331: strategia3.RIGHE_AFFOLLAMENTO_331,
      TESTO_3_3_1_P2: strategia3.TESTO_3_3_1_P2,
      TESTO_3_3_1_P3: strategia3.TESTO_3_3_1_P3,
      TESTO_3_4_P1: strategia3.TESTO_3_4_P1,
      TESTO_3_4_P2: strategia3.TESTO_3_4_P2,
      TESTO_3_4_2_CONCLUSIONE: strategia3.TESTO_3_4_2_CONCLUSIONE,
      TESTO_3_5_P1: strategia3.TESTO_3_5_P1,
      TESTO_3_6_P1: strategia3.TESTO_3_6_P1,
      TESTO_3_7_P1: strategia3.TESTO_3_7_P1,
      TESTO_3_8_P1: strategia3.TESTO_3_8_P1,
      TESTO_4_LISTA2_P1: sezione45.TESTO_4_LISTA2_P1,
      TESTO_4_LISTA2_P2: sezione45.TESTO_4_LISTA2_P2,
      TESTO_4_LISTA2_P3: sezione45.TESTO_4_LISTA2_P3,
      VOCI_CONCLUSIONI_MISURE: sezione45.VOCI_CONCLUSIONI_MISURE,
      METODO_CARICO_INCENDIO: carico.METODO_CARICO_INCENDIO,
      CASO_CARICO_TABELLARE: carico.CASO_CARICO_TABELLARE,
      CASO_CARICO_CLARAF: carico.CASO_CARICO_CLARAF,
      TESTO_CASO1_ASSIMILAZIONE: carico.TESTO_CASO1_ASSIMILAZIONE,
      TESTO_CASO2_INTRO: carico.TESTO_CASO2_INTRO,
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      _testo_2_1_raw: testo21._testo_2_1_raw,
      _testo_2_2_raw: testo22._testo_2_2_raw,
      _testo_2_3_raw: testo23._testo_2_3_raw,
      _testo_2_4_raw: testo24._testo_2_4_raw,
      _testo_2_5_raw: testo25._testo_2_5_raw,
      _testo_2_9_5_raw: testo295._testo_2_9_5_raw,
      _testo_3_1_raw: testo31._testo_3_1_raw,
      _strategia_3_raw: strategia3._strategia_3_raw,
      _sezione_4_5_raw: sezione45._sezione_4_5_raw,
      _carico_incendio_raw: carico._carico_incendio_raw,
      _incendio_wizard: { ...w },
    };
  }

  function validateVociElenco(nomeSezione, vociTemplate, vociRaw) {
    const errors = [];
    const attive = (vociTemplate || []).filter((v) => v.TESTO);
    if (!attive.length) {
      errors.push(nomeSezione + ': selezionare almeno un punto nell\u2019elenco');
    }
    (vociRaw || []).forEach((v, i) => {
      if (v.attivo === false) return;
      if (!String(v.testo || '').trim()) {
        errors.push(nomeSezione + ': punto ' + (i + 1) + ' attivo senza testo');
      }
    });
    return errors;
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    if (!String(data.REDATTO_DA || '').trim()) {
      errors.push('Redatto da mancante');
    }
    if (!String(data.TESTO_2_1_P1 || '').trim()) {
      errors.push('\u00a72.1: primo paragrafo descrizione attivit\u00e0/luoghi mancante');
    }
    if (!String(data.TESTO_2_1_P2 || '').trim()) {
      errors.push('\u00a72.1: secondo paragrafo descrizione attivit\u00e0/luoghi mancante');
    }
    if (!String(data.TESTO_2_1_P3 || '').trim()) {
      errors.push('\u00a72.1: terzo paragrafo descrizione attivit\u00e0/luoghi mancante');
    }
    if (!String(data.TESTO_2_2_NOTA_DPR || '').trim()) {
      errors.push('\u00a72.2: paragrafo D.P.R. 151 mancante');
    }
    if (!String(data.TESTO_2_2_CONCLUSIONE || '').trim()) {
      errors.push('\u00a72.2: paragrafo conclusione requisiti mancante');
    }
    const righe = data._testo_2_2_raw?.righe_requisiti_basso_rischio || data.RIGHE_REQUISITI_BASSO_RISCHIO || [];
    if (!righe.length) {
      errors.push('\u00a72.2: tabella requisiti rischio basso vuota');
    }
    righe.forEach((r, i) => {
      const el = String(r.elemento || r.ELEMENTO || '').trim();
      if (!el) errors.push('\u00a72.2: riga ' + (i + 1) + ' tabella — descrizione elemento mancante');
    });
    if (!String(data.TESTO_2_3_1_P1 || '').trim()) {
      errors.push('\u00a72.3.1: primo paragrafo sorgenti di innesco mancante');
    }
    if (!String(data.TESTO_2_3_1_P2 || '').trim()) {
      errors.push('\u00a72.3.1: secondo paragrafo sorgenti di innesco mancante');
    }
    if (!String(data.TESTO_2_3_2_P1 || '').trim()) {
      errors.push('\u00a72.3.2: primo paragrafo materiali combustibili mancante');
    }
    if (!String(data.TESTO_2_3_2_P2 || '').trim()) {
      errors.push('\u00a72.3.2: secondo paragrafo materiali combustibili mancante');
    }
    if (!String(data.TESTO_2_3_4 || '').trim()) {
      errors.push('\u00a72.3.4: paragrafo interazione inneschi-combustibili mancante');
    }
    if (!String(data.TESTO_2_4_P1 || '').trim()) {
      errors.push('\u00a72.4: primo paragrafo contesto/ambiente mancante');
    }
    if (!String(data.TESTO_2_4_P2 || '').trim()) {
      errors.push('\u00a72.4: secondo paragrafo contesto/ambiente mancante');
    }
    errors.push(
      ...validateVociElenco(
        '\u00a72.5',
        data.VOCI_OCCUPANTI_ESPOSTI,
        data._testo_2_5_raw?.voci_occupanti_esposti
      )
    );
    errors.push(
      ...validateVociElenco(
        '\u00a72.5.1',
        data.VOCI_TIPOLOGIA_OCCUPANTI,
        data._testo_2_5_raw?.voci_tipologia_occupanti
      )
    );
    if (!String(data.TESTO_2_9_5 || '').trim()) {
      errors.push('\u00a72.9.5: paragrafo attrezzature mobili di estinzione mancante');
    }
    if (!String(data.TESTO_3_1_P1 || '').trim()) {
      errors.push('\u00a73.1: primo paragrafo esigenze speciali mancante');
    }
    if (!String(data.TESTO_3_1_P2 || '').trim()) {
      errors.push('\u00a73.1: secondo paragrafo procedure esigenze speciali mancante');
    }
    if (!String(data.TESTO_3_2_ULTIMO_PUNTO || '').trim()) {
      errors.push('\u00a73.2: ultimo punto elenco sistema di esodo mancante');
    }
    const righeAff = data._strategia_3_raw?.righe_affollamento_331 || data.RIGHE_AFFOLLAMENTO_331 || [];
    if (!righeAff.length) {
      errors.push('\u00a73.3.1: tabella affollamento vuota');
    }
    righeAff.forEach((r, i) => {
      const area = String(r.edificio_area || r.EDIFICIO_AREA || '').trim();
      const sup = String(r.superficie || r.SUPERFICIE || '').trim();
      const num = String(r.numero_persone || r.NUMERO_PERSONE || '').trim();
      if (!area) errors.push('\u00a73.3.1: riga ' + (i + 1) + ' — edificio/area mancante');
      if (!sup) errors.push('\u00a73.3.1: riga ' + (i + 1) + ' — superficie mancante');
      if (!num) errors.push('\u00a73.3.1: riga ' + (i + 1) + ' — numero persone mancante');
    });
    if (!String(data.TESTO_3_3_1_P2 || '').trim()) {
      errors.push('\u00a73.3.1: paragrafo dopo tabella affollamento mancante');
    }
    if (!String(data.TESTO_3_3_1_P3 || '').trim()) {
      errors.push('\u00a73.3.1: dichiarazione affollamento (grassetto) mancante');
    }
    if (!String(data.TESTO_3_4_P1 || '').trim()) {
      errors.push('\u00a73.4: primo paragrafo vie di esodo mancante');
    }
    if (!String(data.TESTO_3_4_P2 || '').trim()) {
      errors.push('\u00a73.4: paragrafo lunghezze d\u2019esodo mancante');
    }
    if (!String(data.TESTO_3_4_2_CONCLUSIONE || '').trim()) {
      errors.push('\u00a73.4.2: frase conclusiva larghezze vie di esodo mancante');
    }
    if (!String(data.TESTO_3_5_P1 || '').trim()) {
      errors.push('\u00a73.5: paragrafo controllo incendio mancante');
    }
    if (!String(data.TESTO_3_6_P1 || '').trim()) {
      errors.push('\u00a73.6: paragrafo rivelazione e allarme mancante');
    }
    if (!String(data.TESTO_3_7_P1 || '').trim()) {
      errors.push('\u00a73.7: paragrafo controllo fumi e calore mancante');
    }
    if (!String(data.TESTO_3_8_P1 || '').trim()) {
      errors.push('\u00a73.8: paragrafo operativit\u00e0 antincendio mancante');
    }
    if (!String(data.TESTO_4_LISTA2_P1 || '').trim()) {
      errors.push('\u00a74: secondo elenco punto 1 (registro controlli) mancante');
    }
    if (!String(data.TESTO_4_LISTA2_P2 || '').trim()) {
      errors.push('\u00a74: secondo elenco punto 2 (tecnici manutentori) mancante');
    }
    if (!String(data.TESTO_4_LISTA2_P3 || '').trim()) {
      errors.push('\u00a74: secondo elenco punto 3 (sorveglianza antincendio) mancante');
    }
    const misureConc = data.VOCI_CONCLUSIONI_MISURE || [];
    if (!misureConc.length) {
      errors.push('\u00a75: selezionare almeno una misura nell\u2019elenco conclusioni');
    }
    const misureConcRaw = data._sezione_4_5_raw?.misure_conclusioni || [];
    misureConcRaw.forEach((m, i) => {
      if (m.selezionato === false) return;
      if (!String(m.testo || '').trim()) {
        errors.push('\u00a75: misura conclusioni ' + (i + 1) + ' selezionata senza testo');
      }
    });
    const metodo = data.METODO_CARICO_INCENDIO || data._carico_incendio_raw?.metodo_carico_incendio;
    if (!metodo) {
      errors.push('\u00a72.3.3: selezionare metodo carico incendio (tabellare o CLARAF)');
    } else if (metodo === 'tabellare' && !String(data.TESTO_CASO1_ASSIMILAZIONE || '').trim()) {
      errors.push('\u00a72.3.3 CASO 1: testo assimilazione destinazione d\u2019uso mancante');
    } else if (metodo === 'claraf' && !String(data.TESTO_CASO2_INTRO || '').trim()) {
      errors.push('\u00a72.3.3 CASO 2: frase introduttiva sede mancante');
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
      if (k === 'RIGHE_REQUISITI_BASSO_RISCHIO' && Array.isArray(v)) {
        templateData[k] = v.map((row) => ({
          ELEMENTO: templateValue(row.ELEMENTO),
          MARK_SI: templateValue(row.MARK_SI),
          MARK_NO: templateValue(row.MARK_NO),
        }));
        continue;
      }
      if (
        (k === 'VOCI_OCCUPANTI_ESPOSTI' || k === 'VOCI_TIPOLOGIA_OCCUPANTI') &&
        Array.isArray(v)
      ) {
        templateData[k] = v.map((row) => ({
          TESTO: templateValue(row.TESTO),
        }));
        continue;
      }
      if (k === 'RIGHE_AFFOLLAMENTO_331' && Array.isArray(v)) {
        templateData[k] = v.map((row) => ({
          EDIFICIO_AREA: templateValue(row.EDIFICIO_AREA),
          SUPERFICIE: templateValue(row.SUPERFICIE),
          NUMERO_PERSONE: templateValue(row.NUMERO_PERSONE),
        }));
        continue;
      }
      if (k === 'VOCI_CONCLUSIONI_MISURE' && Array.isArray(v)) {
        templateData[k] = v.map((row) => ({
          TESTO: templateValue(row.TESTO),
        }));
        continue;
      }
      if (k === 'CASO_CARICO_TABELLARE' || k === 'CASO_CARICO_CLARAF') {
        templateData[k] = !!v;
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
      throw new Error('Errore rendering template incendio: ' + msg);
    }

    const outZip = doc.getZip();
    if (repair?.expandJoinedListParagraphsInZip) {
      repair.expandJoinedListParagraphsInZip(outZip, {
        marker: 'Manutenzione periodica dei dispositivi di lotta antincendio',
        minSemicolons: 3,
      });
    }
    if (logoBuffer && window.GEN_LOGO_DOCX?.injectLogoIntoDocxZip) {
      await window.GEN_LOGO_DOCX.injectLogoIntoDocxZip(outZip, logoBuffer, logoPathHint);
    }
    return outZip.generate({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  window.GEN_ADAPTERS = window.GEN_ADAPTERS || {};
  window.GEN_ADAPTERS[CODICE] = {
    codice: CODICE,
    nome: NOME,
    REDATTO_DA_DEFAULT,
    TESTO_2_1_P1_DEFAULT,
    TESTO_2_1_P2_DEFAULT,
    TESTO_2_1_P3_DEFAULT,
    fillRagioneSocialeInTesto,
    testo21RawFromWizard,
    testo21ForTemplate,
    TESTO_2_2_NOTA_DPR_DEFAULT,
    TESTO_2_2_CONCLUSIONE_DEFAULT,
    DEFAULT_RIGHE_REQUISITI_BASSO_RISCHIO,
    mergeRigheRequisitiWizard,
    requisitiBassoRischioForTemplate,
    testo22RawFromWizard,
    testo22ForTemplate,
    TESTO_2_3_1_P1_DEFAULT,
    TESTO_2_3_1_P2_DEFAULT,
    TESTO_2_3_2_P1_DEFAULT,
    TESTO_2_3_2_P2_DEFAULT,
    TESTO_2_3_4_DEFAULT,
    testo23RawFromWizard,
    testo23ForTemplate,
    TESTO_2_4_P1_DEFAULT,
    TESTO_2_4_P2_DEFAULT,
    testo24RawFromWizard,
    testo24ForTemplate,
    DEFAULT_VOCI_OCCUPANTI_ESPOSTI,
    DEFAULT_VOCI_TIPOLOGIA_OCCUPANTI,
    mergeVociElencoWizard,
    testo25RawFromWizard,
    testo25ForTemplate,
    TESTO_2_9_5_DEFAULT,
    testo295RawFromWizard,
    testo295ForTemplate,
    TESTO_3_1_P1_DEFAULT,
    TESTO_3_1_P2_DEFAULT,
    testo31RawFromWizard,
    testo31ForTemplate,
    TESTO_3_2_ULTIMO_PUNTO_DEFAULT,
    DEFAULT_RIGHE_AFFOLLAMENTO_331,
    mergeRigheAffollamento331Wizard,
    TESTO_3_3_1_P2_DEFAULT,
    TESTO_3_3_1_P3_DEFAULT,
    TESTO_3_4_P1_DEFAULT,
    TESTO_3_4_P2_DEFAULT,
    TESTO_3_4_2_CONCLUSIONE_DEFAULT,
    TESTO_3_5_P1_DEFAULT,
    TESTO_3_6_P1_DEFAULT,
    TESTO_3_7_P1_DEFAULT,
    TESTO_3_8_P1_DEFAULT,
    strategia3RawFromWizard,
    strategia3ForTemplate,
    TESTO_4_LISTA2_P1_DEFAULT,
    TESTO_4_LISTA2_P2_DEFAULT,
    TESTO_4_LISTA2_P3_DEFAULT,
    DEFAULT_MISURE_CONCLUSIONI,
    mergeMisureConclusioniWizard,
    sezione45RawFromWizard,
    sezione45ForTemplate,
    fillAnagraficaInTesto,
    normalizeMetodoCaricoIncendio,
    TESTO_CASO1_ASSIMILAZIONE_DEFAULT,
    TESTO_CASO2_INTRO_DEFAULT,
    caricoIncendioRawFromWizard,
    caricoIncendioForTemplate,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
