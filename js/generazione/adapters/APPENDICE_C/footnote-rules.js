/**
 * Regole note a piè di pagina — Appendice C (protocollo sanitario).
 */
(function () {
  'use strict';

  const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  const FOOTNOTE_TEXT = {
    ART176:
      'Art. 176 D.lgs. 81/08: la periodicità delle visite è biennale per i lavoratori '
      + 'classificati come idonei con prescrizioni e per i lavoratori che abbiano compiuto il 50 anno di età',
    EMATOCHIMICI:
      'Esami ematochimici: Emocromo – Creatinina – GOT – GPT – Gamma GT – Glicemia – Azotemia',
    ANTITETANICA:
      'Antitetanica o anticorpi IgG: con periodicità non annuale',
  };

  const ACC_ANTITETANICA = 'ANTITETANICA';
  const ACC_EMATOCHIMICI = 'ESAMI_EMATOCHIMICI';

  function normNomeProfilo(nome) {
    return String(nome || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  /** Solo ed esclusivamente profilo «IMPIEGATO VDT». */
  function isImpiegatoVdt(nome) {
    return normNomeProfilo(nome) === 'IMPIEGATO VDT';
  }

  function periodicitaIdsForAcc(cfg, accId) {
    const mat = window.APPENDICE_C_MATRICE;
    if (!mat?.mergePeriodicitaIds) return [];
    return mat.mergePeriodicitaIds(cfg?.periodicita, accId);
  }

  function hasBiennaleInPeriodicita(cfg, accertamenti) {
    const mat = window.APPENDICE_C_MATRICE;
    if (!mat) return false;
    return (accertamenti || []).some((acc) => {
      const ids = periodicitaIdsForAcc(cfg, acc.id);
      return ids.includes('biennale');
    });
  }

  function hasPeriodicitaNonAnnualeAntitetanica(cfg) {
    const ids = periodicitaIdsForAcc(cfg, ACC_ANTITETANICA);
    return ids.includes('biennale') || ids.includes('quinquennale');
  }

  function hasAccertamento(accertamenti, accId) {
    return (accertamenti || []).some((a) => a.id === accId);
  }

  /**
   * Valuta quali note servono per un gruppo (dati wizard + profilo).
   * @returns {{ art176: boolean, ematochimici: boolean, antitetanica: boolean, anchors: Array }}
   */
  function evaluateFootnotesForGruppo(gruppo, profilo, cfg) {
    const out = {
      art176: false,
      ematochimici: false,
      antitetanica: false,
      anchors: [],
    };
    if (!gruppo?.SORVEGLIANZA_PREVISTA) return out;

    const mat = window.APPENDICE_C_MATRICE;
    const rischiIds = cfg?.rischi_ids || [];
    const accertamenti = mat?.accertamentiForRischi ? mat.accertamentiForRischi(rischiIds) : [];

    if (isImpiegatoVdt(profilo?.nome || gruppo.GRUPPO_NOME) && hasBiennaleInPeriodicita(cfg, accertamenti)) {
      out.art176 = true;
      out.anchors.push({
        type: 'ART176',
        cell: 'periodicita',
        search: 'Biennale',
        text: FOOTNOTE_TEXT.ART176,
      });
    }

    if (hasAccertamento(accertamenti, ACC_EMATOCHIMICI)) {
      out.ematochimici = true;
      const acc = mat.getAccertamento(ACC_EMATOCHIMICI);
      out.anchors.push({
        type: 'EMATOCHIMICI',
        cell: 'accertamenti',
        search: acc.wordLabel || acc.nome,
        text: FOOTNOTE_TEXT.EMATOCHIMICI,
      });
    }

    if (
      hasAccertamento(accertamenti, ACC_ANTITETANICA) &&
      hasPeriodicitaNonAnnualeAntitetanica(cfg)
    ) {
      out.antitetanica = true;
      const acc = mat.getAccertamento(ACC_ANTITETANICA);
      const label = acc.wordLabel || acc.nome;
      out.anchors.push({
        type: 'ANTITETANICA',
        cell: 'accertamenti',
        search: label.indexOf('Antitetanica') === 0 ? 'Antitetanica' : label,
        text: FOOTNOTE_TEXT.ANTITETANICA,
      });
    }

    return out;
  }

  function enrichGruppoWithFootnotes(gruppo, profilo, cfg) {
    const fn = evaluateFootnotesForGruppo(gruppo, profilo, cfg);
    return {
      ...gruppo,
      IS_IMPIEGATO_VDT: isImpiegatoVdt(profilo?.nome || gruppo.GRUPPO_NOME),
      FN_ART176: fn.art176,
      FN_EMATOCHIMICI: fn.ematochimici,
      FN_ANTITETANICA: fn.antitetanica,
      FN_ANCHORS: fn.anchors,
      PAGE_BREAK_BEFORE: !!cfg?.page_break_before,
    };
  }

  window.APPENDICE_C_FOOTNOTE_RULES = {
    WNS,
    FOOTNOTE_TEXT,
    isImpiegatoVdt,
    evaluateFootnotesForGruppo,
    enrichGruppoWithFootnotes,
  };
})();
