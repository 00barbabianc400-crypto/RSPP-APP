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

  // Template layout
  const TMPL_DATA_START   = 6;   // prima riga dati (fasi)
  const TMPL_DATA_COUNT   = 5;   // righe dati nel template (6-10)
  const TMPL_GAP_ROWS     = 1;   // riga vuota tra dati e blocco statico
  const TMPL_DATA_COL_END = 21;  // colonna U
  const DATA_ROW_HEIGHT   = 127.5;
  const STATIC_ROW_HEIGHTS = [102, 75, 112.5, 68.25];

  // ─── Mappatura colonna Excel (lettera) → id_rischio (catalogo seed) ──────────
  // Nuove lettere colonne dopo rimozione H (Esplosione) e I (Agenti fisici) dal vecchio template.
  // La media viene calcolata su livello_rischio (Trascurabile=1, Basso=2, Medio=3, Alto=4).
  const COLONNE_RISCHI = [
    { col: 'C', ids: ['P03','P04','P05','P06','P07','P08','P09','E04','S10','S11'] },
    { col: 'D', ids: ['S02','S03'] },
    { col: 'E', ids: ['S03'] },
    { col: 'F', ids: ['C01','C02','C03','C04','C05','S06'] },
    { col: 'G', ids: ['S01','S05'] },
    { col: 'H', ids: ['S09'] },
    { col: 'I', ids: ['S07','S04','S06','S11'] },
    { col: 'J', ids: ['F01'] },
    { col: 'K', ids: ['F02','F03'] },
    { col: 'L', ids: ['F04'] },
    { col: 'M', ids: ['F05','F06'] },
    { col: 'N', ids: ['C01','C02','C03','C04','C05','S06'] },
    { col: 'O', ids: ['B01','B02','B03','S08'] },
    { col: 'P', ids: ['F07','E03'] },
    { col: 'Q', ids: ['F08','E03'] },
    { col: 'R', ids: ['E01','E02'] },
    { col: 'S', ids: ['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10'] },
  ];

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

  // ─── Livelli per profilo/fase ────────────────────────────────────────────────
  /**
   * Costruisce la mappa livelli usata dal foglio profilo (colonne C–S).
   *
   * Priorità (dal più specifico al meno):
   *   1. valutazione con profilo_fase_id = id della fase (se disponibile)
   *   2. valutazione con profilo_fase_id = null (livello profilo, fallback)
   *
   * @returns {
   *   byProfilo: { [profiloId]: { [id_rischio_code]: livello_string } },
   *   byFase:    { [faseId]:    { [id_rischio_code]: livello_string } }
   * }
   */
  function buildLivelliMaps(valutazioni, profiliIdsSet) {
    const byProfilo = {};
    const byFase = {};
    profiliIdsSet.forEach((id) => { byProfilo[id] = {}; });

    (valutazioni || []).forEach((row) => {
      if (row.rischio_associato === false) return;
      const pid  = String(row.profilo_id || '');
      const code = row.rischio?.id_rischio ? String(row.rischio.id_rischio) : null;
      if (!pid || !code) return;
      if (!profiliIdsSet.has(pid)) return;

      const lvl = row.livello_rischio || 'Trascurabile';

      if (row.profilo_fase_id) {
        const fid = String(row.profilo_fase_id);
        if (!byFase[fid]) byFase[fid] = {};
        if (!byFase[fid][code]) byFase[fid][code] = lvl;
      } else {
        if (!byProfilo[pid]) byProfilo[pid] = {};
        if (!byProfilo[pid][code]) byProfilo[pid][code] = lvl;
      }
    });

    return { byProfilo, byFase };
  }

  /**
   * Ritorna la mappa livelli per una singola fase.
   * Se la fase non ha valutazioni proprie, cade back sul livello profilo.
   */
  function livelliPerFase(faseId, profiloId, mapsObj) {
    const faseLvl = faseId ? (mapsObj.byFase[faseId] || {}) : {};
    const profLvl = mapsObj.byProfilo[String(profiloId)] || {};
    // Merge: la valutazione per fase sovrascrive quella di profilo
    return Object.assign({}, profLvl, faseLvl);
  }

  /** @deprecated usa buildLivelliMaps */
  function buildLivelliByProfilo(valutazioni, profiliIdsSet) {
    return buildLivelliMaps(valutazioni, profiliIdsSet).byProfilo;
  }

  /** Calcola la media aritmetica dei livelli per una colonna (usa la mappa livelli del profilo). */
  function computeMediaColonna(livelliMap, idRischiCodes) {
    const nums = idRischiCodes
      .map((code) => {
        const l = livelliMap[code];
        return l != null ? (LIVELLO_TO_NUM[l] ?? null) : null;
      })
      .filter((n) => n !== null);
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  // ─── ColorScale interpolation ────────────────────────────────────────────────
  /** Restituisce argb hex (FF......) per la colorScale 1=verde, 2=giallo, 4=rosso. */
  function colorForMedia(media) {
    if (media === null || media === undefined) return null;
    const v = Number(media);
    const GREEN  = [0x92, 0xD0, 0x50]; // #92D050
    const YELLOW = [0xFF, 0xFF, 0x00]; // #FFFF00
    const RED    = [0xFF, 0x00, 0x00]; // #FF0000
    const lerp = (a, b, t) => [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
    let rgb;
    if      (v <= 1) rgb = GREEN;
    else if (v < 2)  rgb = lerp(GREEN, YELLOW, v - 1);
    else if (v <= 2) rgb = YELLOW;
    else if (v < 4)  rgb = lerp(YELLOW, RED, (v - 2) / 2);
    else             rgb = RED;
    const h = (n) => n.toString(16).padStart(2, '0').toUpperCase();
    return 'FF' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
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
  function updateMatrixColorScaleRange(ws, fasiCount) {
    if (!ws.conditionalFormattings?.length || fasiCount < 1) return;
    const endRow = TMPL_DATA_START + fasiCount - 1;
    const sqref = 'C' + TMPL_DATA_START + ':S' + endRow;
    ws.conditionalFormattings.forEach((cf) => { cf.ref = sqref; });
  }

  /**
   * Adatta il numero di righe fasi: inserimento con stile copiato da riga 6,
   * rimozione con spliceRows (solo righe in eccesso).
   */
  function adjustFasiRowCount(ws, N, tmplN) {
    const modelSnap = snapshotRowStyles(ws, TMPL_DATA_START, TMPL_DATA_COL_END);
    if (N > tmplN) {
      const extra = N - tmplN;
      const insertAt = TMPL_DATA_START + tmplN;
      ws.spliceRows(insertAt, 0, ...Array(extra).fill([]));
      for (let i = 0; i < extra; i++) {
        const r = insertAt + i;
        applyRowStyleSnapshot(ws, r, modelSnap, TMPL_DATA_COL_END);
        try { ws.mergeCells('A' + r + ':B' + r); } catch (e) { /* skip */ }
      }
    } else if (N < tmplN) {
      ws.spliceRows(TMPL_DATA_START + N, tmplN - N);
    }
    updateMatrixColorScaleRange(ws, N);
  }

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

    // ColorScale matrice rischi (C6:S…)
    if (src.conditionalFormattings?.length) {
      dest.conditionalFormattings = deepCloneObj(src.conditionalFormattings);
    }

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
   * @param {object} livelliMap   - { [id_rischio_code]: livello_string } livello profilo (fallback)
   * @param {Array}  misurePerFase - testi wizard T per indice fase
   * @param {Array}  dpiPerFase    - testi wizard U per indice fase
   * @param {object} mapsObj      - { byProfilo, byFase } da buildLivelliMaps (opzionale)
   * @param {Array}  fasiEntita   - [{id, nome, ordine}] da profilo_fasi (opzionale)
   */
  function populateProfiloSheet(ws, profilo, livelliMap, misurePerFase, dpiPerFase, mapsObj, fasiEntita) {
    const wrapTop = { vertical: 'top', wrapText: true };
    const centerMid = { horizontal: 'center', vertical: 'middle', wrapText: false };

    // D2: nome profilo (celle D2:U2 già unite nel template)
    ws.getCell('D2').value = String(profilo.nome || '').trim();

    // Usa fasiEntita (da profilo_fasi) se disponibili, altrimenti cade back sull'array di stringhe
    const hasFasiEntita = Array.isArray(fasiEntita) && fasiEntita.length > 0;
    const fasi = hasFasiEntita
      ? fasiEntita.map((f) => f.nome)
      : normalizzaFasiLavoro(profilo.fasi_lavoro);
    const N = fasi.length;
    const tmplN = TMPL_DATA_COUNT; // 5

    // ── Adattamento righe se N ≠ tmplN (stile da riga-modello 6) ──
    adjustFasiRowCount(ws, N, tmplN);

    // ── Scrivi righe fasi ──
    fasi.forEach((fase, idx) => {
      const r = TMPL_DATA_START + idx;
      const row = ws.getRow(r);
      row.height = DATA_ROW_HEIGHT;

      // Determina la mappa livelli per questa fase specifica
      // Se mapsObj disponibile e la fase ha un id, usa livelli per fase con fallback profilo
      let livelliPerQestaFase = livelliMap;
      if (mapsObj) {
        const faseId = hasFasiEntita ? (fasiEntita[idx]?.id || null) : null;
        livelliPerQestaFase = livelliPerFase(faseId, profilo.id, mapsObj);
      }

      // A: descrizione fase
      ws.getCell('A' + r).value = fase;
      ws.getCell('A' + r).alignment = wrapTop;

      // C–S: media livelli per questa fase
      COLONNE_RISCHI.forEach(({ col, ids }) => {
        const media = computeMediaColonna(livelliPerQestaFase, ids);
        const rounded = media !== null ? Math.round(media) : null;
        const cell = ws.getCell(col + r);
        cell.value = rounded;
        if (rounded !== null) {
          const argb = colorForMedia(media);
          if (argb) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
          }
          cell.alignment = centerMid;
        }
      });

      // T: Misure specifiche per fase (wizard)
      const misure = misurePerFase && misurePerFase[idx] != null ? String(misurePerFase[idx]) : '';
      ws.getCell('T' + r).value = misure;
      ws.getCell('T' + r).alignment = wrapTop;

      // U: DPI specifici per fase (wizard)
      const dpi = dpiPerFase && dpiPerFase[idx] != null ? String(dpiPerFase[idx]) : '';
      ws.getCell('U' + r).value = dpi;
      ws.getCell('U' + r).alignment = wrapTop;
    });

    // ── Blocco statico (Misure gen., DPI base, DPC, Protocollo) ──
    // Posizione dinamica: TMPL_DATA_START + N + TMPL_GAP_ROWS
    const R0 = TMPL_DATA_START + N + TMPL_GAP_ROWS;
    const labelFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };

    const staticRows = [
      {
        label: 'Misure di Prevenzione e Protezione Generali',
        value: profilo.misure_gen_generali || '',
        height: STATIC_ROW_HEIGHTS[0],
      },
      {
        label: 'Dispositivi di Protezione Individuale in dotazione Base',
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

      // Assicura merge C:U per valore
      try { ws.unMergeCells('C' + r + ':U' + r); } catch (e) { /* già senza merge */ }
      try { ws.mergeCells('C' + r + ':U' + r); } catch (e) { /* già unita */ }

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
    const fasiRows   = Array.isArray(w.profilo_fasi_appendice_b1) ? w.profilo_fasi_appendice_b1 : [];

    const byProfilo  = buildRischiByProfilo(rischiRows, profiliIdsSet);
    const defSel     = defaultSelezioneRischi(byProfilo);
    const livelliMaps = buildLivelliMaps(rischiRows, profiliIdsSet);

    // Mappa fasi per profilo: { [profiloId]: [{id, nome, ordine}, ...] }
    const fasiByProfilo = {};
    fasiRows.forEach((f) => {
      const pid = String(f.profilo_id || '');
      if (!pid) return;
      if (!fasiByProfilo[pid]) fasiByProfilo[pid] = [];
      fasiByProfilo[pid].push({ id: f.id, nome: f.nome, ordine: f.ordine ?? 0 });
    });
    Object.keys(fasiByProfilo).forEach((pid) => {
      fasiByProfilo[pid].sort((a, b) => a.ordine - b.ordine);
    });

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
      _appendice_b1_livelli_by_profilo: livelliMaps.byProfilo,
      _appendice_b1_livelli_by_fase:    livelliMaps.byFase,
      _appendice_b1_fasi_by_profilo:    fasiByProfilo,
      _appendice_b1_misure_per_fase:    w.appendice_b1_misure_per_fase  || {},
      _appendice_b1_dpi_per_fase:       w.appendice_b1_dpi_per_fase     || {},
    };
  }

  // ─── applyWizard ─────────────────────────────────────────────────────────────
  function applyWizard(base, wizard) {
    const merged = { ...(base || {}) };
    if (wizard && wizard.descrizione_ciclo_produttivo !== undefined) {
      merged.descrizione_ciclo_produttivo = String(wizard.descrizione_ciclo_produttivo || '');
    }
    if (wizard?.appendice_b1_selezione_rischi != null) {
      merged._appendice_b1_selezione_rischi = deepCloneObj(wizard.appendice_b1_selezione_rischi);
    }
    if (wizard?.appendice_b1_misure_per_fase != null) {
      merged._appendice_b1_misure_per_fase = deepCloneObj(wizard.appendice_b1_misure_per_fase);
    }
    if (wizard?.appendice_b1_dpi_per_fase != null) {
      merged._appendice_b1_dpi_per_fase = deepCloneObj(wizard.appendice_b1_dpi_per_fase);
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
    sorted.forEach((p) => {
      if (!normalizzaFasiLavoro(p.fasi_lavoro).length) {
        errors.push('Profilo «' + String(p.nome).trim() + '»: compilare «Fasi di lavoro» nell\'anagrafica');
      }
    });
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
    const livelliBy    = data._appendice_b1_livelli_by_profilo || {};
    const livelliByFase = data._appendice_b1_livelli_by_fase   || {};
    const fasiByProfilo = data._appendice_b1_fasi_by_profilo   || {};
    const misureByProf = data._appendice_b1_misure_per_fase    || {};
    const dpiByProf    = data._appendice_b1_dpi_per_fase       || {};

    // mapsObj ricostruito per livelliPerFase()
    const mapsObj = { byProfilo: livelliBy, byFase: livelliByFase };

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
          livelliBy[profilo.id] || {},
          misureByProf[profilo.id] || [],
          dpiByProf[profilo.id]   || [],
          mapsObj,
          fasiByProfilo[profilo.id] || null
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
        fasi: normalizzaFasiLavoro(p.fasi_lavoro),
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
