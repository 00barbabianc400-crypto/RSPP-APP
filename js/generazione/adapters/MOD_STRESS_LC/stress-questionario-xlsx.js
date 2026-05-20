/**
 * Parser questionario SLC (Excel) — fogli RISULTATI e INTEGRATIVA.
 * Struttura fissa: nome file libero, fogli e celle come da metodologia Inail 2026.
 */
(function () {
  'use strict';

  const LIVELLO_COLORI = {
    BASSO: '00B050',
    MEDIO: 'FFC000',
    ALTO: 'C00000',
  };

  const RISULTATI_BANDS = [
    { key: 'BASSO', min: -4, max: 58, row: 18 },
    { key: 'MEDIO', min: 59, max: 90, row: 20 },
    { key: 'ALTO', min: 91, max: 216, row: 22 },
  ];

  const INTEGRATIVA_BANDS = [
    { key: 'BASSO', min: 0, max: 28, row: 27 },
    { key: 'MEDIO', min: 28, max: 85, row: 29 },
    { key: 'ALTO', min: 86, max: 100, row: 31 },
  ];

  function cellVal(sheet, addr) {
    if (!sheet || !addr) return '';
    const c = sheet[addr];
    if (!c) return '';
    if (c.w != null && String(c.w).trim() !== '') return String(c.w).trim();
    if (c.v == null) return '';
    return String(c.v).trim();
  }

  function isMarkerX(val) {
    const s = String(val ?? '').trim().toUpperCase();
    return s === 'X' || s === '✓' || s === '1' || s === 'SI' || s === 'SÌ' || s === 'S';
  }

  function livelloKeyFromLabel(label) {
    const u = String(label ?? '').toUpperCase();
    if (u.includes('ALTO')) return 'ALTO';
    if (u.includes('MEDIO')) return 'MEDIO';
    if (u.includes('BASSO')) return 'BASSO';
    return '';
  }

  function parseNumber(val) {
    if (val == null || val === '') return NaN;
    const n = parseFloat(String(val).replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  function findSheet(wb, namePart) {
    const want = String(namePart).toUpperCase();
    const names = wb.SheetNames || [];
    return names.find((n) => String(n).toUpperCase().includes(want)) || null;
  }

  function readRigaEsito(sheet, row, markerCol, labelCol, textCol) {
    const label = cellVal(sheet, labelCol + row);
    const testo = cellVal(sheet, textCol + row);
    const key = livelloKeyFromLabel(label);
    return {
      key,
      livello: label || (key ? 'RISCHIO ' + key : ''),
      testo,
      row,
      marker: cellVal(sheet, markerCol + row),
    };
  }

  function pickByMarker(sheet, rows, markerCol, labelCol, textCol) {
    for (const row of rows) {
      if (isMarkerX(cellVal(sheet, markerCol + row))) {
        const r = readRigaEsito(sheet, row, markerCol, labelCol, textCol);
        if (r.livello || r.testo) return r;
      }
    }
    return null;
  }

  function pickByScoreBand(sheet, bands, markerCol, labelCol, textCol, scoreAddr) {
    const score = parseNumber(cellVal(sheet, scoreAddr));
    if (!Number.isFinite(score)) return null;
    const band = bands.find((b) => score >= b.min && score <= b.max);
    if (!band) return null;
    const r = readRigaEsito(sheet, band.row, markerCol, labelCol, textCol);
    if (!r.livello && r.key) r.livello = 'RISCHIO ' + r.key;
    r.score = score;
    r.fromBand = true;
    return r;
  }

  function parseRisultatiSheet(sheet) {
    const rows = [18, 20, 22];
    let picked = pickByMarker(sheet, rows, 'E', 'D', 'F');
    if (!picked) {
      picked = pickByScoreBand(sheet, RISULTATI_BANDS, 'E', 'D', 'F', 'E15');
    }
    if (!picked) {
      return { ok: false, error: 'Foglio RISULTATI: livello di rischio non individuato (marcatori E18/E20/E22 o punteggio E15).' };
    }
    return {
      ok: true,
      key: picked.key,
      livello: picked.livello,
      testo: picked.testo,
      score: picked.score != null ? picked.score : parseNumber(cellVal(sheet, 'E15')),
    };
  }

  function parseIntegrativaSheet(sheet) {
    const rows = [27, 29, 31];
    let picked = pickByMarker(sheet, rows, 'C', 'B', 'D');
    if (!picked) {
      const pct = parseNumber(cellVal(sheet, 'M16') || cellVal(sheet, 'C24'));
      if (Number.isFinite(pct)) {
        const band = INTEGRATIVA_BANDS.find((b) => pct >= b.min && pct <= b.max);
        if (band) {
          picked = readRigaEsito(sheet, band.row, 'C', 'B', 'D');
          if (!picked.livello && picked.key) picked.livello = 'RISCHIO ' + picked.key;
          picked.score = pct;
          picked.fromBand = true;
        }
      }
    }
    if (!picked || (!picked.livello && !picked.testo)) {
      return {
        ok: false,
        error: 'Foglio INTEGRATIVA: livello non individuato (marcatori C27/C29/C31 o percentuale M16/C24).',
      };
    }
    return {
      ok: true,
      key: picked.key,
      livello: picked.livello,
      testo: picked.testo,
      score: picked.score != null ? picked.score : parseNumber(cellVal(sheet, 'M16') || cellVal(sheet, 'C24')),
    };
  }

  function esitiToTemplateFields(risultati, integrativa) {
    return {
      RISULTATI_LIVELLO_RISCHIO: risultati.livello || '',
      RISULTATI_TESTO_ESITO: risultati.testo || '',
      INTEGRATIVA_LIVELLO_RISCHIO: integrativa.livello || '',
      INTEGRATIVA_TESTO_ESITO: integrativa.testo || '',
      _risultati_livello_key: risultati.key || '',
      _integrativa_livello_key: integrativa.key || '',
      _risultati_score: risultati.score,
      _integrativa_score: integrativa.score,
    };
  }

  function parseQuestionarioArrayBuffer(arrayBuffer) {
    if (!window.XLSX) {
      return { ok: false, errors: ['Libreria XLSX non caricata'] };
    }
    if (!arrayBuffer || !arrayBuffer.byteLength) {
      return { ok: false, errors: ['File Excel vuoto'] };
    }

    let wb;
    try {
      wb = window.XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
    } catch (e) {
      return { ok: false, errors: ['File Excel non leggibile: ' + (e.message || e)] };
    }

    const nameRis = findSheet(wb, 'RISULTATI');
    const nameInt = findSheet(wb, 'INTEGRATIVA');
    const errors = [];
    if (!nameRis) errors.push('Foglio «RISULTATI» non trovato');
    if (!nameInt) errors.push('Foglio «INTEGRATIVA» non trovato');
    if (errors.length) return { ok: false, errors };

    const shRis = wb.Sheets[nameRis];
    const shInt = wb.Sheets[nameInt];
    const parsedRis = parseRisultatiSheet(shRis);
    const parsedInt = parseIntegrativaSheet(shInt);
    if (!parsedRis.ok) errors.push(parsedRis.error);
    if (!parsedInt.ok) errors.push(parsedInt.error);
    if (errors.length) return { ok: false, errors };

    const risultati = {
      key: parsedRis.key || livelloKeyFromLabel(parsedRis.livello),
      livello: parsedRis.livello,
      testo: parsedRis.testo,
      score: parsedRis.score,
    };
    const integrativa = {
      key: parsedInt.key || livelloKeyFromLabel(parsedInt.livello),
      livello: parsedInt.livello,
      testo: parsedInt.testo,
      score: parsedInt.score,
    };

    const pianificazione = buildPianificazioneInterventi(wb);

    return {
      ok: true,
      risultati,
      integrativa,
      pianificazione,
      fields: {
        ...esitiToTemplateFields(risultati, integrativa),
        PIANIFICAZIONE_INTERVENTI_ELENCO: pianificazione.testo || '',
        _pianificazione_dettaglio: pianificazione,
      },
      sheetNames: { risultati: nameRis, integrativa: nameInt },
    };
  }

  function colorForKey(key) {
    return LIVELLO_COLORI[key] || '000000';
  }

  function normText(v) {
    if (v == null) return '';
    return String(v).replace(/\s+/g, ' ').trim();
  }

  function shortTestoIndicatore(testo) {
    const t = normText(testo);
    if (!t) return '';
    const cut = t.split(/\s*\(/)[0].trim();
    return cut || t;
  }

  function lcFirst(s) {
    const t = normText(s);
    if (!t) return '';
    return t.charAt(0).toLowerCase() + t.slice(1);
  }

  function cellAt(sheet, col, row) {
    return cellVal(sheet, col + row);
  }

  /** Trasforma testo indicatore in formulazione «critica» (evento non adeguato / assente). */
  function testoNegativoContestoContenuto(testo, siX, noX) {
    const raw = shortTestoIndicatore(testo);
    if (!raw) return '';
    const low = raw.toLowerCase();

    if (noX) {
      if (low.startsWith('presenza di ')) {
        const rest = lcFirst(raw.slice(11));
        if (low.includes('sistemi per') || low.includes('sistema di') || low.includes('sistema ')) {
          return 'Assenti ' + rest;
        }
        return 'Non ' + rest;
      }
      if (low.startsWith('possibilità di ') || low.startsWith('possibilita di ')) {
        return 'Impossibilità di ' + lcFirst(raw.replace(/^possibilit[aà] di /i, ''));
      }
      if (low.startsWith('sono predisposti ') || low.startsWith('sono definiti ') || low.startsWith('sono previsti ')) {
        return 'Non ' + lcFirst(raw);
      }
      if (low.startsWith('esistono ')) {
        return 'Non esistono ' + lcFirst(raw.slice(9));
      }
      if (low.startsWith('diffusione ')) {
        return 'Non diffusi ' + lcFirst(raw.slice(11));
      }
      if (low.startsWith('effettuazione ')) {
        return 'Non effettuata ' + lcFirst(raw.slice(14));
      }
      if (low.startsWith('adeguat')) return 'Non adeguato: ' + lcFirst(raw);
      return 'Non ' + lcFirst(raw);
    }

    if (siX) {
      if (low.includes('rischio')) {
        if (low.startsWith('rischio ')) return 'Presenza di ' + lcFirst(raw);
        return 'Presenza di rischio: ' + lcFirst(raw);
      }
      if (low.startsWith('ci sono ')) return lcFirst(raw.charAt(0).toUpperCase() + raw.slice(1));
      if (low.startsWith('è presente') || low.startsWith('e\' presente') || low.startsWith('e\u2019 presente')) {
        return 'Presente ' + lcFirst(raw.replace(/^e['\u2019]? presente /i, ''));
      }
      if (low.startsWith('sono presenti ')) return lcFirst(raw.charAt(0).toUpperCase() + raw.slice(1));
      if (low.startsWith('viene ') || low.startsWith('vi è ') || low.startsWith('vi ')) {
        return lcFirst(raw.charAt(0).toUpperCase() + raw.slice(1));
      }
      if (low.startsWith('il ') || low.startsWith('i ') || low.startsWith('lavoro ')) {
        return lcFirst(raw.charAt(0).toUpperCase() + raw.slice(1));
      }
      if (low.startsWith('adeguat')) return 'Non adeguato: ' + lcFirst(raw);
      return lcFirst(raw.charAt(0).toUpperCase() + raw.slice(1));
    }

    return lcFirst(raw.charAt(0).toUpperCase() + raw.slice(1));
  }

  function testoNegativoIndicatoriAziendali(sheet, row, testo) {
    const label = shortTestoIndicatore(testo);
    if (!label) return '';

    if (isMarkerX(cellAt(sheet, 'J', row))) return 'Aumento ' + lcFirst(label);
    if (isMarkerX(cellAt(sheet, 'F', row))) return 'Diminuzione ' + lcFirst(label);

    const m = parseNumber(cellAt(sheet, 'M', row));
    const n = parseNumber(cellAt(sheet, 'N', row));
    const o = parseNumber(cellAt(sheet, 'O', row));
    if (Number.isFinite(m) && Number.isFinite(n) && Number.isFinite(o)) {
      if (o > m && o > n && o > 0) return 'Aumento ' + lcFirst(label);
      if (m > n && m > o && m > 0) return 'Diminuzione ' + lcFirst(label);
    }

    return lcFirst(label.charAt(0).toUpperCase() + label.slice(1));
  }

  const PROFILI_RISCHIO_KW = [
    'movimentazione manuale',
    'rumore',
    'vibrazion',
    'radiazion',
    'biologico',
    'cancerogen',
    'chimico',
    'macchin',
    'attrezzature ad alto rischio',
    'responsabilit',
  ];

  function prefissoGruppiOmogenei(testo) {
    const low = testo.toLowerCase();
    if (PROFILI_RISCHIO_KW.some((k) => low.includes(k))) return 'Per alcuni gruppi omogenei ';
    return '';
  }

  function isSectionTitle(cVal, dVal) {
    const c = normText(cVal);
    const d = normText(dVal);
    if (!c || c === 'N' || /^\d+$/.test(c)) return false;
    if (d.length > 10) return false;
    if (/INDICATORE|AZIONI DI MIGLIORAMENTO|RISULTATI|PAGINA|SCHEDA|^AREA |^A CURA/i.test(c)) return false;
    return true;
  }

  const SHEET_COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  /** Colonna «AZIONI DI MIGLIORAMENTO» da intestazione riga 5 (fallback se assente). */
  function findAzioniCol(sheet, fallbackCol) {
    if (!sheet) return fallbackCol;
    for (const col of SHEET_COLS) {
      const h = normText(cellAt(sheet, col, '5'));
      if (/AZIONI\s+DI\s+MIGLIORAMENTO/i.test(h)) return col;
    }
    return fallbackCol;
  }

  /** Righe con X nella colonna azioni sulla stessa riga dell'indicatore (col. D). */
  function parseSheetContestoContenuto(sheet, siCol, noCol, azioniCol) {
    const items = [];
    const maxR = 130;

    for (let r = 1; r <= maxR; r++) {
      const rs = String(r);
      if (!isMarkerX(cellAt(sheet, azioniCol, rs))) continue;

      const d = cellAt(sheet, 'D', rs);
      const testo = normText(d);
      if (testo.length < 12 || /INDICATORE/i.test(testo)) continue;
      if (/^RISULTATI/i.test(testo) || /PAGINA/i.test(testo)) continue;
      if (isSectionTitle(cellAt(sheet, 'C', rs), d)) continue;

      const siX = isMarkerX(cellAt(sheet, siCol, rs));
      const noX = isMarkerX(cellAt(sheet, noCol, rs));
      const neg = testoNegativoContestoContenuto(testo, siX, noX);
      if (neg) items.push(prefissoGruppiOmogenei(neg) + neg);
    }

    return items;
  }

  function parseSheetIndicatoriAziendali(sheet, azioniCol) {
    const items = [];
    const colAzioni = azioniCol || findAzioniCol(sheet, 'U');

    for (let r = 7; r <= 35; r++) {
      const rs = String(r);
      if (!isMarkerX(cellAt(sheet, colAzioni, rs))) continue;
      const testo = cellAt(sheet, 'D', rs);
      if (!testo || normText(testo).length < 8) continue;
      const neg = testoNegativoIndicatoriAziendali(sheet, rs, testo);
      if (neg) items.push(neg);
    }
    return items;
  }

  const PIANIFICAZIONE_HEADERS = {
    indicatori: 'Area indicatori aziendali:',
    contenuto: 'Area contenuto:',
    contesto: 'Area Contesto:',
  };

  function formatPianificazioneElenco(indicatori, contenuto, contesto) {
    const blocks = [];
    if (indicatori.length) {
      blocks.push(PIANIFICAZIONE_HEADERS.indicatori);
      blocks.push(indicatori.join('\n'));
    }
    if (contenuto.length) {
      blocks.push(PIANIFICAZIONE_HEADERS.contenuto);
      blocks.push(contenuto.join('\n'));
    }
    if (contesto.length) {
      blocks.push(PIANIFICAZIONE_HEADERS.contesto);
      blocks.push(contesto.join('\n'));
    }
    return blocks.join('\n\n');
  }

  function buildPianificazioneInterventi(wb) {
    const nameInd = findSheet(wb, 'INDICATORI AZIENDALI');
    const nameCon = findSheet(wb, 'CONTENUTO');
    const nameCtx = findSheet(wb, 'CONTESTO');
    const shInd = nameInd ? wb.Sheets[nameInd] : null;
    const shCon = nameCon ? wb.Sheets[nameCon] : null;
    const shCtx = nameCtx ? wb.Sheets[nameCtx] : null;
    const colInd = findAzioniCol(shInd, 'U');
    const colCon = findAzioniCol(shCon, 'N');
    const colCtx = findAzioniCol(shCtx, 'M');
    const indicatori = shInd ? parseSheetIndicatoriAziendali(shInd, colInd) : [];
    const contenuto = shCon ? parseSheetContestoContenuto(shCon, 'F', 'H', colCon) : [];
    const contesto = shCtx ? parseSheetContestoContenuto(shCtx, 'F', 'G', colCtx) : [];
    return {
      indicatori,
      contenuto,
      contesto,
      testo: formatPianificazioneElenco(indicatori, contenuto, contesto),
    };
  }

  function colorForKey(key) {
    return LIVELLO_COLORI[key] || '000000';
  }

  window.GEN_STRESS_XLSX = {
    LIVELLO_COLORI,
    PIANIFICAZIONE_HEADERS,
    parseQuestionarioArrayBuffer,
    esitiToTemplateFields,
    buildPianificazioneInterventi,
    testoNegativoContestoContenuto,
    testoNegativoIndicatoriAziendali,
    colorForKey,
    livelloKeyFromLabel,
  };
})();
