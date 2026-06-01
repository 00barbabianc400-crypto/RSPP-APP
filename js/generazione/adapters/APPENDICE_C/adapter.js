/**
 * Adapter APPENDICE_C_SORVEGLIANZA — Appendice C: Protocollo di sorveglianza sanitaria (DOCX).
 */
(function () {
  'use strict';

  const CODICE = 'APPENDICE_C_SORVEGLIANZA';
  const NOME = 'Appendice C: Protocollo di sorveglianza sanitaria';
  const MAT = () => window.APPENDICE_C_MATRICE;

  const SOR_PREVISTO =
    'Si rimanda al protocollo sanitario istituito dal Medico Competente';
  const SOR_NON_PREVISTO = 'Non previsto';

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  function luogoDaSede(sede) {
    const s = sede || '';
    const m = s.match(/^([^,–—-]+)/);
    return m ? m[1].trim() : s.trim();
  }

  function formatModuloNumero(raw, fallback) {
    const s = raw != null && String(raw).trim() !== '' ? String(raw).trim() : String(fallback || '1');
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0) return '01';
    return String(n).padStart(2, '0');
  }

  function protocolloSorSanLabel(flag) {
    return flag === true ? SOR_PREVISTO : SOR_NON_PREVISTO;
  }

  function normalizeWizardGruppi(raw, profili) {
    const mat = MAT();
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    (Array.isArray(profili) ? profili : []).forEach((p) => {
      const pid = String(p.id || '');
      if (!pid) return;
      out[pid] = mat?.normalizeGruppoConfig
        ? mat.normalizeGruppoConfig(src[pid])
        : { rischi_ids: [], periodicita: {} };
    });
    return out;
  }

  /** Dal 2° gruppo con sorveglianza Sì: nuova pagina (apici B/C ripartono per segmento). */
  function applyAutoPageBreaks(cfgMap, profili) {
    let pastFirstSorveglianza = false;
    (Array.isArray(profili) ? profili : []).forEach((p) => {
      const pid = String(p.id || '');
      const cfg = cfgMap[pid];
      if (!cfg) return;
      if (p.protocollo_sor_san !== true) {
        cfg.page_break_before = false;
        return;
      }
      cfg.page_break_before = pastFirstSorveglianza;
      pastFirstSorveglianza = true;
    });
  }

  function gruppoConfigFromProfilo(profilo) {
    const mat = MAT();
    if (!mat || profilo?.protocollo_sor_san !== true) {
      return mat?.defaultGruppoConfig?.() || { rischi_ids: [], periodicita: {}, page_break_before: false };
    }
    return mat.normalizeProtocolloProfilo(profilo.protocollo_sanitario_config);
  }

  function mergeWizardGruppiFromProfili(raw, profili) {
    const mat = MAT();
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    (Array.isArray(profili) ? profili : []).forEach((p) => {
      const pid = String(p.id || '');
      if (!pid) return;
      const fromProfilo = gruppoConfigFromProfilo(p);
      const stored = src[pid] ? mat.normalizeGruppoConfig(src[pid]) : null;
      if (fromProfilo.rischi_ids?.length) {
        out[pid] = fromProfilo;
      } else if (stored?.rischi_ids?.length) {
        out[pid] = stored;
      } else if (stored) {
        out[pid] = stored;
      } else {
        out[pid] = fromProfilo;
      }
    });
    applyAutoPageBreaks(out, profili);
    return out;
  }

  function buildGruppoOmogeneoRow(profilo, cfg) {
    const mat = MAT();
    const pid = String(profilo.id || '');
    const nome = profilo.nome || '';
    const sorPrevista = profilo.protocollo_sor_san === true;

    if (!sorPrevista) {
      return {
        GRUPPO_ID: pid,
        GRUPPO_NOME: nome,
        SORVEGLIANZA_PREVISTA: false,
        RISCHI: [],
        RISCHI_TESTO: '—',
        ACCERTAMENTI: [],
        ACCERTAMENTI_TESTO: 'Non previsto',
        PERIODICITA_TESTO: '—',
      };
    }

    const rischiIds = cfg?.rischi_ids || [];
    const rischi = rischiIds
      .map((id) => mat?.getRischio(id))
      .filter(Boolean)
      .sort((a, b) => (a.ordine || 0) - (b.ordine || 0));

    const accertamenti = mat?.accertamentiForRischi
      ? mat.accertamentiForRischi(rischiIds)
      : [];

    const accRows = accertamenti.map((acc) => ({
      ACCERTAMENTO_ID: acc.id,
      ACCERTAMENTO_NOME: acc.wordLabel || acc.nome,
      PERIODICITA: mat.formatPeriodicitaForAccertamento(cfg.periodicita, acc.id),
    }));

    const base = {
      GRUPPO_ID: pid,
      GRUPPO_NOME: nome,
      SORVEGLIANZA_PREVISTA: true,
      RISCHI: rischi.map((r) => ({ RISCHIO_ID: r.id, RISCHIO_NOME: r.nome })),
      RISCHI_TESTO: rischi.map((r) => r.nome).join('\n') || '—',
      ACCERTAMENTI: accRows,
      ACCERTAMENTI_TESTO: accRows.map((a) => a.ACCERTAMENTO_NOME).join('\n') || '—',
      PERIODICITA_TESTO: mat.formatPeriodicitaTestoGruppo
        ? mat.formatPeriodicitaTestoGruppo(cfg.periodicita, accertamenti)
        : accRows.map((a) => a.PERIODICITA || '—').join('\n') || '—',
      PAGE_BREAK_BEFORE: !!cfg?.page_break_before,
    };
    return base;
  }

  function buildGruppiOmogenei(profili, wizardGruppi) {
    const cfgMap = mergeWizardGruppiFromProfili(wizardGruppi, profili);
    return (Array.isArray(profili) ? profili : []).map((p) =>
      buildGruppoOmogeneoRow(p, cfgMap[String(p.id || '')])
    );
  }

  function templatePayload(data) {
    const d = { ...(data || {}) };
    delete d._logo_buffer;
    delete d._logo_path;
    delete d.LOGO_PREVIEW_URL;
    delete d._profili_nomi;
    delete d._profili_azienda;
    delete d._appendice_c_gruppi;
    delete d.MODULO_NUMERO;
    return d;
  }

  function buildData(azienda, _rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const profili = Array.isArray(w.profili_azienda) ? w.profili_azienda : [];
    const sede = azienda?.sede_operativa || '';
    const medico = String(azienda?.medico_competente || '').trim();
    const gruppi = buildGruppiOmogenei(profili, w.appendice_c_gruppi);

    return {
      LUOGO: luogoDaSede(sede),
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: sede,
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '60'),
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      DATORE_LAVORO: azienda?.datore_lavoro || '',
      RSPP: azienda?.rspp || '',
      MEDICO_COMPETENTE: medico,
      RLS: azienda?.rls || '',
      GRUPPI: gruppi,
      HA_GRUPPI: gruppi.length > 0,
      LOGO_PREVIEW_URL: w.logo_url || '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _profili_nomi: Array.isArray(w.profili_nomi) ? w.profili_nomi : [],
      _profili_azienda: profili,
      _appendice_c_gruppi: mergeWizardGruppiFromProfili(w.appendice_c_gruppi, profili),
    };
  }

  function applyWizard(base, wizard) {
    const merged = { ...(base || {}) };
    const profili = Array.isArray(wizard?.profili_azienda)
      ? wizard.profili_azienda
      : merged._profili_azienda || [];
    const gruppiCfg =
      wizard?.appendice_c_gruppi != null
        ? wizard.appendice_c_gruppi
        : merged._appendice_c_gruppi;
    merged._profili_azienda = profili;
    merged._appendice_c_gruppi = mergeWizardGruppiFromProfili(gruppiCfg, profili);
    merged.GRUPPI = buildGruppiOmogenei(profili, merged._appendice_c_gruppi);
    merged.HA_GRUPPI = merged.GRUPPI.length > 0;
    return merged;
  }

  function validateGruppi(profili, gruppiCfg) {
    const errors = [];
    const cfgMap = mergeWizardGruppiFromProfili(gruppiCfg, profili);
    const mat = MAT();

    (Array.isArray(profili) ? profili : []).forEach((p) => {
      if (p.protocollo_sor_san !== true) return;
      const pid = String(p.id || '');
      const nome = p.nome || pid;
      const cfg = cfgMap[pid] || { rischi_ids: [], periodicita: {} };
      if (!cfg.rischi_ids.length) {
        errors.push('«' + nome + '»: seleziona almeno un rischio lavorativo');
        return;
      }
      const accertamenti = mat?.accertamentiForRischi(cfg.rischi_ids) || [];
      accertamenti.forEach((acc) => {
        const per = mat.mergePeriodicitaIds(cfg.periodicita, acc.id);
        if (!per.length) {
          errors.push(
            '«' + nome + '»: indica la periodicità per «' + (acc.wordLabel || acc.nome) + '»'
          );
        }
      });
    });

    return errors;
  }

  function validate(data) {
    const errors = [];
    if (!data?._logo_buffer?.byteLength) {
      errors.push('Logo azienda mancante (carica PNG/JPEG in Loghi)');
    }
    if (!String(data?.RAGIONE_SOCIALE || '').trim()) {
      errors.push('Ragione sociale mancante in anagrafica azienda');
    }
    if (!String(data?.SEDE_OPERATIVA || '').trim()) {
      errors.push('Sede operativa mancante');
    }
    if (!String(data?.MEDICO_COMPETENTE || '').trim()) {
      errors.push('Medico competente mancante in anagrafica azienda (firma protocollo)');
    }
    const profili = data?._profili_azienda || [];
    if (!profili.length) {
      errors.push('Nessun profilo associato all\'azienda');
    }
    errors.push(...validateGruppi(profili, data?._appendice_c_gruppi));
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
      throw new Error('Errore rendering Appendice C: ' + msg);
    }

    let outZip = doc.getZip();
    if (window.APPENDICE_C_DOCX_FORMAT?.formatGeneratedZip) {
      outZip = window.APPENDICE_C_DOCX_FORMAT.formatGeneratedZip(outZip);
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
    buildData,
    applyWizard,
    validate,
    validateGruppi,
    generateDocx,
    luogoDaSede,
    protocolloSorSanLabel,
    normalizeWizardGruppi,
    mergeWizardGruppiFromProfili,
    applyAutoPageBreaks,
    gruppoConfigFromProfilo,
    buildGruppiOmogenei,
    buildGruppoOmogeneoRow,
    repairDocxTemplateZip: (zip) => window.GEN_DOCX_REPAIR?.repairDocxTemplateZip?.(zip) || zip,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
