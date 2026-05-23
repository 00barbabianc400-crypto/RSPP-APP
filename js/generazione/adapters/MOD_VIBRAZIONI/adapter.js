/**
 * Adapter MOD_VIBRAZIONI — Valutazione rischio vibrazioni (stub iniziale).
 * Registra window.GEN_ADAPTERS['MOD_VIBRAZIONI']
 */
(function () {
  'use strict';

  const CODICE = 'MOD_VIBRAZIONI';
  const NOME = 'Valutazione del rischio vibrazioni';

  const VIBRAZ_TIPI_LOWER = new Set([
    'vibrazioni — sistema mano-braccio',
    'vibrazioni — corpo intero',
  ]);

  const LABEL_ESPOSTO = 'X';
  const LABEL_NON_ESPOSTO = 'NON ESPOSTO';

  const TESTO_FASCIA_A =
    'Esposizione inferiore al valore di azione\nAddetti in Fascia A';
  const TESTO_FASCIA_B =
    'Superamento valore di azione\nAddetti in Fascia B';

  function normalizeProfiloAzienda(p) {
    const row = p || {};
    return {
      id: String(row.id || row.profilo_id || '').trim(),
      nome: String(row.nome || row.nome_profilo || '').trim(),
      descrizione_attivita: String(row.descrizione_attivita || '').trim(),
      attivo: row.attivo !== false,
    };
  }

  function normalizeProfiliAzienda(list) {
    const out = [];
    const seen = new Set();
    for (const item of list || []) {
      const p = normalizeProfiloAzienda(item);
      if (!p.id || !p.nome || p.attivo === false) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    out.sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
    return out;
  }

  /** 'esposto' | 'non_esposto' */
  function normalizeEspostoVibrazioni(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'x' || s === 'esposto' || s === 'si' || s === 'sì' || s === 'true' || s === '1') {
      return 'esposto';
    }
    return 'non_esposto';
  }

  function cellaEspostoLabel(v) {
    return normalizeEspostoVibrazioni(v) === 'esposto' ? LABEL_ESPOSTO : LABEL_NON_ESPOSTO;
  }

  function emptyMansioneGruppo(profilo) {
    return {
      profilo_id: profilo?.id || '',
      nome: profilo?.nome || '',
      hav: 'non_esposto',
      wbv: 'non_esposto',
    };
  }

  function normalizeMansioneGruppoRow(r, profilo) {
    const base = emptyMansioneGruppo(profilo);
    const row = r || {};
    return {
      profilo_id: String(row.profilo_id || base.profilo_id).trim(),
      nome: String(row.nome || base.nome).trim(),
      hav: normalizeEspostoVibrazioni(row.hav != null ? row.hav : row.esposizione_hav),
      wbv: normalizeEspostoVibrazioni(row.wbv != null ? row.wbv : row.esposizione_wbv),
    };
  }

  /** Una riga per ogni profilo/gruppo omogeneo associato all'azienda. */
  function mergeMansioniGruppiWizard(wizard, profiliAzienda) {
    const catalog = normalizeProfiliAzienda(profiliAzienda || wizard?._profili_azienda || []);
    const incoming = Array.isArray(wizard?.mansioni_gruppi) ? wizard.mansioni_gruppi : [];
    const byId = new Map(incoming.map((r) => [String(r.profilo_id || r.id || '').trim(), r]));

    return catalog.map((p) => {
      const saved = byId.get(p.id);
      return saved ? normalizeMansioneGruppoRow(saved, p) : emptyMansioneGruppo(p);
    });
  }

  function mansioniGruppiForTemplate(wizard, profiliAzienda) {
    return mergeMansioniGruppiWizard(wizard, profiliAzienda).map((row) => ({
      NOME_GRUPPO: row.nome,
      CELLA_HAV: cellaEspostoLabel(row.hav),
      CELLA_WBV: cellaEspostoLabel(row.wbv),
    }));
  }

  /** 'A' | 'B' */
  function normalizeFasciaConclusioni(v, fallback) {
    const s = String(v || fallback || 'A')
      .trim()
      .toUpperCase();
    if (s === 'B' || s === 'FASCIA_B' || s === 'FASCIAB') return 'B';
    return 'A';
  }

  function emptyConclusioneGruppo(mansioneRow) {
    const m = mansioneRow || {};
    const row = {
      profilo_id: m.profilo_id || '',
      nome: m.nome || '',
      hav_fascia: null,
      wbv_fascia: null,
    };
    if (normalizeEspostoVibrazioni(m.hav) === 'esposto') row.hav_fascia = 'A';
    if (normalizeEspostoVibrazioni(m.wbv) === 'esposto') row.wbv_fascia = 'A';
    return row;
  }

  function mergeConclusioniGruppiWizard(wizard, profiliAzienda) {
    const mansioni = mergeMansioniGruppiWizard(wizard, profiliAzienda);
    const incoming = Array.isArray(wizard?.conclusioni_gruppi) ? wizard.conclusioni_gruppi : [];
    const byId = new Map(incoming.map((r) => [String(r.profilo_id || '').trim(), r]));

    return mansioni.map((m) => {
      const saved = byId.get(m.profilo_id) || {};
      const base = emptyConclusioneGruppo(m);
      return {
        profilo_id: m.profilo_id,
        nome: m.nome,
        hav: m.hav,
        wbv: m.wbv,
        hav_fascia:
          normalizeEspostoVibrazioni(m.hav) === 'esposto'
            ? normalizeFasciaConclusioni(saved.hav_fascia, base.hav_fascia)
            : null,
        wbv_fascia:
          normalizeEspostoVibrazioni(m.wbv) === 'esposto'
            ? normalizeFasciaConclusioni(saved.wbv_fascia, base.wbv_fascia)
            : null,
      };
    });
  }

  function testoConclusioniPerTipo(row, tipo) {
    const key = tipo === 'wbv' ? 'wbv' : 'hav';
    const fasciaKey = tipo === 'wbv' ? 'wbv_fascia' : 'hav_fascia';
    if (normalizeEspostoVibrazioni(row[key]) !== 'esposto') {
      return LABEL_NON_ESPOSTO;
    }
    return row[fasciaKey] === 'B' ? TESTO_FASCIA_B : TESTO_FASCIA_A;
  }

  function hasFasciaBConclusioni(rows) {
    return (rows || []).some((r) => r.hav_fascia === 'B' || r.wbv_fascia === 'B');
  }

  function conclusioniGruppiForTemplate(wizard, profiliAzienda) {
    return mergeConclusioniGruppiWizard(wizard, profiliAzienda).map((row) => ({
      NOME_GRUPPO: row.nome,
      TESTO_CONCLUSIONI_HAV: testoConclusioniPerTipo(row, 'hav'),
      TESTO_CONCLUSIONI_WBV: testoConclusioniPerTipo(row, 'wbv'),
    }));
  }

  /** Gruppi con esposizione X in §4 → blocchi §7 (HAV) o §8 (WBV); Excel incorporato resta copia del modello. */
  function valutazioniForTemplate(wizard, profiliAzienda, kind) {
    const key = kind === 'wbv' ? 'wbv' : 'hav';
    return mergeMansioniGruppiWizard(wizard, profiliAzienda)
      .filter((row) => normalizeEspostoVibrazioni(row[key]) === 'esposto')
      .map((row) => ({
        NOME_GRUPPO: row.nome,
        PROFILO_ID: row.profilo_id,
      }));
  }

  function emptyMacchinaRow() {
    return { id: '', tipologia: '', modello: '', aw: '' };
  }

  function normalizeMacchinaRow(r) {
    const row = r || {};
    return {
      id: String(row.id != null ? row.id : '').trim(),
      tipologia: String(row.tipologia || '').trim(),
      modello: String(row.modello || '').trim(),
      aw: String(row.aw != null ? row.aw : '').trim(),
    };
  }

  function defaultMacchineFromSeed(kind) {
    const seed = window.MOD_VIBRAZIONI_DEFAULTS || {};
    const list = kind === 'wbv' ? seed.WBV : seed.HAV;
    return Array.isArray(list) ? list.map((r) => normalizeMacchinaRow(r)) : [];
  }

  function mergeMacchineWizard(wizard, kind) {
    const key = kind === 'wbv' ? 'macchine_wbv' : 'macchine_hav';
    const incoming = wizard?.[key];
    if (Array.isArray(incoming) && incoming.length) {
      return incoming.map(normalizeMacchinaRow);
    }
    const seeded = defaultMacchineFromSeed(kind);
    return seeded.length ? seeded : [emptyMacchinaRow()];
  }

  function macchineForTemplate(wizard, kind) {
    return mergeMacchineWizard(wizard, kind).map((row) => {
      const out = {
        ID: row.id,
        TIPOLOGIA: row.tipologia,
        MODELLO: row.modello,
      };
      if (kind === 'wbv') out.AW_MAX = row.aw;
      else out.AW_SUM = row.aw;
      return out;
    });
  }

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

  function formatItalianoMisura(val, unitHint) {
    if (val == null || val === '') return '';
    const raw = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.').trim());
    if (!Number.isFinite(raw)) return String(val);
    const num = Number(raw.toPrecision(15));
    const s = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(num);
    const u = unitHint != null && String(unitHint).trim() !== '' ? String(unitHint).trim() : '';
    return u ? s + '\u202f' + u : s;
  }

  function isTipoVibrazioniCatalogo(nomeTipo) {
    const n = String(nomeTipo || '').trim().toLowerCase();
    if (VIBRAZ_TIPI_LOWER.has(n)) return true;
    return n.includes('vibrazion');
  }

  function filterRilevamentiVibrazioni(rilevamenti) {
    return (rilevamenti || []).filter((r) => isTipoVibrazioniCatalogo(r.tipo_rilevamento?.nome_tipo));
  }

  /** Riga tabella misure (wizard / anteprima) — da estendere con colonne del modello Word. */
  function emptyRigaVibrazioni() {
    return {
      postazione: '',
      data: '',
      tipo: '',
      valore: '',
      limite: '',
      esito: '',
    };
  }

  function normalizeRigaVibrazioni(r) {
    const e = emptyRigaVibrazioni();
    const o = r || {};
    Object.keys(e).forEach((k) => {
      e[k] = o[k] != null && o[k] !== undefined ? String(o[k]) : '';
    });
    return e;
  }

  function rilevamentoToWizardRow(r) {
    const row = emptyRigaVibrazioni();
    const nome = r.tipo_rilevamento?.nome_tipo || '';
    row.postazione = String(r.zona || r.postazione || '').trim();
    if (r.data_rilevamento) {
      const d = new Date(r.data_rilevamento);
      if (!Number.isNaN(d.getTime())) {
        row.data = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }
    row.tipo = nome;
    row.valore = formatItalianoMisura(r.valore_misurato, r.unita_misura || 'm/s²');
    row.limite = formatItalianoMisura(r.limite_riferimento, r.unita_misura || 'm/s²');
    row.esito = String(r.esito || '').trim();
    return row;
  }

  function mergeRigheVibrazioniWizard(wizard, rilevamenti) {
    const incoming = wizard?.righe_vibrazioni;
    if (Array.isArray(incoming) && incoming.length) {
      return incoming.map(normalizeRigaVibrazioni);
    }
    const fromDb = filterRilevamentiVibrazioni(rilevamenti).map(rilevamentoToWizardRow);
    return fromDb.length ? fromDb : [emptyRigaVibrazioni()];
  }

  function righeVibrazioniForTemplate(wizard, rilevamenti) {
    return mergeRigheVibrazioniWizard(wizard, rilevamenti).map((r, i) => ({
      RIGA_N: String(i + 1),
      POSTAZIONE: r.postazione,
      DATA_RIL: r.data,
      TIPO_RILEVAMENTO: r.tipo,
      VALORE: r.valore,
      LIMITE: r.limite,
      ESITO: r.esito,
    }));
  }

  function buildData(azienda, rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const righe = righeVibrazioniForTemplate(w, rilevamenti);
    const profiliAzienda = normalizeProfiliAzienda(w.profili_azienda || []);
    const mansioniWizard = mergeMansioniGruppiWizard(w, profiliAzienda);
    const macchineHav = mergeMacchineWizard(w, 'hav');
    const macchineWbv = mergeMacchineWizard(w, 'wbv');

    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '1'),
      DATA_EMISSIONE: dataEmissione,
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      LOGO_PREVIEW_URL: w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      MANSIONI_GRUPPI: mansioniGruppiForTemplate(w, profiliAzienda),
      VALUTAZIONI_HAV: valutazioniForTemplate(w, profiliAzienda, 'hav'),
      VALUTAZIONI_WBV: valutazioniForTemplate(w, profiliAzienda, 'wbv'),
      MACCHINE_HAV: macchineForTemplate(w, 'hav'),
      MACCHINE_WBV: macchineForTemplate(w, 'wbv'),
      CONCLUSIONI_GRUPPI: conclusioniGruppiForTemplate(w, profiliAzienda),
      MOSTRA_NOTA_FASCIA_B: hasFasciaBConclusioni(mergeConclusioniGruppiWizard(w, profiliAzienda)),
      RIGHE_VIBRAZIONI: righe,
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _profili_azienda: profiliAzienda,
      _mansioni_gruppi: mansioniWizard,
      _valutazioni_hav: valutazioniForTemplate(w, profiliAzienda, 'hav'),
      _valutazioni_wbv: valutazioniForTemplate(w, profiliAzienda, 'wbv'),
      _macchine_hav: macchineHav,
      _macchine_wbv: macchineWbv,
      _conclusioni_gruppi: mergeConclusioniGruppiWizard(w, profiliAzienda),
      _righe_vibrazioni: mergeRigheVibrazioniWizard(w, rilevamenti),
      _rilevamenti_vibrazioni: filterRilevamentiVibrazioni(rilevamenti),
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '01';
    const righe = righeVibrazioniForTemplate(w, base._rilevamenti_vibrazioni);
    const profiliAzienda = base._profili_azienda || [];
    const mansioniWizard = mergeMansioniGruppiWizard(w, profiliAzienda);

    return {
      ...base,
      MODULO_NUMERO: modNum,
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      MANSIONI_GRUPPI: mansioniGruppiForTemplate(w, profiliAzienda),
      VALUTAZIONI_HAV: valutazioniForTemplate(w, profiliAzienda, 'hav'),
      VALUTAZIONI_WBV: valutazioniForTemplate(w, profiliAzienda, 'wbv'),
      MACCHINE_HAV: macchineForTemplate(w, 'hav'),
      MACCHINE_WBV: macchineForTemplate(w, 'wbv'),
      CONCLUSIONI_GRUPPI: conclusioniGruppiForTemplate(w, profiliAzienda),
      MOSTRA_NOTA_FASCIA_B: hasFasciaBConclusioni(mergeConclusioniGruppiWizard(w, profiliAzienda)),
      RIGHE_VIBRAZIONI: righe,
      _mansioni_gruppi: mansioniWizard,
      _conclusioni_gruppi: mergeConclusioniGruppiWizard(w, profiliAzienda),
      _valutazioni_hav: valutazioniForTemplate(w, profiliAzienda, 'hav'),
      _valutazioni_wbv: valutazioniForTemplate(w, profiliAzienda, 'wbv'),
      _macchine_hav: mergeMacchineWizard(w, 'hav'),
      _macchine_wbv: mergeMacchineWizard(w, 'wbv'),
      _vibrazioni_wizard: { ...w },
      _righe_vibrazioni: mergeRigheVibrazioniWizard(w, base._rilevamenti_vibrazioni),
    };
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    const mansioni = data._mansioni_gruppi || [];
    if (!mansioni.length) {
      errors.push('§4 MANSIONI: nessun gruppo omogeneo associato all\u2019azienda');
    }
    if (data._richiede_macchine_hav === true) {
      const hav = (data._macchine_hav || []).filter((r) => String(r.id || '').trim());
      if (!hav.length) errors.push('§5.1 HAV: almeno una macchina nella tabella');
    }
    if (data._richiede_macchine_wbv === true) {
      const wbv = (data._macchine_wbv || []).filter((r) => String(r.id || '').trim());
      if (!wbv.length) errors.push('§5.2 WBV: almeno una macchina nella tabella');
    }
    // Tabella misure: validazione attiva solo se nel template è presente il loop RIGHE_VIBRAZIONI
    if (data._richiede_tabella_misure === true) {
      const righe = data._righe_vibrazioni || data.RIGHE_VIBRAZIONI || [];
      const conDati = righe.filter((r) => String(r.postazione || r.POSTAZIONE || '').trim());
      if (!conDati.length) {
        errors.push('Inserire almeno una riga di misura vibrazioni (postazione)');
      }
    }
    const conclusioni = data._conclusioni_gruppi || [];
    conclusioni.forEach((row) => {
      const nome = row.nome || row.profilo_id || 'gruppo';
      if (normalizeEspostoVibrazioni(row.hav) === 'esposto' && !row.hav_fascia) {
        errors.push('§9 Conclusioni: seleziona fascia HAV per «' + nome + '»');
      }
      if (normalizeEspostoVibrazioni(row.wbv) === 'esposto' && !row.wbv_fascia) {
        errors.push('§9 Conclusioni: seleziona fascia WBV per «' + nome + '»');
      }
    });
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
      if (k === 'MOSTRA_NOTA_FASCIA_B') {
        templateData[k] = !!v;
        continue;
      }
      if (
        (k === 'RIGHE_VIBRAZIONI' ||
          k === 'MANSIONI_GRUPPI' ||
          k === 'VALUTAZIONI_HAV' ||
          k === 'VALUTAZIONI_WBV' ||
          k === 'MACCHINE_HAV' ||
          k === 'MACCHINE_WBV' ||
          k === 'CONCLUSIONI_GRUPPI') &&
        Array.isArray(v)
      ) {
        templateData[k] = v.map((row) => {
          const out = {};
          Object.keys(row || {}).forEach((rk) => {
            out[rk] = templateValue(row[rk]);
          });
          return out;
        });
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
      throw new Error('Errore rendering template vibrazioni: ' + msg);
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
    LABEL_ESPOSTO,
    LABEL_NON_ESPOSTO,
    normalizeProfiloAzienda,
    normalizeProfiliAzienda,
    normalizeEspostoVibrazioni,
    cellaEspostoLabel,
    mergeMansioniGruppiWizard,
    mansioniGruppiForTemplate,
    valutazioniForTemplate,
    TESTO_FASCIA_A,
    TESTO_FASCIA_B,
    normalizeFasciaConclusioni,
    mergeConclusioniGruppiWizard,
    conclusioniGruppiForTemplate,
    hasFasciaBConclusioni,
    testoConclusioniPerTipo,
    emptyMacchinaRow,
    normalizeMacchinaRow,
    mergeMacchineWizard,
    macchineForTemplate,
    defaultMacchineFromSeed,
    isTipoVibrazioniCatalogo,
    filterRilevamentiVibrazioni,
    emptyRigaVibrazioni,
    mergeRigheVibrazioniWizard,
    righeVibrazioniForTemplate,
    buildData,
    applyWizard,
    validate,
    generateDocx,
  };
})();
