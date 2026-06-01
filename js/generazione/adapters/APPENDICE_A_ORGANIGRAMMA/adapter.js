/**
 * Adapter APPENDICE_A_ORGANIGRAMMA — Appendice A: organigramma / mansionario.
 */
(function () {
  'use strict';

  const CODICE = 'APPENDICE_A_ORGANIGRAMMA';
  const NOME = 'Appendice A: Organigramma e mansionario tecnico operativo';

  const DEFAULT_ORG_DIRIGENTI = 'POSSONO NON ESSERE NOMINATI';
  const DEFAULT_ORG_PREPOSTI_NOTA =
    'SE NON SI AUTONOMINA IL DATORE DI LAVORO DEVONO ESSERE NOMINATI';
  const DEFAULT_ORG_SQUADRE =
    'Si rimanda alla documentazione specifica per la gestione delle emergenze';

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

  function organigrammaFormalizzazioneFlags(wizard) {
    const stato = (wizard && wizard.stato_formalizzazione_organigramma) || 'da_formalizzare';
    const giaFormalizzato = stato === 'gia_formalizzato';
    return {
      ORGANIGRAMMA_DA_FORMALIZZARE: !giaFormalizzato,
      ORGANIGRAMMA_GIA_FORMALIZZATO: giaFormalizzato,
    };
  }

  function refPrevistoWizard(wizard, wizardKey, fallbackText) {
    const w = wizard || {};
    if (w[wizardKey] === true) return true;
    if (w[wizardKey] === false) return false;
    return !!String(fallbackText || '').trim();
  }

  /** §5.1: Datore = Preposto (opzione 1) vs distinti (opzione 2). */
  function organigrammaSezione51Flags(wizard) {
    const w = wizard || {};
    const unico = w.organigramma_datore_preposto_unico !== false;
    const mcPrevisto = w.organigramma_mc_previsto !== false;
    return {
      ORG_OPT_DATORE_PREPOSTO_UNICO: unico,
      ORG_OPT_DATORE_DISTINTO_DA_PREPOSTO: !unico,
      ORG_MC_PREVISTO: mcPrevisto,
      ORG_REF_PERSONALE_PREVISTO: refPrevistoWizard(w, 'organigramma_ref_personale_previsto', w.org_ref_personale),
      ORG_REF_SERVIZI_TEC_PREVISTO: refPrevistoWizard(w, 'organigramma_ref_servizi_tecnici_previsto', w.org_ref_servizi_tecnici),
      ORG_REF_ACQUISTI_PREVISTO: refPrevistoWizard(w, 'organigramma_ref_acquisti_previsto', w.org_ref_acquisti_appalti),
    };
  }

  function buildSezione51FromAziendaWizard(azienda, wizard) {
    const w = wizard || {};
    const flags = organigrammaSezione51Flags(w);
    const datore = azienda?.datore_lavoro || '';
    return {
      ...flags,
      ORG_SOGG_DATORE_PREPOSTO: datore,
      ORG_SOGG_DATORE_SOLO: datore,
      ORG_SOGG_RSPP: azienda?.rspp || '',
      ORG_SOGG_MC: azienda?.medico_competente || '',
      ORG_SOGG_RLS: azienda?.rls || '',
      ORG_SOGG_REF_PERSONALE: w.org_ref_personale || '',
      ORG_SOGG_REF_SERVIZI_TEC: w.org_ref_servizi_tecnici || '',
      ORG_SOGG_REF_ACQUISTI: w.org_ref_acquisti_appalti || '',
      ORG_SOGG_PREPOSTO: w.org_preposto_sicurezza || '',
      ORG_SOGG_DIRIGENTI: w.org_dirigenti_testo || DEFAULT_ORG_DIRIGENTI,
      ORG_SOGG_PREPOSTI_NOTA: w.org_preposti_nota || DEFAULT_ORG_PREPOSTI_NOTA,
      ORG_SOGG_SQUADRE_EMERGENZA: w.org_squadre_emergenza || DEFAULT_ORG_SQUADRE,
    };
  }

  function templatePayload(data) {
    const d = { ...(data || {}) };
    delete d._logo_buffer;
    delete d._logo_path;
    delete d.LOGO_PREVIEW_URL;
    delete d._profili_nomi;
    delete d._profili_azienda;
    delete d._stato_formalizzazione_organigramma;
    delete d.MODULO_NUMERO;
    return d;
  }

  function buildData(azienda, _rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const flags = organigrammaFormalizzazioneFlags(w);
    const s51 = buildSezione51FromAziendaWizard(azienda, w);
    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '20'),
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      ...flags,
      ...s51,
      LOGO_PREVIEW_URL: w.logo_url || '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _profili_nomi: Array.isArray(w.profili_nomi) ? w.profili_nomi : [],
      _profili_azienda: Array.isArray(w.profili_azienda) ? w.profili_azienda : [],
      _stato_formalizzazione_organigramma: w.stato_formalizzazione_organigramma || 'da_formalizzare',
    };
  }

  function applyWizard(base, wizard) {
    const merged = { ...(base || {}) };
    Object.assign(merged, organigrammaFormalizzazioneFlags(wizard));
    if (wizard && wizard.stato_formalizzazione_organigramma) {
      merged._stato_formalizzazione_organigramma = wizard.stato_formalizzazione_organigramma;
    }
    const az = {
      datore_lavoro: merged.ORG_SOGG_DATORE_SOLO || merged.ORG_SOGG_DATORE_PREPOSTO,
      rspp: merged.ORG_SOGG_RSPP,
      medico_competente: merged.ORG_SOGG_MC,
      rls: merged.ORG_SOGG_RLS,
    };
    Object.assign(merged, buildSezione51FromAziendaWizard(az, wizard));
    return merged;
  }

  function validate(data) {
    const errors = [];
    if (!data?._logo_buffer?.byteLength) {
      errors.push('Logo azienda mancante (carica PNG/JPEG in Loghi)');
    }
    const stato = data?._stato_formalizzazione_organigramma;
    if (stato && stato !== 'da_formalizzare' && stato !== 'gia_formalizzato') {
      errors.push('Stato formalizzazione organigramma non valido');
    }
    if (data?.ORG_OPT_DATORE_DISTINTO_DA_PREPOSTO) {
      const pre = String(data.ORG_SOGG_PREPOSTO || '').trim();
      if (!pre) {
        errors.push('§5.1: con Datore distinto dal Preposto, indica il Preposto alla sicurezza (wizard)');
      }
    }
    if (data?.ORG_MC_PREVISTO) {
      const mc = String(data.ORG_SOGG_MC || '').trim();
      if (!mc) {
        errors.push('Medico competente previsto: indica Medico competente in Anagrafica azienda');
      }
    }
    if (data?.ORG_REF_PERSONALE_PREVISTO) {
      if (!String(data.ORG_SOGG_REF_PERSONALE || '').trim()) {
        errors.push('§5.1: Referente affari del personale previsto — indica il nominativo nel wizard');
      }
    }
    if (data?.ORG_REF_SERVIZI_TEC_PREVISTO) {
      if (!String(data.ORG_SOGG_REF_SERVIZI_TEC || '').trim()) {
        errors.push('§5.1: Referente servizi tecnici previsto — indica il nominativo nel wizard');
      }
    }
    if (data?.ORG_REF_ACQUISTI_PREVISTO) {
      if (!String(data.ORG_SOGG_REF_ACQUISTI || '').trim()) {
        errors.push('§5.1: Referente acquisti/appalti previsto — indica il nominativo nel wizard');
      }
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
      const msg = repair?.formatDocxtemplaterErrors ? repair.formatDocxtemplaterErrors(err) : err.message;
      throw new Error('Errore rendering Appendice A: ' + msg);
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
    buildData,
    applyWizard,
    validate,
    generateDocx,
    organigrammaFormalizzazioneFlags,
    organigrammaSezione51Flags,
    repairDocxTemplateZip: (zip) => window.GEN_DOCX_REPAIR?.repairDocxTemplateZip?.(zip) || zip,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
