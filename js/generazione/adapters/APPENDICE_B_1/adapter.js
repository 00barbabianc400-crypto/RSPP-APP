/**
 * Adapter APPENDICE_B1_PROFILI — Appendice B.1 Profili di rischio (Excel).
 * Template: MANUTENTORE sheet (1 sheet per profilo) + Scheda Azienda.
 */
(function () {
  'use strict';

  const CODICE = 'APPENDICE_B1_PROFILI';
  const NOME = 'Appendice B.1: Profili di rischio occupazionale';
  const SHEET_SCHEDA = 'Scheda Azienda';
  const TEMPLATE_SHEET = 'MANUTENTORE';
  const PREFIX_DESCRIZIONE_CICLO = 'Descrizione sintetica del ciclo produttivo: ';

  // ─── ColorScale (da template MCP): stops 1=verde, 2=giallo, 4=rosso ─────────
  const MACRO_SICUREZZA = 'Rischi per la Sicurezza';
  const MACRO_SALUTE    = 'Rischi per la Salute';
  const MACRO_PSICO     = 'Rischi Psicosociali e Trasversali';

  // Template layout (nuovo template 2023)
  const RISCHI_HEADER_ROW = 6;   // nomi rischi (A:AO)
  const RECAP_VALUES_ROW  = 7;   // valori recap rischi (A:AO)
  const RISCHI_COL_START  = 1;   // A
  const RISCHI_COL_END    = 41;  // AO
  const FASE_HEADER_ROW   = 8;
  const FASE_FIRST_DATA_ROW = 9;
  const TEMPLATE_FASE_ROW_COUNT = 2; // righe-modello nel foglio MANUTENTORE (9–10)
  const STATIC_ROW_HEIGHTS = [102, 75, 112.5, 68.25];
  const FASE_MIN_ROW_HEIGHT = 48;
  const FASE_MAX_ROW_HEIGHT = 320;

  const LIVELLO_TO_NUM = {
    'Trascurabile': 1,
    'Basso':        2,
    'Medio':        3,
    'Alto':         4,
  };

  // ─── Utility ─────────────────────────────────────────────────────────────────

  function deepCloneObj(o) {
    try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; }
  }

  function imageExtensionFromBuffer(buf, pathHint) {
    if (!buf || buf.byteLength < 4) return 'png';
    const u8 = new Uint8Array(buf.slice(0, 4));
    if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return 'jpeg';
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return 'png';
    const path = String(pathHint || '').toLowerCase();
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'jpeg';
    return 'png';
  }

  function sanitizeSheetName(name) {
    // Max 31 chars, rimuovi caratteri non validi Excel
    return String(name || 'Profilo')
      .replace(/[:\\\/\?\*\[\]]/g, '-')
      .substring(0, 31)
      .trim() || 'Profilo';
  }

  // ─── Profili ordinamento ─────────────────────────────────────────────────────

  function profiliSchedaSorted(profili) {
    return [...(profili || [])]
      .filter((p) => p && String(p.nome || '').trim())
      .sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), 'it', { sensitivity: 'base' }));
  }

  function normalizzaFasiLavoro(fasi_lavoro) {
    const raw = Array.isArray(fasi_lavoro) ? fasi_lavoro : [];
    return raw.map((s) => String(s || '').trim()).filter(Boolean);
  }

  // ─── Scheda Azienda helpers ──────────────────────────────────────────────────

  function schedaCellaA9Testo(profili) {
    const list = profiliSchedaSorted(profili);
    return list.map((p) => '• ' + String(p.nome).trim()).join('\n');
  }

  function schedaCellaC9Testo(profili) {
    const list = profiliSchedaSorted(profili);
    return list
      .map((p) => {
        const fasi = normalizzaFasiLavoro(p.fasi_lavoro);
        if (!fasi.length) return '• —';
        return fasi.map((f) => '• ' + f).join(', ');
      })
      .join('\n');
  }

  function fasiLavoroVirgola(fasi_lavoro) {
    return normalizzaFasiLavoro(fasi_lavoro).join(', ');
  }

  /** Fasi strutturate (DB) o fallback da `fasi_lavoro[]`. */
  function getFasiDettaglioProfilo(profilo, sheetData) {
    const pid = String(profilo?.id || '');
    const list = sheetData?._profilo_fasi_dettaglio?.[pid];
    if (Array.isArray(list) && list.length) {
      return list
        .slice()
        .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
        .map((f) => ({
          nome: String(f.nome || '').trim(),
          misure_specifiche: String(f.misure_specifiche || '').trim(),
          dpi_specifici: String(f.dpi_specifici || '').trim(),
        }))
        .filter((f) => f.nome);
    }
    return normalizzaFasiLavoro(profilo?.fasi_lavoro).map((nome) => ({
      nome,
      misure_specifiche: '',
      dpi_specifici: '',
    }));
  }

  function firstStaticRowNum(numFasi) {
    return FASE_FIRST_DATA_ROW + Math.max(0, numFasi);
  }

  function ensureCellReadable(cell) {
    if (!cell) return;
    const f = cell.font || {};
    cell.font = {
      name: f.name || 'Calibri',
      size: f.size || 11,
      bold: f.bold || false,
      italic: f.italic || false,
      color: { argb: 'FF000000' },
    };
  }

  function estimatePhaseRowHeight(ws, rowNum) {
    const cols = [
      { col: 'A', width: (ws.getColumn('A').width || 18) + (ws.getColumn('B').width || 18) },
      { col: 'C', width: ws.getColumn('C').width || 28 },
      { col: 'D', width: ws.getColumn('D').width || 28 },
    ];
    const texts = {
      A: String(ws.getCell('A' + rowNum).value || ''),
      C: String(ws.getCell('C' + rowNum).value || ''),
      D: String(ws.getCell('D' + rowNum).value || ''),
    };
    let maxH = FASE_MIN_ROW_HEIGHT;
    cols.forEach(({ col, width }) => {
      const text = texts[col] || '';
      if (!text) return;
      const charsPerLine = Math.max(12, Math.floor(width * 1.05));
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      maxH = Math.max(maxH, lines * 15 + 10);
    });
    return Math.min(FASE_MAX_ROW_HEIGHT, maxH);
  }

  /** Adatta il numero di righe fase (template ne ha 2) prima del blocco statico. */
  function ensurePhaseRowCount(ws, numFasi) {
    const n = Math.max(0, numFasi);
    const delta = n - TEMPLATE_FASE_ROW_COUNT;
    const snap = snapshotRowStyles(ws, FASE_FIRST_DATA_ROW, RISCHI_COL_END);
    const insertAfter = FASE_FIRST_DATA_ROW + TEMPLATE_FASE_ROW_COUNT;

    if (delta > 0) {
      for (let i = 0; i < delta; i++) {
        ws.spliceRows(insertAfter, 0, []);
        applyRowStyleSnapshot(ws, insertAfter + i, snap, RISCHI_COL_END);
      }
    } else if (delta < 0) {
      ws.spliceRows(FASE_FIRST_DATA_ROW + n, -delta);
    }
  }

  function writePhaseDataRows(ws, fasi, wrapTop) {
    ensurePhaseRowCount(ws, fasi.length);
    fasi.forEach((fase, i) => {
      const r = FASE_FIRST_DATA_ROW + i;
      try { ws.unMergeCells('A' + r + ':B' + r); } catch (e) { /* skip */ }
      try { ws.mergeCells('A' + r + ':B' + r); } catch (e) { /* skip */ }

      const cellA = ws.getCell('A' + r);
      cellA.value = fase.nome || '';
      cellA.alignment = wrapTop;
      ensureCellReadable(cellA);

      const cellC = ws.getCell('C' + r);
      cellC.value = fase.misure_specifiche || '';
      cellC.alignment = wrapTop;
      ensureCellReadable(cellC);

      const cellD = ws.getCell('D' + r);
      cellD.value = fase.dpi_specifici || '';
      cellD.alignment = wrapTop;
      ensureCellReadable(cellD);

      const h = estimatePhaseRowHeight(ws, r);
      if (h) ws.getRow(r).height = h;
    });
  }

  // ─── Macro categoria → colonna Sicurezza/Igiene (Scheda Azienda) ────────────
  function macroVersoColonnaSicIgiene(macro) {
    const m = String(macro || '').trim();
    if (m === MACRO_SICUREZZA) return 'sicurezza';
    if (m === MACRO_SALUTE || m === MACRO_PSICO) return 'igiene';
    return null;
  }

  // ─── Rischi per profilo (Scheda Azienda) ─────────────────────────────────────
  function buildRischiByProfilo(valutazioni, profiliIdsSet) {
    const by = {};
    profiliIdsSet.forEach((id) => { by[id] = []; });
    const seen = new Set();
    (valutazioni || []).forEach((row) => {
      if (row.rischio_associato === false) return;
      const pid = String(row.profilo_id || '');
      if (!pid || !profiliIdsSet.has(pid)) return;
      const r = row.rischio;
      if (!r?.id) return;
      const rid = String(r.id);
      const k = pid + '|' + rid;
      if (seen.has(k)) return;
      seen.add(k);
      if (!by[pid]) by[pid] = [];
      by[pid].push({
        rischio_id:     rid,
        nome_rischio:   String(r.nome_rischio || '').trim(),
        macro_categoria:String(r.macro_categoria || '').trim(),
        ordine:         typeof r.ordine === 'number' ? r.ordine : 9999,
      });
    });
    Object.keys(by).forEach((pid) => {
      by[pid].sort((a, b) =>
        (a.ordine - b.ordine) || a.nome_rischio.localeCompare(b.nome_rischio, 'it', { sensitivity: 'base' }));
    });
    return by;
  }

  function defaultSelezioneRischi(byProfilo) {
    const sel = {};
    Object.keys(byProfilo || {}).forEach((pid) => {
      sel[pid] = (byProfilo[pid] || []).map((x) => x.rischio_id);
    });
    return sel;
  }

  function nomiRischiSelezione(byProfilo, selezione, profiloId, col) {
    const pid = String(profiloId);
    const rows = byProfilo[pid] || [];
    const ids = new Set(Array.isArray(selezione?.[pid]) ? selezione[pid] : []);
    const out = [];
    const seen = new Set();
    rows.forEach((row) => {
      if (!ids.has(row.rischio_id)) return;
      const colonna = macroVersoColonnaSicIgiene(row.macro_categoria);
      if (colonna !== col) return;
      const nome = row.nome_rischio || '—';
      if (seen.has(nome)) return;
      seen.add(nome);
      out.push(nome);
    });
    return out.join(', ');
  }

  function normalizeRiskName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * Mappa livelli per profilo:
   * { [profiloId]: { [nomeRischioNormalizzato]: livello } }
   */
  function buildLivelliByProfiloName(valutazioni, profiliIdsSet) {
    const out = {};
    profiliIdsSet.forEach((id) => { out[id] = {}; });
    (valutazioni || []).forEach((row) => {
      const pid = String(row.profilo_id || '');
      if (!pid || !profiliIdsSet.has(pid)) return;
      const nome = row.rischio?.nome_rischio;
      const key = normalizeRiskName(nome);
      if (!key) return;
      out[pid][key] = row.livello_rischio || 'Trascurabile';
    });
    return out;
  }

  // ─── ColorScale interpolation ────────────────────────────────────────────────
  /** Restituisce argb hex (FF......) per la colorScale 1=verde, 2=giallo, 4=rosso. */
  function livelloToTemplateValue(lvl) {
    if (!lvl || lvl === 'Trascurabile') return '-';
    return LIVELLO_TO_NUM[lvl] ?? '-';
  }

  function styleRecapCell(cell, rawValue) {
    const v = String(rawValue ?? '');
    // Template rule equivalente: "-" grigio.
    if (v === '-') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.font = Object.assign({}, cell.font || {}, { color: { argb: 'FF333333' } });
      return;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    // Mappa colore stabile (come scala 1→verde, 2→giallo, 4→rosso).
    const argb =
      n <= 1 ? 'FF92D050'
      : n <= 2 ? 'FFFFFF00'
      : n <= 3 ? 'FFFFA500'
      : 'FFFF0000';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font = Object.assign({}, cell.font || {}, { color: { argb: 'FF000000' } });
  }

  function buildTemplateRiskColumns(ws) {
    const cols = [];
    for (let c = RISCHI_COL_START; c <= RISCHI_COL_END; c++) {
      const header = ws.getRow(RISCHI_HEADER_ROW).getCell(c).value;
      const nome = String(header || '').trim();
      if (!nome) continue;
      cols.push({ colNum: c, key: normalizeRiskName(nome) });
    }
    return cols;
  }

  // ─── ExcelJS clone worksheet ─────────────────────────────────────────────────
  /** Snapshot stili riga (per duplicare la riga-modello fasi). */
  function snapshotRowStyles(ws, rowNum, colEnd) {
    const srcRow = ws.getRow(rowNum);
    const cells = [];
    for (let c = 1; c <= colEnd; c++) {
      const style = srcRow.getCell(c).style;
      cells.push(
        style && Object.keys(style).length ? deepCloneObj(style) : null
      );
    }
    return { height: srcRow.height, cells };
  }

  function applyRowStyleSnapshot(ws, rowNum, snap, colEnd) {
    const destRow = ws.getRow(rowNum);
    if (snap.height) destRow.height = snap.height;
    for (let c = 1; c <= colEnd; c++) {
      const style = snap.cells[c - 1];
      if (style) destRow.getCell(c).style = deepCloneObj(style);
    }
    try { destRow.commit(); } catch (e) { /* skip */ }
  }

  /** Aggiorna il ref della colorScale (C..S) in base al numero di fasi. */
  /**
   * Clona il foglio srcName in un nuovo foglio destName.
   * Copia: dimensioni colonne/righe, valori+stili celle, merge, page setup,
   * views, margini, header/footer, formattazione condizionale.
   */
  function cloneWorksheet(wb, srcName, destName) {
    const src = wb.getWorksheet(srcName);
    if (!src) throw new Error('Foglio template "' + srcName + '" non trovato nel template Excel');

    const dest = wb.addWorksheet(destName);

    // Page setup + margini
    try {
      const ps = src.pageSetup || {};
      dest.pageSetup.orientation   = ps.orientation;
      dest.pageSetup.paperSize     = ps.paperSize;
      dest.pageSetup.scale         = ps.scale;
      dest.pageSetup.fitToPage     = ps.fitToPage;
      dest.pageSetup.fitToWidth    = ps.fitToWidth;
      dest.pageSetup.fitToHeight   = ps.fitToHeight;
      if (ps.margins) dest.pageSetup.margins = deepCloneObj(ps.margins);
    } catch (e) { /* skip if not available */ }

    // Vista foglio (pageBreakPreview → grigio margini + bordo pagina in Excel)
    if (src.views?.length) dest.views = deepCloneObj(src.views);

    // Footer intestazione
    if (src.headerFooter) dest.headerFooter = deepCloneObj(src.headerFooter);

    // NOTE:
    // Con il nuovo template 2023 la clonazione delle regole di formattazione condizionale
    // genera XML invalido in alcuni casi (Excel rimuove i record al ripristino).
    // Evitiamo di copiare le CF e applichiamo styling diretto alla riga recap rischi.

    // Column widths
    src.columns.forEach((col) => {
      if (!col || !col.letter) return;
      try {
        const dc = dest.getColumn(col.letter);
        if (col.width)  dc.width  = col.width;
        if (col.hidden) dc.hidden = col.hidden;
      } catch (e) { /* skip */ }
    });

    // Rows: heights + cell values + styles
    src.eachRow({ includeEmpty: true }, (srcRow, rowNum) => {
      const destRow = dest.getRow(rowNum);
      if (srcRow.height) destRow.height = srcRow.height;
      srcRow.eachCell({ includeEmpty: true }, (srcCell) => {
        try {
          const destCell = destRow.getCell(srcCell.col);
          if (srcCell.value !== null && srcCell.value !== undefined) {
            destCell.value = srcCell.value;
          }
          if (srcCell.style && Object.keys(srcCell.style).length) {
            destCell.style = deepCloneObj(srcCell.style);
          }
        } catch (e) { /* skip individual cell errors */ }
      });
      try { destRow.commit(); } catch (e) { /* skip */ }
    });

    // Merged cells
    const merges = src.model && src.model.merges ? src.model.merges : [];
    merges.forEach((ref) => {
      try { dest.mergeCells(ref); } catch (e) { /* skip duplicates */ }
    });

    return dest;
  }

  // ─── Popola un foglio profilo ─────────────────────────────────────────────────
  /**
   * @param {object} ws           - ExcelJS worksheet
   * @param {object} profilo      - oggetto profilo (id, nome, fasi_lavoro, …)
   * @param {object} livelliByNome - { [nomeRischioNormalizzato]: livello }
   */
  function populateProfiloSheet(ws, profilo, livelliByNome, sheetData) {
    const wrapTop = { vertical: 'top', wrapText: true };
    const centerMid = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // D2: nome profilo (celle D2:U2 già unite nel template)
    ws.getCell('D2').value = String(profilo.nome || '').trim();

    // RIGA RECAP RISCHI (A7:AO7): tutti i rischi del template in mappa 1:1
    const riskCols = buildTemplateRiskColumns(ws);
    riskCols.forEach((r) => {
      const lvl = livelliByNome?.[r.key] || 'Trascurabile';
      const cell = ws.getRow(RECAP_VALUES_ROW).getCell(r.colNum);
      const outVal = livelloToTemplateValue(lvl);
      cell.value = outVal;
      cell.alignment = centerMid;
      styleRecapCell(cell, outVal);
    });

    const fasi = getFasiDettaglioProfilo(profilo, sheetData);
    writePhaseDataRows(ws, fasi, wrapTop);

    // ── Blocco statico subito dopo le righe fase ──
    const R0 = firstStaticRowNum(fasi.length);
    const labelFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };

    const staticRows = [
      {
        label: 'Misure di Prevenzione e Protezione Generali',
        value: profilo.misure_gen_generali || '',
        height: STATIC_ROW_HEIGHTS[0],
      },
      {
        label: 'Dispositivi di Protezione Individuale in dotazione',
        value: profilo.dpi_base || '',
        height: STATIC_ROW_HEIGHTS[1],
      },
      {
        label: 'Dispositivi di Protezione Collettivi',
        value: profilo.dpi_collettivi || '',
        height: STATIC_ROW_HEIGHTS[2],
      },
      {
        label: 'Protocollo di sorveglianza sanitaria',
        value: profilo.protocollo_sor_san === true
          ? 'Si rimanda al protocollo sanitario istituito dal Medico Competente'
          : 'Non previsto',
        height: STATIC_ROW_HEIGHTS[3],
      },
    ];

    staticRows.forEach(({ label, value, height }, i) => {
      const r = R0 + i;
      ws.getRow(r).height = height;

      // Assicura merge A:B per etichetta
      try { ws.unMergeCells('A' + r + ':B' + r); } catch (e) { /* già senza merge */ }
      try { ws.mergeCells('A' + r + ':B' + r); } catch (e) { /* già unita */ }

      // Assicura merge C:S per valore (template 2023)
      try { ws.unMergeCells('C' + r + ':S' + r); } catch (e) { /* già senza merge */ }
      try { ws.mergeCells('C' + r + ':S' + r); } catch (e) { /* già unita */ }

      const cellA = ws.getCell('A' + r);
      cellA.value = label;
      cellA.fill      = labelFill;
      cellA.font      = FONT_STATIC_LABEL;
      cellA.alignment = wrapTop;

      const cellC = ws.getCell('C' + r);
      cellC.value     = value;
      cellC.alignment = wrapTop;
    });
  }

  // ─── buildData ───────────────────────────────────────────────────────────────
  function buildData(azienda, _rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const profili = Array.isArray(w.profili_azienda) ? w.profili_azienda : [];
    const profiliIdsSet = new Set(profili.map((p) => String(p?.id || '')).filter(Boolean));
    const rischiRows = Array.isArray(w.valutazioni_appendice_b1) ? w.valutazioni_appendice_b1 : [];
    const byProfilo  = buildRischiByProfilo(rischiRows, profiliIdsSet);
    const defSel     = defaultSelezioneRischi(byProfilo);
    const livelliByNome = buildLivelliByProfiloName(rischiRows, profiliIdsSet);

    return {
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }),
      RAGIONE_SOCIALE:  azienda?.ragione_sociale || '',
      SEDE_OPERATIVA:   azienda?.sede_operativa  || '',
      LOGO_PREVIEW_URL: w.logo_url               || '',
      _logo_buffer:     w.logo_buffer            || null,
      _logo_path:       w.logo_path              || '',
      _profili_nomi:    Array.isArray(w.profili_nomi) ? w.profili_nomi : [],
      _profili_azienda: profili,
      descrizione_ciclo_produttivo: w.descrizione_ciclo_produttivo != null
        ? String(w.descrizione_ciclo_produttivo)
        : '',
      _appendice_b1_rischi_by_profilo:  byProfilo,
      _appendice_b1_selezione_rischi:   defSel,
      _appendice_b1_livelli_by_nome:    livelliByNome,
      _profilo_fasi_dettaglio:          w.profilo_fasi_dettaglio || {},
    };
  }

  // ─── applyWizard ─────────────────────────────────────────────────────────────
  function applyWizard(base, wizard) {
    const merged = { ...(base || {}) };
    if (wizard && wizard.descrizione_ciclo_produttivo !== undefined) {
      merged.descrizione_ciclo_produttivo = String(wizard.descrizione_ciclo_produttivo || '');
    }
    return merged;
  }

  // ─── validate ────────────────────────────────────────────────────────────────
  function validate(data) {
    const errors = [];
    if (!String(data?.descrizione_ciclo_produttivo || '').trim()) {
      errors.push('Descrizione sintetica del ciclo produttivo (wizard, cella A7)');
    }
    const sorted = profiliSchedaSorted(data?._profili_azienda);
    if (!sorted.length) {
      errors.push('Nessun profilo associato all\'azienda (serve almeno un gruppo omogeneo)');
    }
    if (!data?._logo_buffer?.byteLength) {
      errors.push('Logo azienda mancante (carica PNG/JPEG in Loghi)');
    }
    const logoPathHint = data?._logo_path || '';
    if (data?._logo_buffer && window.GEN_LOGO_DOCX?.isSvgBuffer?.(data._logo_buffer, logoPathHint)) {
      errors.push('Il logo SVG non è supportato in Excel (usa PNG o JPEG)');
    }
    const byR = data?._appendice_b1_rischi_by_profilo || {};
    sorted.forEach((p) => {
      const pid = String(p.id || '');
      const fasi = getFasiDettaglioProfilo(p, data);
      if (!fasi.length) {
        errors.push('Profilo «' + String(p.nome).trim() + '»: nessuna fase di lavoro in anagrafica');
      }
      const lista = byR[pid] || [];
      if (!lista.length) {
        errors.push('Profilo «' + String(p.nome).trim() + '»: nessun rischio in Valutazioni con «Rischio associato» attivo');
        return;
      }
      lista.forEach((row) => {
        if (macroVersoColonnaSicIgiene(row.macro_categoria)) return;
        errors.push(
          'Profilo «' + String(p.nome).trim() + '», rischio «' + (row.nome_rischio || '?') +
          '»: macro «' + (row.macro_categoria || '—') + '» non mappata su Sicurezza/Igiene'
        );
      });
    });
    return errors;
  }

  // ─── generateXlsx ────────────────────────────────────────────────────────────
  function getExcelJS() {
    return typeof ExcelJS !== 'undefined' ? ExcelJS : null;
  }

  async function generateXlsx(templateArrayBuffer, data) {
    const ExcelJS = getExcelJS();
    if (!ExcelJS) throw new Error('ExcelJS non caricato');
    if (!templateArrayBuffer?.byteLength) throw new Error('Template Excel vuoto o non scaricato');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(templateArrayBuffer);

    // ── Scheda Azienda ──
    const wsScheda = wb.getWorksheet(SHEET_SCHEDA);
    if (!wsScheda) throw new Error('Foglio "' + SHEET_SCHEDA + '" non trovato nel template');

    const dataStr = data.DATA_EMISSIONE || '';
    wsScheda.getCell('D2').value = ' Emissione del ' + dataStr;
    wsScheda.getCell('E2').value = null;

    const cellA7 = wsScheda.getCell('A7');
    cellA7.value = PREFIX_DESCRIZIONE_CICLO + String(data.descrizione_ciclo_produttivo || '').trim();
    const fontA7 = cellA7.font || {};
    cellA7.font = { name: fontA7.name || 'Calibri', size: fontA7.size || 11, bold: false };

    const profiliSrc = resolveProfiliAzienda(data);
    wsScheda.getCell('A9').value = schedaCellaA9Testo(profiliSrc);
    wsScheda.getCell('A9').alignment = ALIGN_SCHEDA_ELENCO;
    ensureSchedaCellVisible(wsScheda.getCell('A9'));
    wsScheda.getCell('C9').value = schedaCellaC9Testo(profiliSrc);
    wsScheda.getCell('C9').alignment = ALIGN_SCHEDA_ELENCO;
    ensureSchedaCellVisible(wsScheda.getCell('C9'));

    const byProfilo  = data._appendice_b1_rischi_by_profilo || {};
    const selezione  = data._appendice_b1_selezione_rischi  || {};
    const profiliTab = profiliSrc;
    const startR     = findSchedaTabellaDataStartRow(wsScheda);

    // ── Fogli profilo (uno per ogni gruppo omogeneo) ──
    const livelliByNome = data._appendice_b1_livelli_by_nome || {};

    if (profiliTab.length > 0) {
      const wsTmpl = wb.getWorksheet(TEMPLATE_SHEET);
      if (!wsTmpl) throw new Error('Foglio template "' + TEMPLATE_SHEET + '" non trovato');

      const sheetNames = new Set();
      for (const profilo of profiliTab) {
        let sheetName = sanitizeSheetName(profilo.nome);
        let attempt = sheetName;
        let counter = 2;
        while (sheetNames.has(attempt.toLowerCase())) {
          attempt = sanitizeSheetName(profilo.nome).substring(0, 28) + ' ' + counter++;
        }
        sheetName = attempt;
        sheetNames.add(sheetName.toLowerCase());

        const wsP = cloneWorksheet(wb, TEMPLATE_SHEET, sheetName);
        populateProfiloSheet(
          wsP,
          profilo,
          livelliByNome[profilo.id] || {},
          data
        );
      }

      try { wb.removeWorksheet(wsTmpl.id); } catch (e) { /* se fallisce lascialo */ }
    }

    // Righe Mansione/Tipologia/Sicurezza/Igiene: dopo i fogli profilo, con font leggibile
    writeSchedaProfiliIntervallo(wsScheda, startR, profiliTab, byProfilo, selezione);

    const buf = data._logo_buffer;
    if (buf && buf.byteLength) {
      const ext = imageExtensionFromBuffer(buf, data._logo_path);
      let imageId;
      try {
        imageId = wb.addImage({
          buffer: new Uint8Array(buf),
          extension: ext === 'jpeg' ? 'jpeg' : 'png',
        });
      } catch (e) {
        throw new Error('Inserimento logo fallito: ' + (e.message || String(e)));
      }
      wsScheda.addImage(imageId, {
        tl: { col: 3, row: 3 },
        br: { col: 4, row: 4 },
        editAs: 'twoCell',
      });
    }

    const raw = await wb.xlsx.writeBuffer();
    // ExcelJS in browser può restituire un Buffer-like anziché un ArrayBuffer puro;
    // lo convertiamo per garantire il trasferimento via postMessage([buffer]).
    return raw instanceof ArrayBuffer ? raw : new Uint8Array(raw).buffer;
  }

  const TABLE_PROFILI_DATA_START_ROW = 13;
  const TABLE_PROFILI_CLEAR_ROW_COUNT = 40;
  /** Altezze righe dati nel modello (es. righe 15–16 template: 121 / 169.5 pt). */
  const SCHEDA_DATA_ROW_HEIGHTS = [121, 169.5, 121, 169.5];
  const SCHEDA_MIN_DATA_ROW_HEIGHT = 72;
  const SCHEDA_MAX_DATA_ROW_HEIGHT = 409;
  const ALIGN_SCHEDA_ELENCO = { vertical: 'middle', horizontal: 'left', wrapText: true };
  const ALIGN_SCHEDA_MANSIONE = { vertical: 'top', horizontal: 'left', wrapText: true };
  const ALIGN_SCHEDA_WRAP_COLS = { vertical: 'top', horizontal: 'left', wrapText: true };
  const FONT_STATIC_LABEL = { name: 'Calibri', size: 26, bold: true };

  function resolveProfiliAzienda(data) {
    const raw = data?._profili_azienda ?? data?.profili_azienda ?? [];
    return profiliSchedaSorted(Array.isArray(raw) ? raw : []);
  }

  /** Trova la prima riga dati sotto l'intestazione «Mansione» (di solito 13). */
  function findSchedaTabellaDataStartRow(ws) {
    for (let r = 8; r <= 25; r++) {
      for (const col of ['A', 'B', 'C', 'D']) {
        const label = String(ws.getCell(col + r).value || '').trim().toLowerCase();
        if (label === 'mansione' || label.startsWith('mansione')) return r + 1;
      }
    }
    return TABLE_PROFILI_DATA_START_ROW;
  }

  /** Il template può avere fonte bianca/chiara sulle righe dati: forza testo nero leggibile. */
  function ensureSchedaCellVisible(cell) {
    if (!cell) return;
    const f = cell.font || {};
    cell.font = {
      name: f.name || 'Calibri',
      size: f.size || 11,
      bold: f.bold || false,
      italic: f.italic || false,
      underline: f.underline || false,
      color: { argb: 'FF000000' },
    };
  }

  function snapshotSchedaRowHeights(ws, startR, count) {
    const snap = {};
    for (let i = 0; i < count; i++) {
      const r = startR + i;
      const h = ws.getRow(r).height;
      if (h != null && h > 0) snap[r] = h;
    }
    return snap;
  }

  /** Stima altezza riga in base al testo a capo su B/C/D (larghezza colonna dal template). */
  function estimateSchedaDataRowHeight(ws, tipologia, sicurezza, igiene) {
    const texts = { B: tipologia, C: sicurezza, D: igiene };
    let maxH = SCHEDA_MIN_DATA_ROW_HEIGHT;
    Object.keys(texts).forEach((col) => {
      const text = String(texts[col] || '');
      if (!text) return;
      const w = ws.getColumn(col).width || 20;
      const charsPerLine = Math.max(10, Math.floor(w * 1.05));
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      const h = lines * 15 + 8;
      if (h > maxH) maxH = h;
    });
    return Math.min(SCHEDA_MAX_DATA_ROW_HEIGHT, maxH);
  }

  function resolveSchedaDataRowHeight(snapHeights, rowNum, profiloIndex, estimated) {
    const snap = snapHeights[rowNum];
    const fromTemplate = (snap != null && snap > 30) ? snap : SCHEDA_DATA_ROW_HEIGHTS[profiloIndex % SCHEDA_DATA_ROW_HEIGHTS.length];
    return Math.min(
      SCHEDA_MAX_DATA_ROW_HEIGHT,
      Math.max(SCHEDA_MIN_DATA_ROW_HEIGHT, fromTemplate, estimated)
    );
  }

  function colLettersToNum(letters) {
    let n = 0;
    const s = String(letters || '').toUpperCase().replace(/\$/g, '');
    for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n;
  }

  function colNumToLetters(n) {
    let s = '';
    let x = n;
    while (x > 0) {
      const r = (x - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  }

  /** Tutti i merge (intervalli classici A:D) che toccano le righe dati profilo. */
  function collectMergeRefsInSchedaRows(ws, startRow, endRow) {
    const refs = new Set();
    const norm = (ref) => String(ref || '').replace(/\$/g, '').trim();
    (ws.model?.merges || []).forEach((ref) => {
      const s = norm(ref);
      if (s) refs.add(s);
    });
    Object.keys(ws._merges || {}).forEach((addr) => {
      const merge = ws._merges[addr];
      const m = merge?.model;
      if (m && m.top != null) {
        refs.add(colNumToLetters(m.left) + m.top + ':' + colNumToLetters(m.right) + m.bottom);
      } else {
        const s = norm(addr);
        if (s) refs.add(s);
      }
    });
    const out = [];
    refs.forEach((ref) => {
      const parsed = parseMergeRef(ref);
      if (!parsed) return;
      if (parsed.r2 < startRow || parsed.r1 > endRow) return;
      if (parsed.c2 < 1 || parsed.c1 > 4) return;
      out.push(ref);
    });
    return out;
  }

  function parseMergeRef(ref) {
    const m = String(ref).replace(/\$/g, '').match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!m) return null;
    return {
      c1: colLettersToNum(m[1]),
      r1: parseInt(m[2], 10),
      c2: colLettersToNum(m[3]),
      r2: parseInt(m[4], 10),
    };
  }

  /**
   * Rimuove i merge classici (es. A13:D13) sull'intervallo righe dati.
   * ExcelJS non popola B/C/D se la riga è ancora unita in un solo blocco.
   */
  function unmergeSchedaIntervalloDati(ws, startRow, rowCount) {
    const endRow = startRow + rowCount - 1;
    const unmerged = [];
    for (let pass = 0; pass < 20; pass++) {
      const batch = collectMergeRefsInSchedaRows(ws, startRow, endRow);
      if (!batch.length) break;
      batch.forEach((ref) => {
        try {
          ws.unMergeCells(ref);
          unmerged.push(ref);
        } catch (e) { /* skip */ }
      });
    }
    return {
      unmerged,
      remaining: collectMergeRefsInSchedaRows(ws, startRow, endRow),
    };
  }

  /** Scrive Mansione/Tipologia/Sicurezza/Igiene (celle classiche A:D). */
  function writeSchedaProfiliIntervallo(ws, startR, profiliTab, byProfilo, selezione) {
    const cols = ['A', 'B', 'C', 'D'];
    const snapHeights = snapshotSchedaRowHeights(ws, startR, TABLE_PROFILI_CLEAR_ROW_COUNT);
    unmergeSchedaIntervalloDati(ws, startR, TABLE_PROFILI_CLEAR_ROW_COUNT);
    for (let i = 0; i < TABLE_PROFILI_CLEAR_ROW_COUNT; i++) {
      const r = startR + i;
      cols.forEach((c) => { ws.getCell(c + r).value = ''; });
    }
    profiliTab.forEach((p, idx) => {
      const r = startR + idx;
      const pid = String(p.id || '');
      const mansione = String(p.nome || '').trim();
      const tipologia = fasiLavoroVirgola(p.fasi_lavoro);
      const sicurezza = nomiRischiSelezione(byProfilo, selezione, pid, 'sicurezza');
      const igiene = nomiRischiSelezione(byProfilo, selezione, pid, 'igiene');

      const cellA = ws.getCell('A' + r);
      cellA.value = mansione;
      cellA.alignment = ALIGN_SCHEDA_MANSIONE;
      ensureSchedaCellVisible(cellA);

      [['B', tipologia], ['C', sicurezza], ['D', igiene]].forEach(([col, val]) => {
        const cell = ws.getCell(col + r);
        cell.value = val;
        cell.alignment = ALIGN_SCHEDA_WRAP_COLS;
        ensureSchedaCellVisible(cell);
      });

      const rowObj = ws.getRow(r);
      rowObj.hidden = false;
      rowObj.height = resolveSchedaDataRowHeight(
        snapHeights,
        r,
        idx,
        estimateSchedaDataRowHeight(ws, tipologia, sicurezza, igiene)
      );
    });
  }

  /** Log diagnostico payload wizard → adapter (solo in console, non in UI). */
  function debugAppendiceB1Payload(label, data) {
    const profili = resolveProfiliAzienda(data);
    const tabella = profili.map((p) => {
      const pid = String(p.id || '');
      const sel = data?._appendice_b1_selezione_rischi?.[pid] || [];
      const rischi = data?._appendice_b1_rischi_by_profilo?.[pid] || [];
      return {
        id: pid,
        nome: String(p.nome || '').trim(),
        rischi_catalogo: rischi.length,
        rischi_selezionati: sel.length,
      };
    });
    console.group('[APPENDICE_B1] ' + label);
    console.log('Payload keys:', data ? Object.keys(data).sort() : []);
    console.log('_profili_azienda:', Array.isArray(data?._profili_azienda)
      ? data._profili_azienda.length + ' elementi'
      : data?._profili_azienda);
    console.log('profili risolti (tabella scheda):', tabella.length, tabella);
    console.log('descrizione_ciclo_produttivo:', String(data?.descrizione_ciclo_produttivo || '').slice(0, 80));
    console.log('logo buffer:', data?._logo_buffer?.byteLength
      ? data._logo_buffer.byteLength + ' bytes'
      : 'assente');
    console.log('selezione_rischi profili:', Object.keys(data?._appendice_b1_selezione_rischi || {}).length);
    console.groupEnd();
    return { profiliCount: tabella.length, tabella };
  }

  // ─── Export ──────────────────────────────────────────────────────────────────
  window.GEN_ADAPTERS = window.GEN_ADAPTERS || {};
  window.GEN_ADAPTERS[CODICE] = {
    codice:  CODICE,
    nome:    NOME,
    outputExtension: 'xlsx',
    outputMimeType:  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buildData,
    applyWizard,
    validate,
    generateXlsx,
    profiliSchedaSorted,
    schedaCellaA9Testo,
    schedaCellaC9Testo,
    macroVersoColonnaSicIgiene,
    buildRischiByProfilo,
    debugAppendiceB1Payload,
  };
})();
