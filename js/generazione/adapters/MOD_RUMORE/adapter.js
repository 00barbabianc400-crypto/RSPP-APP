/**
 * Adapter MOD_RUMORE — Valutazione del rischio rumore (§1–§6).
 */
(function () {
  'use strict';

  const CODICE = 'MOD_RUMORE';
  const NOME = 'Valutazione del rischio rumore';

  const REDATTO_DA_DEFAULT = 'Team della Studio Rivelli Consulting S.r.l.';

  const TESTO_ANALISI_PRELIMINARE_DEFAULT =
    'Dall\u2019analisi preliminare \u00e8 emerso che fondatamente possono essere superati i livelli inferiori di azione pertanto il datore di lavoro, in coordinamento con il SPP, ha disposto la misura i livelli di rumore cui i lavoratori sono esposti. I risultati sono riportati nel presente elaborato.';

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

  function formatDateIt(raw) {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw).trim();
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function isTipoRumoreCatalogo(nomeTipo) {
    const n = String(nomeTipo || '').trim().toLowerCase();
    return n.includes('rumor');
  }

  function filterRilevamentiRumore(rilevamenti) {
    return (rilevamenti || []).filter((r) => isTipoRumoreCatalogo(r.tipo_rilevamento?.nome_tipo));
  }

  function formatNumRumore(v) {
    if (v == null || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v).trim();
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(n);
  }

  function normalizePostazioneRumore(row) {
    const r = row || {};
    return {
      postazione: String(r.postazione || '').trim(),
      peak_db_c: r.peak_db_c != null && r.peak_db_c !== '' ? r.peak_db_c : null,
      leq_db_a: r.leq_db_a != null && r.leq_db_a !== '' ? r.leq_db_a : null,
      note: String(r.note || '').trim(),
    };
  }

  function postazioneRumoreForTemplate(row) {
    const p = normalizePostazioneRumore(row);
    return {
      POSTAZIONE: p.postazione,
      PEAK_DB_C: formatNumRumore(p.peak_db_c),
      LEQ_DB_A: formatNumRumore(p.leq_db_a),
      NOTE_POSTAZIONE: p.note,
    };
  }

  /** Righe tabella §10 da tutte le sessioni rumore (dettaglio_rumore.postazioni). */
  function rilevamentiRumoreToMisure(rilevamenti) {
    const out = [];
    for (const r of filterRilevamentiRumore(rilevamenti)) {
      const posts = r.dettaglio_rumore?.postazioni;
      if (!Array.isArray(posts) || !posts.length) continue;
      posts.forEach((p) => {
        const norm = normalizePostazioneRumore(p);
        if (!norm.postazione) return;
        out.push(postazioneRumoreForTemplate(norm));
      });
    }
    return out;
  }

  function normalizeProfiliAzienda(list) {
    const out = [];
    const seen = new Set();
    for (const item of list || []) {
      const nome = String(item?.nome || item?.nome_profilo || '').trim();
      const id = String(item?.id || item?.profilo_id || '').trim();
      if (!nome || item?.attivo === false) continue;
      if (seen.has(id || nome)) continue;
      seen.add(id || nome);
      out.push({ id, nome });
    }
    out.sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
    return out;
  }

  /** Gruppi omogenei §7.1: una riga per profilo azienda, flag incluso nel documento. */
  function mergeGruppiOmogeneiWizard(wizard, profiliAzienda) {
    const catalog = normalizeProfiliAzienda(profiliAzienda || wizard?._profili_azienda || []);
    const incoming = Array.isArray(wizard?.gruppi_omogenei) ? wizard.gruppi_omogenei : [];
    const byId = new Map(
      incoming.map((r) => [String(r.profilo_id || r.id || '').trim(), r])
    );

    return catalog.map((p) => {
      const saved = byId.get(p.id);
      const incluso = saved != null ? saved.incluso !== false : true;
      return { profilo_id: p.id, id: p.id, nome: p.nome, incluso };
    });
  }

  function listaGruppiOmogeneiForTemplate(wizard, profiliAzienda) {
    return mergeGruppiOmogeneiWizard(wizard, profiliAzienda)
      .filter((r) => r.incluso)
      .map((r) => r.nome)
      .join('\n');
  }

  function gruppiOmogeneiForTemplate(wizard, profiliAzienda) {
    return mergeGruppiOmogeneiWizard(wizard, profiliAzienda)
      .filter((r) => r.incluso)
      .map((r) => ({ NOME_GRUPPO: r.nome }));
  }

  function anagraficaFromAzienda(azienda) {
    const a = azienda || {};
    return {
      RAGIONE_SOCIALE: a.ragione_sociale || '',
      SEDE_OPERATIVA: a.sede_operativa || '',
      PARTITA_IVA: a.partita_iva || '',
      CODICE_FISCALE: a.codice_fiscale || '',
      SEDE_LEGALE: a.sede_legale || '',
      OGGETTO_SOCIALE: a.oggetto_sociale || '',
      ISCRIZIONE_CCIAA: a.iscrizione_cciaa || '',
      CODICE_ATECO: a.codice_ateco || '',
      MACROSETTORE_RISCHIO: a.macrosettore_rischio || '',
      POSIZIONE_INAIL: a.posizione_inail || '',
      CCNL_APPLICATO: a.ccnl_applicato || '',
      DATORE_LAVORO: a.datore_lavoro || '',
      DATA_NOMINA_DDL: formatDateIt(a.data_nomina_ddl),
      RSPP: a.rspp || '',
      DATA_NOMINA_RSPP: formatDateIt(a.data_nomina_rspp),
      MEDICO_COMPETENTE: a.medico_competente || '',
      RLS: a.rls || '',
      NUM_DIPENDENTI: a.num_dipendenti != null ? String(a.num_dipendenti) : '',
      DESCRIZIONE_SITO: a.descrizione_sito || '',
    };
  }

  function buildData(azienda, rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const anag = anagraficaFromAzienda(azienda);
    const profili = normalizeProfiliAzienda(w.profili_azienda || []);

    const redatto =
      w.redatto_da != null && String(w.redatto_da).trim()
        ? String(w.redatto_da).trim()
        : REDATTO_DA_DEFAULT;

    const testoAnalisi =
      w.testo_analisi_preliminare != null && String(w.testo_analisi_preliminare).trim()
        ? String(w.testo_analisi_preliminare).trim()
        : TESTO_ANALISI_PRELIMINARE_DEFAULT;

    const gruppiWizard = mergeGruppiOmogeneiWizard(w, profili);
    const misureRumore = rilevamentiRumoreToMisure(rilevamenti);

    return {
      ...anag,
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '12'),
      DATA_EMISSIONE: dataEmissione,
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      LOGO_PREVIEW_URL: w.logo_url || '',
      REDATTO_DA: redatto,
      TESTO_ANALISI_PRELIMINARE: testoAnalisi,
      LISTA_GRUPPI_OMOGENEI: listaGruppiOmogeneiForTemplate(w, profili),
      GRUPPI_OMOGENEI: gruppiOmogeneiForTemplate(w, profili),
      MISURE_RUMORE: misureRumore,
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _rilevamenti_rumore: filterRilevamentiRumore(rilevamenti),
      _misure_rumore: misureRumore,
      _profili_azienda: profili,
      _gruppi_omogenei: gruppiWizard,
      _rumore_wizard: { ...w, gruppi_omogenei: gruppiWizard },
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '12';

    const redatto =
      w.redatto_da != null ? String(w.redatto_da).trim() : base.REDATTO_DA || REDATTO_DA_DEFAULT;

    const testoAnalisi =
      w.testo_analisi_preliminare != null
        ? String(w.testo_analisi_preliminare).trim()
        : base.TESTO_ANALISI_PRELIMINARE || TESTO_ANALISI_PRELIMINARE_DEFAULT;

    const profili = normalizeProfiliAzienda(w.profili_azienda || base._profili_azienda);
    const gruppiWizard = mergeGruppiOmogeneiWizard(
      { gruppi_omogenei: w.gruppi_omogenei, _profili_azienda: profili },
      profili
    );
    const wizMerged = { ...w, gruppi_omogenei: gruppiWizard };

    return {
      ...base,
      MODULO_NUMERO: modNum,
      REDATTO_DA: redatto,
      TESTO_ANALISI_PRELIMINARE: testoAnalisi,
      LISTA_GRUPPI_OMOGENEI: listaGruppiOmogeneiForTemplate(wizMerged, profili),
      GRUPPI_OMOGENEI: gruppiOmogeneiForTemplate(wizMerged, profili),
      MISURE_RUMORE: base._misure_rumore || base.MISURE_RUMORE || [],
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      _profili_azienda: profili,
      _gruppi_omogenei: gruppiWizard,
      _rumore_wizard: wizMerged,
    };
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    if (!String(data.REDATTO_DA || '').trim()) {
      errors.push('§1 Premessa: indicare chi ha redatto la valutazione');
    }
    if (!String(data.TESTO_ANALISI_PRELIMINARE || '').trim()) {
      errors.push('§4 Analisi preliminare: testo conclusione mancante');
    }
    const profili = data._profili_azienda || [];
    const gruppi = data._gruppi_omogenei || [];
    if (profili.length && !gruppi.some((g) => g.incluso)) {
      errors.push('§7.1: selezionare almeno un gruppo omogeneo');
    }
    if (profili.length && !String(data.LISTA_GRUPPI_OMOGENEI || '').trim()) {
      errors.push('§7.1: lista gruppi omogenei vuota');
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

    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (k === 'LOGO_PREVIEW_URL') continue;
      if (Array.isArray(v)) {
        templateData[k] = v;
        continue;
      }
      templateData[k] = templateValue(v);
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
    doc.setData(templateData);
    try {
      doc.render();
    } catch (err) {
      const msg = repair?.formatDocxtemplaterErrors
        ? repair.formatDocxtemplaterErrors(err)
        : (err.properties?.errors
          ? err.properties.errors.map((e) => e.message).join('; ')
          : err.message);
      throw new Error('Errore rendering template rumore: ' + msg);
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
    REDATTO_DA_DEFAULT,
    TESTO_ANALISI_PRELIMINARE_DEFAULT,
    filterRilevamentiRumore,
    rilevamentiRumoreToMisure,
    isTipoRumoreCatalogo,
    normalizeProfiliAzienda,
    mergeGruppiOmogeneiWizard,
    listaGruppiOmogeneiForTemplate,
    gruppiOmogeneiForTemplate,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
