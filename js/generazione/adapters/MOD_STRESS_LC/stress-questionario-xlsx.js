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

  /** Normalizza maiuscole Excel (es. «iNDICI») in frase leggibile. */
  function normalizePhrase(s) {
    let t = normText(s);
    if (!t) return '';
    const letters = t.replace(/[^A-Za-zÀ-ú]/g, '');
    const uppers = (letters.match(/[A-ZÀ-Ú]/g) || []).length;
    if (letters.length > 4 && uppers / letters.length > 0.45) {
      t = t.toLowerCase();
    }
    return t;
  }

  function capFirst(s) {
    const t = normalizePhrase(s);
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function stripLeadingAdeguato(s) {
    return normalizePhrase(s).replace(/^adeguat[oaie]+\s*:?\s*/i, '').trim();
  }

  function cellAt(sheet, col, row) {
    return cellVal(sheet, col + row);
  }

  const SECTION_TITLE_RE = [
    /^ambiente di lavoro\b/i,
    /^ruolo nell['\u2019]?ambito\b/i,
    /^contenuto del lavoro\b/i,
    /^contesto organizzativo\b/i,
    /^area\s+(contenuto|contesto|indicatori)/i,
    /^sotto-?area\b/i,
  ];

  /** Trasforma testo indicatore in formulazione critica (SI/NO sulla stessa riga). */
  function testoNegativoContestoContenuto(testo, siX, noX) {
    const raw = shortTestoIndicatore(testo);
    if (!raw || (!siX && !noX)) return '';
    const phrase = normalizePhrase(raw);
    const low = phrase.toLowerCase();

    if (noX) {
      if (low.startsWith('presenza di ')) {
        const rest = phrase.slice(11).trim();
        if (/sistemi?\s+(per|di)\b/i.test(rest)) return 'Assenti ' + rest;
        return 'Non è presente ' + rest;
      }
      if (low.startsWith('non disponibilit')) return capFirst(phrase);
      if (low.startsWith('possibilità di ') || low.startsWith('possibilita di ')) {
        return 'Impossibilità di ' + phrase.replace(/^possibilit[aà] di /i, '');
      }
      if (low.startsWith('sono predisposti ')) {
        return 'Non sono predisposti ' + phrase.replace(/^sono predisposti\s+/i, '');
      }
      if (low.startsWith('sono definiti ')) {
        return 'Non sono definiti ' + phrase.replace(/^sono definiti\s+/i, '');
      }
      if (low.startsWith('sono previsti ')) {
        return 'Non sono previsti ' + phrase.replace(/^sono previsti\s+/i, '');
      }
      if (low.startsWith('esistono ')) return 'Non esistono ' + phrase.slice(9);
      if (low.startsWith('diffusione ') || low.startsWith('diffusi ')) {
        let rest = phrase.replace(/^diffusione\s+/i, '').replace(/^diffusi\s+/i, '');
        if (!/^(l['\u2019]?|il |la |lo |gli |le |i )/i.test(rest)) rest = "l'" + rest;
        return 'Non è diffuso ' + rest;
      }
      if (low.startsWith('effettuazione ')) return 'Non è effettuata ' + phrase.slice(14);
      if (low.startsWith('adeguat')) return 'Non adeguato: ' + stripLeadingAdeguato(phrase);
      if (/^un\s/.test(low) || /^una\s/.test(low)) return 'Non è previsto ' + phrase;
      if (low.startsWith('i lavoratori') || low.startsWith('il ') || low.startsWith('gli ')) {
        return 'Non ' + phrase.charAt(0).toLowerCase() + phrase.slice(1);
      }
      return 'Non ' + phrase.charAt(0).toLowerCase() + phrase.slice(1);
    }

    if (siX) {
      if (low.includes('rischio')) {
        if (low.startsWith('rischio ')) return 'Presenza di ' + phrase;
        return 'Presenza di rischio ' + phrase.replace(/^rischio\s+/i, '');
      }
      if (low.startsWith('ci sono ')) {
        return 'Sono presenti ' + phrase.replace(/^ci sono\s+/i, '');
      }
      if (low.startsWith('è presente') || low.startsWith('e\' presente') || low.startsWith('e presente')) {
        return 'È presente ' + phrase.replace(/^e['\u2019]?\s*presente\s+/i, '');
      }
      if (low.startsWith('sono presenti ')) return capFirst(phrase);
      if (low.startsWith('è abituale') || low.startsWith('e\' abituale') || low.startsWith('e abituale')) {
        return capFirst(phrase);
      }
      if (low.startsWith('la programmazione') || low.startsWith('presente un ')) return capFirst(phrase);
      if (low.startsWith('viene ') || low.startsWith('vi è ') || low.startsWith('vi ')) return capFirst(phrase);
      if (low.startsWith('il ') || low.startsWith('i ') || low.startsWith('lavoro ')) return capFirst(phrase);
      if (low.startsWith('adeguat')) return 'Non adeguato: ' + stripLeadingAdeguato(phrase);
      return capFirst(phrase);
    }

    return '';
  }

  function testoNegativoIndicatoriAziendali(sheet, row, testo) {
    const label = normalizePhrase(shortTestoIndicatore(testo));
    if (!label) return '';
    const low = label.toLowerCase();

    if (isMarkerX(cellAt(sheet, 'J', row))) {
      if (/infortunist/i.test(low)) return 'Aumento degli indici infortunistici';
      if (/ferie/i.test(low)) return 'Aumento della percentuale di ferie non godute';
      if (/procediment|sanzion|disciplin/i.test(low)) {
        return 'Aumento dei procedimenti/sanzioni disciplinari';
      }
      return 'Aumento ' + (low.match(/^(del|della|dei|degli|delle|dell['\u2019])\s/)
        ? low
        : (/^[aeiouàèéìòù]/i.test(low) ? 'degli ' : 'dei ') + low);
    }
    if (isMarkerX(cellAt(sheet, 'F', row))) {
      if (/ferie/i.test(low)) return 'Diminuzione della percentuale di ferie non godute';
      return 'Diminuzione ' + (low.match(/^(del|della|dei|degli|delle|dell['\u2019])\s/)
        ? low
        : (/^[aeiouàèéìòù]/i.test(low) ? 'degli ' : 'dei ') + low);
    }

    const m = parseNumber(cellAt(sheet, 'M', row));
    const n = parseNumber(cellAt(sheet, 'N', row));
    const o = parseNumber(cellAt(sheet, 'O', row));
    if (Number.isFinite(m) && Number.isFinite(n) && Number.isFinite(o)) {
      if (o > m && o > n && o > 0) {
        if (/infortunist/i.test(low)) return 'Aumento degli indici infortunistici';
        if (/ferie/i.test(low)) return 'Aumento della percentuale di ferie non godute';
        return 'Aumento ' + low;
      }
      if (m > n && m > o && m > 0) return 'Diminuzione ' + low;
    }

    return '';
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
    if (!d) return true;
    if (d === c && c.length > 6) return true;
    if (SECTION_TITLE_RE.some((re) => re.test(d))) return true;
    if (!c || c === 'N' || /^\d+$/.test(c)) return false;
    if (d.length > 28) return false;
    if (/INDICATORE|AZIONI DI MIGLIORAMENTO|RISULTATI|PAGINA|SCHEDA|^AREA |^A CURA/i.test(c)) return false;
    if (!/^(presenza|possibilit|sono|esistono|ci sono|è |e'|adeguat|non |il |i |lavoro |la |viene|diffusione)/i.test(d)) {
      return true;
    }
    return false;
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
      if (testo.length < 22 || /INDICATORE/i.test(testo)) continue;
      if (/^RISULTATI/i.test(testo) || /PAGINA/i.test(testo)) continue;
      if (isSectionTitle(cellAt(sheet, 'C', rs), d)) continue;

      const siX = isMarkerX(cellAt(sheet, siCol, rs));
      const noX = isMarkerX(cellAt(sheet, noCol, rs));
      if (!siX && !noX) continue;

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
