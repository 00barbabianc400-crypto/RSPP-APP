/**
 * Adapter APPENDICE_B3_ALTRE_SEDI — Appendice B.3 (DOCX).
 * Stesso modello e logica di B.2; sede/descrizioni da picker generazione.
 */
(function () {
  'use strict';

  const CODICE = 'APPENDICE_B3_ALTRE_SEDI';
  const NOME = 'Appendice B.3: Misure per altre sedi operative';

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  function formatModuloNumero(raw, fallback) {
    const s = raw != null && String(raw).trim() !== '' ? String(raw).trim() : String(fallback || '1');
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0) return '01';
    return String(n).padStart(2, '0');
  }

  function formatDateIt(value) {
    if (!value) return '';
    const s = String(value).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function templatePayload(data) {
    const d = { ...(data || {}) };
    delete d._logo_buffer;
    delete d._logo_path;
    delete d.LOGO_PREVIEW_URL;
    delete d._profili_nomi;
    delete d._profili_azienda;
    delete d.MODULO_NUMERO;
    delete d.data_sopralluogo;
    return d;
  }

  function buildData(azienda, _rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      DESCRIZIONE_SITO: String(azienda?.descrizione_sito || '').trim(),
      DESCRIZIONE_PROCESSO_PRODUTTIVO: String(
        azienda?.descrizione_processo_produttivo || ''
      ).trim(),
      DATA_SOPRALLUOGO: formatDateIt(w.data_sopralluogo),
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '50'),
      LOGO_PREVIEW_URL: w.logo_url || '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      data_sopralluogo: w.data_sopralluogo || '',
    };
  }

  function applyWizard(base, wizard) {
    const merged = { ...(base || {}) };
    if (wizard && wizard.data_sopralluogo !== undefined) {
      merged.data_sopralluogo = String(wizard.data_sopralluogo || '').trim();
      merged.DATA_SOPRALLUOGO = formatDateIt(merged.data_sopralluogo);
    }
    return merged;
  }

  function validate(data) {
    const errors = [];
    if (!data?._logo_buffer?.byteLength) {
      errors.push('Logo azienda mancante (carica PNG/JPEG in Loghi)');
    }
    if (!String(data?.DATA_SOPRALLUOGO || '').trim()) {
      errors.push('Data sopralluogo (wizard)');
    }
    if (!String(data?.SEDE_OPERATIVA || '').trim()) {
      errors.push('Sede operativa mancante (seleziona sede in generazione)');
    }
    const logoPathHint = data?._logo_path || '';
    if (data?._logo_buffer && window.GEN_LOGO_DOCX?.isSvgBuffer?.(data._logo_buffer, logoPathHint)) {
      errors.push('Il logo SVG non è supportato in Word (usa PNG o JPEG)');
    }
    return errors;
  }

  async function generateDocx(templateArrayBuffer, data) {
    const DocxtemplaterCtor = getDocxtemplaterCtor();
    if (!window.PizZip) throw new Error('PizZip non caricato');
    if (!DocxtemplaterCtor) throw new Error('Docxtemplater non caricato');

    const logoBuffer = data._logo_buffer || null;
    const logoPathHint = data._logo_path || '';
    if (logoBuffer && window.GEN_LOGO_DOCX?.isSvgBuffer?.(logoBuffer, logoPathHint)) {
      throw new Error('Il logo SVG non è supportato in Word. Carica PNG o JPEG in Loghi.');
    }
    if (!templateArrayBuffer?.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const repair = window.GEN_DOCX_REPAIR;
    let zip = new window.PizZip(templateArrayBuffer);
    if (repair?.repairDocxTemplateZip) {
      zip = repair.repairDocxTemplateZip(zip);
    }

    const docOpts = repair?.DOCXTEMPLATER_OPTIONS || { paragraphLoop: true, linebreaks: true };
    const doc = new DocxtemplaterCtor(zip, { ...docOpts });
    doc.setData(templatePayload(data));
    try {
      doc.render();
    } catch (err) {
      const msg = repair?.formatDocxtemplaterErrors
        ? repair.formatDocxtemplaterErrors(err)
        : err.message;
      throw new Error('Errore rendering Appendice B.3: ' + msg);
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
    outputExtension: 'docx',
    outputMimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buildData,
    applyWizard,
    validate,
    generateDocx,
    repairDocxTemplateZip: (zip) => window.GEN_DOCX_REPAIR?.repairDocxTemplateZip?.(zip) || zip,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
