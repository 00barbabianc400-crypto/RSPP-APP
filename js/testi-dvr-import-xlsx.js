/**
 * Import Testi DVR da Excel (foglio DATI).
 * Colonne attese (riga 1): titolo_testo | id_rischio | livello | tipo_testo |
 * azienda_origine | priorita_intervento | testo_valutazione | misure_in_atto | misure_programmate
 */
(function () {
  const SHEET_NAMES = ['DATI', 'dati', 'Testi', 'testi'];
  const LIVELLI = new Set(['Basso', 'Medio', 'Alto']);
  const TIPI = new Set(['Standard', 'Custom']);
  const PRIORITA = new Set(['Immediato', 'Breve termine', 'Medio termine', 'Lungo termine']);

  const HEADER_ALIASES = {
    titolo_testo: ['titolo_testo', 'titolo', 'title'],
    id_rischio: ['id_rischio', 'codice_rischio', 'rischio', 'id rischio'],
    livello: ['livello', 'level'],
    tipo_testo: ['tipo_testo', 'tipo', 'tipo testo'],
    azienda_origine: ['azienda_origine', 'azienda', 'partita_iva', 'p.iva', 'piva'],
    priorita_intervento: ['priorita_intervento', 'priorita', 'priorità', 'priorita intervento'],
    testo_valutazione: ['testo_valutazione', 'testo', 'testo valutazione'],
    misure_in_atto: ['misure_in_atto', 'misure in atto'],
    misure_programmate: ['misure_programmate', 'misure programmate'],
  };

  function normHeader(h) {
    return String(h || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  }

  function normCell(v) {
    if (v == null) return '';
    return String(v).replace(/\s+/g, ' ').trim();
  }

  function findSheet(wb) {
    for (const name of SHEET_NAMES) {
      if (wb.SheetNames.includes(name)) return name;
    }
    return wb.SheetNames[0] || null;
  }

  function mapHeaders(headerRow) {
    const col = {};
    const normalized = headerRow.map(normHeader);
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      const idx = normalized.findIndex(h => aliases.includes(h));
      if (idx >= 0) col[key] = idx;
    }
    return col;
  }

  function parseRowsFromWorkbook(wb) {
    const sheetName = findSheet(wb);
    if (!sheetName) return { ok: false, errors: ['Nessun foglio nel file Excel'] };

    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
    });
    if (!rows.length) return { ok: false, errors: ['Foglio DATI vuoto'] };

    const col = mapHeaders(rows[0]);
    const missing = ['titolo_testo', 'id_rischio', 'livello', 'tipo_testo', 'testo_valutazione'].filter(k => col[k] == null);
    if (missing.length) {
      return {
        ok: false,
        errors: ['Intestazioni mancanti: ' + missing.join(', ') + '. Usa il template scaricabile.'],
      };
    }

    const dataRows = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const get = (k) => normCell(r[col[k]]);
      const row = {
        _rowNum: i + 1,
        titolo_testo: get('titolo_testo'),
        id_rischio: get('id_rischio').toUpperCase(),
        livello: get('livello'),
        tipo_testo: get('tipo_testo'),
        azienda_origine: get('azienda_origine'),
        priorita_intervento: get('priorita_intervento'),
        testo_valutazione: get('testo_valutazione'),
        misure_in_atto: get('misure_in_atto'),
        misure_programmate: get('misure_programmate'),
      };
      if (!row.titolo_testo && !row.testo_valutazione && !row.id_rischio) continue;
      dataRows.push(row);
    }
    return { ok: true, sheetName, rows: dataRows };
  }

  function validateRows(rows, rischi, aziende) {
    const rischiByCode = new Map((rischi || []).map(r => [String(r.id_rischio || '').toUpperCase(), r]));
    const aziendeByPiva = new Map();
    const aziendeByNome = new Map();
    (aziende || []).forEach(a => {
      const piva = normCell(a.fields?.PartitaIva || a.partita_iva || '').replace(/\D/g, '');
      const nome = normCell(a.fields?.RagioneSociale || a.ragione_sociale || '').toLowerCase();
      if (piva) aziendeByPiva.set(piva, a);
      if (nome) aziendeByNome.set(nome, a);
    });

    return rows.map(row => {
      const errors = [];
      if (!row.titolo_testo) errors.push('Titolo obbligatorio');
      if (!row.id_rischio) errors.push('id_rischio obbligatorio');
      else if (!rischiByCode.has(row.id_rischio)) errors.push('Rischio «' + row.id_rischio + '» non trovato nel catalogo');

      if (!row.livello) errors.push('Livello obbligatorio');
      else if (!LIVELLI.has(row.livello)) errors.push('Livello non valido (Basso/Medio/Alto)');

      if (!row.tipo_testo) errors.push('tipo_testo obbligatorio');
      else if (!TIPI.has(row.tipo_testo)) errors.push('tipo_testo non valido (Standard/Custom)');

      if (row.tipo_testo === 'Custom') {
        if (!row.azienda_origine) errors.push('azienda_origine obbligatoria per Custom');
        else {
          const key = row.azienda_origine.replace(/\D/g, '');
          const byPiva = key.length >= 11 ? aziendeByPiva.get(key.slice(0, 11)) : null;
          const byNome = aziendeByNome.get(row.azienda_origine.toLowerCase());
          const az = byPiva || byNome;
          if (!az) errors.push('Azienda origine non trovata (P.IVA o ragione sociale)');
          else row._azienda_id = az.id;
        }
      }

      if (row.priorita_intervento && !PRIORITA.has(row.priorita_intervento)) {
        errors.push('priorita_intervento non valida');
      }

      if (!row.testo_valutazione) errors.push('testo_valutazione obbligatorio');

      const rischio = rischiByCode.get(row.id_rischio);
      if (rischio) row._rischio_id = rischio.id;

      return {
        ...row,
        ok: errors.length === 0,
        errors,
      };
    });
  }

  function rowsToPayloads(validRows, autoreId) {
    return validRows.map(row => ({
      titolo_testo: row.titolo_testo,
      rischio_id: row._rischio_id,
      livello: row.livello,
      tipo_testo: row.tipo_testo,
      azienda_origine_id: row.tipo_testo === 'Custom' ? row._azienda_id : null,
      priorita_intervento: row.priorita_intervento || null,
      testo_valutazione: row.testo_valutazione,
      misure_in_atto: row.misure_in_atto || null,
      misure_programmate: row.misure_programmate || null,
      autore_id: autoreId || null,
    }));
  }

  function parseQuestionarioArrayBuffer(arrayBuffer, context) {
    if (!window.XLSX) {
      return { ok: false, errors: ['Libreria XLSX non caricata'] };
    }
    let wb;
    try {
      wb = window.XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
    } catch (e) {
      return { ok: false, errors: ['File non leggibile: ' + (e.message || e)] };
    }

    const parsed = parseRowsFromWorkbook(wb);
    if (!parsed.ok) return parsed;

    const validated = validateRows(parsed.rows, context?.rischi, context?.aziende);
    const valid = validated.filter(r => r.ok);
    const invalid = validated.filter(r => !r.ok);

    return {
      ok: true,
      sheetName: parsed.sheetName,
      rows: validated,
      valid,
      invalid,
      payloads: rowsToPayloads(valid, context?.autoreId),
    };
  }

  window.TESTI_DVR_IMPORT_XLSX = {
    parseQuestionarioArrayBuffer,
    validateRows,
    rowsToPayloads,
  };
})();
