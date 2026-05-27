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

  // ─── Livelli per profilo (fogli profilo) ─────────────────────────────────────
  /** @returns { [profiloId]: { [id_rischio_code]: livello_string } } */
  function buildLivelliByProfilo(valutazioni, profiliIdsSet) {
    const by = {};
    profiliIdsSet.forEach((id) => { by[id] = {}; });
    (valutazioni || []).forEach((row) => {
      if (row.rischio_associato === false) return;
      const pid = String(row.profilo_id || '');
      if (!pid || !profiliIdsSet.has(pid)) return;
      const r = row.rischio;
      const code = r?.id_rischio ? String(r.id_rischio) : null;
      if (!code) return;
      if (!by[pid]) by[pid] = {};
      if (!by[pid][code]) {
        by[pid][code] = row.livello_rischio || 'Trascurabile';
      }
    });
    return by;
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
  /**
   * Clona il foglio srcName in un nuovo foglio destName.
   * Copia: dimensioni colonne/righe, valori+stili celle, merge, page setup.
   */
  function cloneWorksheet(wb, srcName, destName) {
    const src = wb.getWorksheet(srcName);
    if (!src) throw new Error('Foglio template "' + srcName + '" non trovato nel template Excel');

    const dest = wb.addWorksheet(destName);

    // Page setup
    try {
      dest.pageSetup.orientation = src.pageSetup.orientation;
      dest.pageSetup.paperSize   = src.pageSetup.paperSize;
    } catch (e) { /* skip if not available */ }

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
  function populateProfiloSheet(ws, profilo, livelliMap, misurePerFase, dpiPerFase) {
    const wrapTop = { vertical: 'top', wrapText: true };
    const centerMid = { horizontal: 'center', vertical: 'middle', wrapText: false };

    // D2: nome profilo (celle D2:U2 già unite nel template)
    ws.getCell('D2').value = String(profilo.nome || '').trim();

    const fasi = normalizzaFasiLavoro(profilo.fasi_lavoro);
    const N = fasi.length;
    const tmplN = TMPL_DATA_COUNT; // 5

    // ── Adattamento righe se N ≠ tmplN ──
    if (N > tmplN) {
      // Inserisci N-tmplN righe dopo l'ultima riga dati del template (prima del gap)
      const extra = N - tmplN;
      ws.spliceRows(TMPL_DATA_START + tmplN, 0, ...Array(extra).fill(null).map(() => []));
    } else if (N < tmplN) {
      // Rimuovi le righe dati in eccesso
      ws.spliceRows(TMPL_DATA_START + N, tmplN - N);
    }

    // ── Scrivi righe fasi ──
    fasi.forEach((fase, idx) => {
      const r = TMPL_DATA_START + idx;
      const row = ws.getRow(r);
      row.height = DATA_ROW_HEIGHT;

      // A: descrizione fase
      ws.getCell('A' + r).value = fase;
      ws.getCell('A' + r).alignment = wrapTop;

      // C–S: valori numerici (stessa media per ogni riga, variante per colonna)
      COLONNE_RISCHI.forEach(({ col, ids }) => {
        const media = computeMediaColonna(livelliMap, ids);
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
    const labelFont = { bold: true, size: 9 };

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
      cellA.font      = labelFont;
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
    const livelliBy  = buildLivelliByProfilo(rischiRows, profiliIdsSet);

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
      _appendice_b1_rischi_by_profilo: byProfilo,
      _appendice_b1_selezione_rischi:  defSel,
      _appendice_b1_livelli_by_profilo: livelliBy,
      _appendice_b1_misure_per_fase:   w.appendice_b1_misure_per_fase  || {},
      _appendice_b1_dpi_per_fase:      w.appendice_b1_dpi_per_fase     || {},
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

    wsScheda.getCell('A7').value =
      PREFIX_DESCRIZIONE_CICLO + String(data.descrizione_ciclo_produttivo || '').trim();

    const wrapTop = { vertical: 'top', wrapText: true };
    wsScheda.getCell('A9').value = schedaCellaA9Testo(data._profili_azienda);
    wsScheda.getCell('A9').alignment = wrapTop;
    wsScheda.getCell('C9').value = schedaCellaC9Testo(data._profili_azienda);
    wsScheda.getCell('C9').alignment = wrapTop;

    // Tabella profili rischio (righe 13+)
    const byProfilo = data._appendice_b1_rischi_by_profilo || {};
    const selezione = data._appendice_b1_selezione_rischi  || {};
    const profiliTab = profiliSchedaSorted(data._profili_azienda);
    const startR = TABLE_PROFILI_DATA_START_ROW;
    for (let i = 0; i < TABLE_PROFILI_CLEAR_ROW_COUNT; i++) {
      ['A','B','C','D'].forEach((col) => {
        wsScheda.getCell(col + (startR + i)).value = null;
      });
    }
    profiliTab.forEach((p, idx) => {
      const row = startR + idx;
      wsScheda.getCell('A' + row).value = String(p.nome || '').trim();
      wsScheda.getCell('B' + row).value = fasiLavoroVirgola(p.fasi_lavoro);
      wsScheda.getCell('C' + row).value = nomiRischiSelezione(byProfilo, selezione, String(p.id), 'sicurezza');
      wsScheda.getCell('D' + row).value = nomiRischiSelezione(byProfilo, selezione, String(p.id), 'igiene');
      ['A','B','C','D'].forEach((col) => {
        wsScheda.getCell(col + row).alignment = wrapTop;
      });
    });

    // Logo
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
        ext: { width: 220, height: 90 },
      });
    }

    // ── Fogli profilo (uno per ogni gruppo omogeneo) ──
    const livelliBy    = data._appendice_b1_livelli_by_profilo || {};
    const misureByProf = data._appendice_b1_misure_per_fase    || {};
    const dpiByProf    = data._appendice_b1_dpi_per_fase       || {};

    if (profiliTab.length > 0) {
      // Verifica che il foglio template esista
      const wsTmpl = wb.getWorksheet(TEMPLATE_SHEET);
      if (!wsTmpl) throw new Error('Foglio template "' + TEMPLATE_SHEET + '" non trovato');

      // Crea un foglio per ogni profilo clonando il template
      const sheetNames = new Set();
      for (const profilo of profiliTab) {
        let sheetName = sanitizeSheetName(profilo.nome);
        // Evita nomi duplicati
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
          dpiByProf[profilo.id]   || []
        );
      }

      // Rimuovi il foglio template (ora sostituito dai fogli specifici)
      try { wb.removeWorksheet(wsTmpl.id); } catch (e) { /* se fallisce lascialo */ }
    }

    return wb.xlsx.writeBuffer({ type: 'arraybuffer', compression: true });
  }

  // Costanti tabella Scheda Azienda (righe 13+)
  const TABLE_PROFILI_DATA_START_ROW = 13;
  const TABLE_PROFILI_CLEAR_ROW_COUNT = 40;

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
  };
})();
