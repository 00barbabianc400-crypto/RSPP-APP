/**
 * Adapter NOTA_LAVORATRICI_MADRI — Nota informativa lavoratrici madri (D.Lgs. 151/01).
 */
(function () {
  'use strict';

  const CODICE = 'NOTA_LAVORATRICI_MADRI';
  const NOME = 'Nota informativa per le lavoratrici madri';

  /** Calibri 8pt (half-points 16) — elenchi puntati / numerati. */
  const NOTA_ELENCO_8PT_RUN_PR =
    '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
    '<w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>';

  function htmlToRuns(html) {
    const runs = [];
    let bold = false;
    let underline = false;
    const parts = String(html || '').split(/(<\/?strong>|<\/?u>)/gi);
    for (const p of parts) {
      const tag = p.toLowerCase();
      if (tag === '<strong>') {
        bold = true;
        continue;
      }
      if (tag === '</strong>') {
        bold = false;
        continue;
      }
      if (tag === '<u>') {
        underline = true;
        continue;
      }
      if (tag === '</u>') {
        underline = false;
        continue;
      }
      if (!p) continue;
      runs.push({ text: p, bold, underline });
    }
    return runs;
  }

  function valutazioneRunsFromDef(def) {
    if (Array.isArray(def.valutazioneRuns) && def.valutazioneRuns.length) {
      return def.valutazioneRuns;
    }
    if (def.valutazioneHtml) {
      const fromHtml = htmlToRuns(def.valutazioneHtml);
      if (fromHtml.length) return fromHtml;
    }
    return [{ text: def.valutazione || '', bold: false, underline: false }];
  }

  const TESTO_DESCRIZIONE_CICLO_DEFAULT =
    'La societ\u00e0 opera nel settore terziario ed in particolar modo si occupa di fornire prestazioni di servizi di estetica generale, compresi i massaggi e l\u2019uso di apparecchiature con ultrasuoni e corrente galvanica oltre alla vendita di prodotti estetici di diversa natura.';

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

  function normalizeProfiloAzienda(p) {
    const row = p || {};
    return {
      id: String(row.id || row.profilo_id || '').trim(),
      nome: String(row.nome || row.nome_profilo || '').trim(),
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

  function gruppiOmogeneiForTemplate(profiliAzienda) {
    return normalizeProfiliAzienda(profiliAzienda).map((p) => ({
      NOME_GRUPPO: p.nome,
    }));
  }

  function normalizeAttivitaRow(row, idx) {
    return {
      id: String(row?.id || 'att_' + idx).trim(),
      testo: row != null && row.testo != null ? String(row.testo).trim() : '',
    };
  }

  function mergeAttivitaWizard(wizard) {
    const incoming = Array.isArray(wizard?.attivita_lavoratrici) ? wizard.attivita_lavoratrici : [];
    return incoming.map((r, i) => normalizeAttivitaRow(r, i));
  }

  function attivitaForTemplate(wizard) {
    return mergeAttivitaWizard(wizard)
      .filter((r) => String(r.testo || '').trim())
      .map((r) => ({ TESTO: r.testo }));
  }

  function getRischiCatalogo() {
    return Array.isArray(window.GEN_NOTA_RISCHI_MADRI_CATALOGO)
      ? window.GEN_NOTA_RISCHI_MADRI_CATALOGO
      : [];
  }

  function mergeRischiMadriWizard(wizard) {
    const incoming = Array.isArray(wizard?.rischi_madri) ? wizard.rischi_madri : [];
    const byId = new Map(incoming.map((r) => [String(r.id || '').trim(), r]));
    return getRischiCatalogo().map((def) => {
      const saved = byId.get(def.id);
      return {
        id: def.id,
        rischio: def.rischio,
        valutazione: def.valutazione,
        valutazioneHtml: def.valutazioneHtml || '',
        valutazioneRuns: valutazioneRunsFromDef(def),
        selezionato: saved != null ? saved.selezionato === true : false,
      };
    });
  }

  function rischiIdentificazioneForTemplate(wizard) {
    return mergeRischiMadriWizard(wizard)
      .filter((r) => r.selezionato)
      .map((r) => ({ TESTO_RISCHIO: r.rischio }));
  }

  function rischiValutazioneForTemplate(wizard) {
    return mergeRischiMadriWizard(wizard)
      .filter((r) => r.selezionato)
      .map((r) => ({ TESTO_VALUTAZIONE: r.valutazione }));
  }

  function rischiValutazioneListItemsForDocx(wizard) {
    return mergeRischiMadriWizard(wizard)
      .filter((r) => r.selezionato)
      .map((r) => ({
        plain: r.valutazione,
        runs: r.valutazioneRuns || [{ text: r.valutazione, bold: false, underline: false }],
      }));
  }

  function buildData(azienda, _rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const profiliAzienda = normalizeProfiliAzienda(w.profili_azienda || []);
    const testoCiclo =
      w.testo_descrizione_ciclo != null && String(w.testo_descrizione_ciclo).trim() !== ''
        ? String(w.testo_descrizione_ciclo).trim()
        : TESTO_DESCRIZIONE_CICLO_DEFAULT;

    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '250'),
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      TESTO_DESCRIZIONE_CICLO: testoCiclo,
      GRUPPI_OMOGENEI: gruppiOmogeneiForTemplate(profiliAzienda),
      ATTIVITA_LAVORATRICI: attivitaForTemplate(w),
      RISCHI_IDENTIFICAZIONE: rischiIdentificazioneForTemplate(w),
      RISCHI_VALUTAZIONE: rischiValutazioneForTemplate(w),
      LOGO_PREVIEW_URL: w.logo_url || '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _profili_azienda: profiliAzienda,
      _nota_wizard: {
        modulo_numero: w.modulo_numero,
        testo_descrizione_ciclo: testoCiclo,
        attivita_lavoratrici: mergeAttivitaWizard(w),
        rischi_madri: mergeRischiMadriWizard(w),
      },
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '01';
    const profiliAzienda = base._profili_azienda || [];
    const testoCiclo =
      w.testo_descrizione_ciclo != null
        ? String(w.testo_descrizione_ciclo).trim()
        : base.TESTO_DESCRIZIONE_CICLO || TESTO_DESCRIZIONE_CICLO_DEFAULT;

    return {
      ...base,
      MODULO_NUMERO: modNum,
      TESTO_DESCRIZIONE_CICLO: testoCiclo,
      GRUPPI_OMOGENEI: gruppiOmogeneiForTemplate(profiliAzienda),
      ATTIVITA_LAVORATRICI: attivitaForTemplate(w),
      RISCHI_IDENTIFICAZIONE: rischiIdentificazioneForTemplate(w),
      RISCHI_VALUTAZIONE: rischiValutazioneForTemplate(w),
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      _nota_wizard: {
        ...base._nota_wizard,
        modulo_numero: modNum,
        testo_descrizione_ciclo: testoCiclo,
        attivita_lavoratrici: mergeAttivitaWizard(w),
        rischi_madri: mergeRischiMadriWizard(w),
      },
    };
  }

  function validate(data) {
    const errors = [];
    if (!String(data.RAGIONE_SOCIALE || '').trim()) errors.push('Ragione sociale mancante');
    if (!String(data.SEDE_OPERATIVA || '').trim()) {
      errors.push('Sede operativa mancante (scegli la sede in generazione)');
    }
    if (!String(data.MODULO_NUMERO || '').trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    if (!data?._logo_buffer?.byteLength) {
      errors.push('Logo azienda mancante (carica PNG/JPEG in Loghi)');
    }
    if (!String(data.TESTO_DESCRIZIONE_CICLO || '').trim()) {
      errors.push('Descrizione ciclo lavorativo (settore/attivit\u00e0) mancante');
    }
    const gruppi = data.GRUPPI_OMOGENEI || [];
    if (!gruppi.length) {
      errors.push('Nessun gruppo omogeneo associato all\u2019azienda (profili in Anagrafica)');
    }
    const attivita = (data.ATTIVITA_LAVORATRICI || []).filter((r) => String(r.TESTO || '').trim());
    if (!attivita.length) {
      errors.push('Inserire almeno un\u2019attivit\u00e0 svolta dalle lavoratrici');
    }
    const rischiSel = (data.RISCHI_IDENTIFICAZIONE || []).filter((r) =>
      String(r.TESTO_RISCHIO || '').trim()
    );
    if (!rischiSel.length) {
      errors.push('Selezionare almeno un agente di rischio nella tabella');
    }
    if (!getRischiCatalogo().length) {
      errors.push('Catalogo rischi non caricato (rischi-madri-catalogo.js)');
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

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (k === 'LOGO_PREVIEW_URL') continue;
      if (
        (k === 'GRUPPI_OMOGENEI' ||
          k === 'ATTIVITA_LAVORATRICI' ||
          k === 'RISCHI_IDENTIFICAZIONE' ||
          k === 'RISCHI_VALUTAZIONE') &&
        Array.isArray(v)
      ) {
        if (k === 'GRUPPI_OMOGENEI') {
          templateData[k] = v.map((row) => ({ NOME_GRUPPO: templateValue(row.NOME_GRUPPO) }));
        } else if (k === 'ATTIVITA_LAVORATRICI') {
          templateData[k] = v.map((row) => ({ TESTO: templateValue(row.TESTO) }));
        } else if (k === 'RISCHI_IDENTIFICAZIONE') {
          templateData[k] = v.map((row) => ({ TESTO_RISCHIO: templateValue(row.TESTO_RISCHIO) }));
        } else {
          templateData[k] = v.map((row) => ({
            TESTO_VALUTAZIONE: templateValue(row.TESTO_VALUTAZIONE),
          }));
        }
        continue;
      }
      templateData[k] = templateValue(v);
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
        : err.message;
      throw new Error('Errore rendering nota lavoratrici madri: ' + msg);
    }

    const outZip = doc.getZip();
    const rischiValItems = rischiValutazioneListItemsForDocx({
      rischi_madri: data._nota_wizard?.rischi_madri,
    });
    if (repair?.expandVademecumListLoopsInZip) {
      repair.expandVademecumListLoopsInZip(outZip, {
        loops: [
          {
            texts: (templateData.GRUPPI_OMOGENEI || []).map((r) => r.NOME_GRUPPO),
            rPr: NOTA_ELENCO_8PT_RUN_PR,
          },
          { texts: (templateData.ATTIVITA_LAVORATRICI || []).map((r) => r.TESTO) },
          {
            texts: (templateData.RISCHI_IDENTIFICAZIONE || []).map((r) => r.TESTO_RISCHIO),
            rPr: NOTA_ELENCO_8PT_RUN_PR,
          },
          { texts: rischiValItems, rPr: NOTA_ELENCO_8PT_RUN_PR },
        ],
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
    TESTO_DESCRIZIONE_CICLO_DEFAULT,
    mergeAttivitaWizard,
    attivitaForTemplate,
    mergeRischiMadriWizard,
    rischiIdentificazioneForTemplate,
    rischiValutazioneForTemplate,
    getRischiCatalogo,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    repairDocxTemplateZip: (zip) => window.GEN_DOCX_REPAIR?.repairDocxTemplateZip?.(zip) || zip,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
