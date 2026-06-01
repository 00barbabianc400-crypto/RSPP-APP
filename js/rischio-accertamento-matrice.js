/**
 * Matrice rischio lavorativo → accertamenti sanitari (condivisa: profili, Appendice C).
 */
(function () {
  'use strict';

  const PERIODICITA_OPTS = [
    { id: 'annuale', label: 'Annuale', ordine: 1 },
    { id: 'biennale', label: 'Biennale', ordine: 2 },
    { id: 'quinquennale', label: 'Quinquennale', ordine: 3 },
  ];

  const ACCERTAMENTI_BY_ID = {
    VISITA_IDONEITA: {
      id: 'VISITA_IDONEITA',
      nome: 'Visita medica di idoneità',
      wordLabel: 'Visita medica di idoneità',
      ordine: 10,
    },
    ECFR: {
      id: 'ECFR',
      nome: 'Esame Clinico Funzionale Rachide',
      wordLabel: 'ECFR',
      ordine: 20,
    },
    CONTROLLO_OCULISTICO: {
      id: 'CONTROLLO_OCULISTICO',
      nome: 'Controllo ergoftalmologico (visiotest o visita oculistica)',
      wordLabel: 'Controllo oculistico',
      ordine: 30,
    },
    SPIROMETRIA: { id: 'SPIROMETRIA', nome: 'Spirometria', wordLabel: 'Spirometria', ordine: 40 },
    ESAMI_EMATOCHIMICI: {
      id: 'ESAMI_EMATOCHIMICI',
      nome: 'Esami ematochimici',
      wordLabel: 'Esami ematochimici',
      ordine: 50,
    },
    AUDIOMETRIA: { id: 'AUDIOMETRIA', nome: 'Audiometria', wordLabel: 'Audiometria', ordine: 60 },
    ESAME_AUDIVEST: {
      id: 'ESAME_AUDIVEST',
      nome: 'Esame o prove audiovestibolari',
      wordLabel: 'Esame o prove audiovestibolari',
      ordine: 70,
    },
    ALCOL_TEST: {
      id: 'ALCOL_TEST',
      nome: 'Alcol test (Etilometro)',
      wordLabel: 'Alcol test (Etilometro)',
      ordine: 80,
    },
    DRUG_TEST: { id: 'DRUG_TEST', nome: 'Drug Test', wordLabel: 'Drug Test', ordine: 90 },
    ANTITETANICA: {
      id: 'ANTITETANICA',
      nome: 'Antitetanica o anticorpi IgG',
      wordLabel: 'Antitetanica o anticorpi IgG',
      ordine: 100,
    },
    MARKERS_EPATITE: {
      id: 'MARKERS_EPATITE',
      nome: 'Markers Epatite HBsAg – HBs Ab - HCV',
      wordLabel: 'Markers Epatite HBsAg – HBs Ab - HCV',
      ordine: 110,
    },
    CARBOSSIEMOGLOBINA: {
      id: 'CARBOSSIEMOGLOBINA',
      nome: 'Carbossiemoglobina',
      wordLabel: 'Carbossiemoglobina',
      ordine: 120,
    },
    ECG: { id: 'ECG', nome: 'ECG', wordLabel: 'ECG', ordine: 130 },
  };

  const RISCHI_LAVORATIVI = [
    { id: 'ATTIVITA_ALTEZZA', nome: 'Attività in altezza', ordine: 10 },
    { id: 'PLE', nome: 'Conduzione Piattaforme di Lavoro Elevabili', ordine: 20 },
    { id: 'GUIDA_VEICOLI', nome: 'Guida veicoli', ordine: 30 },
    { id: 'MMC', nome: 'MMC', ordine: 40 },
    { id: 'POLVERI', nome: 'Polveri', ordine: 50 },
    { id: 'RISCHI_POSTURALI', nome: 'Rischi posturali', ordine: 60 },
    { id: 'RISCHIO_CHIMICO', nome: 'Rischio Chimico', ordine: 70 },
    { id: 'RISCHIO_ROA', nome: 'Rischio ROA', ordine: 80 },
    { id: 'RISCHIO_BIOLOGICO', nome: 'Rischio biologico', ordine: 90 },
    { id: 'RUMORE', nome: 'Rumore', ordine: 100 },
    { id: 'VDT', nome: 'VDT', ordine: 110 },
    { id: 'VIBRAZIONI', nome: 'Vibrazioni', ordine: 120 },
  ];

  const MATRICE = {
    ATTIVITA_ALTEZZA: [
      'ALCOL_TEST', 'DRUG_TEST', 'ECFR', 'ESAME_AUDIVEST', 'ESAMI_EMATOCHIMICI', 'VISITA_IDONEITA',
    ],
    PLE: [
      'ALCOL_TEST', 'DRUG_TEST', 'ECFR', 'ESAME_AUDIVEST', 'ESAMI_EMATOCHIMICI', 'VISITA_IDONEITA',
    ],
    GUIDA_VEICOLI: ['ALCOL_TEST', 'ECFR', 'ESAMI_EMATOCHIMICI', 'VISITA_IDONEITA'],
    MMC: ['ECFR', 'ECG', 'SPIROMETRIA', 'VISITA_IDONEITA'],
    POLVERI: ['ECFR', 'SPIROMETRIA', 'VISITA_IDONEITA'],
    RISCHI_POSTURALI: ['ECFR', 'VISITA_IDONEITA'],
    RISCHIO_CHIMICO: [
      'ECFR', 'ESAME_AUDIVEST', 'ESAMI_EMATOCHIMICI', 'SPIROMETRIA', 'VISITA_IDONEITA',
    ],
    RISCHIO_ROA: [
      'CARBOSSIEMOGLOBINA', 'CONTROLLO_OCULISTICO', 'ECFR', 'ESAMI_EMATOCHIMICI', 'VISITA_IDONEITA',
    ],
    RISCHIO_BIOLOGICO: [
      'ANTITETANICA', 'MARKERS_EPATITE', 'ECFR', 'ESAMI_EMATOCHIMICI', 'VISITA_IDONEITA',
    ],
    RUMORE: ['AUDIOMETRIA', 'ECFR', 'ESAME_AUDIVEST', 'VISITA_IDONEITA'],
    VDT: ['CONTROLLO_OCULISTICO', 'ECFR', 'VISITA_IDONEITA'],
    VIBRAZIONI: ['ECFR', 'VISITA_IDONEITA'],
  };

  function getRischio(id) {
    return RISCHI_LAVORATIVI.find((r) => r.id === id) || null;
  }

  function getAccertamento(id) {
    return ACCERTAMENTI_BY_ID[id] || null;
  }

  function accertamentiForRischi(rischiIds) {
    const seen = new Set();
    const out = [];
    (Array.isArray(rischiIds) ? rischiIds : []).forEach((rid) => {
      const list = MATRICE[rid] || [];
      list.forEach((aid) => {
        if (seen.has(aid)) return;
        seen.add(aid);
        const acc = getAccertamento(aid);
        if (acc) out.push(acc);
      });
    });
    out.sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
    return out;
  }

  function mergePeriodicitaIds(perAccertamentoMap, accertamentoId) {
    const raw = perAccertamentoMap?.[accertamentoId];
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const ids = [];
    raw.forEach((pid) => {
      const id = String(pid || '').toLowerCase();
      if (!id || seen.has(id)) return;
      if (!PERIODICITA_OPTS.some((p) => p.id === id)) return;
      seen.add(id);
      ids.push(id);
    });
    ids.sort(
      (a, b) =>
        (PERIODICITA_OPTS.find((p) => p.id === a)?.ordine || 99) -
        (PERIODICITA_OPTS.find((p) => p.id === b)?.ordine || 99)
    );
    return ids;
  }

  function formatPeriodicitaForAccertamento(perAccertamentoMap, accertamentoId) {
    const ids = mergePeriodicitaIds(perAccertamentoMap, accertamentoId);
    return ids.map((id) => PERIODICITA_OPTS.find((p) => p.id === id)?.label || id).join(', ');
  }

  function defaultGruppoConfig() {
    return { rischi_ids: [], periodicita: {}, page_break_before: false };
  }

  function normalizeGruppoConfig(raw) {
    const cfg = raw && typeof raw === 'object' ? raw : defaultGruppoConfig();
    return {
      rischi_ids: Array.isArray(cfg.rischi_ids) ? cfg.rischi_ids.filter((id) => !!MATRICE[id]) : [],
      periodicita:
        cfg.periodicita && typeof cfg.periodicita === 'object' ? { ...cfg.periodicita } : {},
      page_break_before: !!cfg.page_break_before,
    };
  }

  function normalizeProtocolloProfilo(raw) {
    return normalizeGruppoConfig(raw);
  }

  const api = {
    PERIODICITA_OPTS,
    RISCHI_LAVORATIVI,
    ACCERTAMENTI_BY_ID,
    MATRICE,
    getRischio,
    getAccertamento,
    accertamentiForRischi,
    mergePeriodicitaIds,
    formatPeriodicitaForAccertamento,
    defaultGruppoConfig,
    normalizeGruppoConfig,
    normalizeProtocolloProfilo,
  };

  window.RISCHIO_ACCERTAMENTO_MATRICE = api;
  window.APPENDICE_C_MATRICE = api;
})();
