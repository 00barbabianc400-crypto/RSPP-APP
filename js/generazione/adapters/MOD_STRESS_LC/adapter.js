/**
 * Adapter MOD_STRESS_LC — Valutazione rischio stress lavoro-correlato.
 * Valutazione stress lavoro-correlato: questionario Excel, testi condizionali, DOCX.
 */
(function () {
  'use strict';

  const CODICE = 'MOD_STRESS_LC';
  const NOME = 'Valutazione del rischio stress lavoro correlato';

  /** §6.1.3 — Cronoprogramma: solo colonna «Data attuazione» (tag → valore operatore). */
  const CRONOPROGRAMMA_ROWS = [
    { tag: 'CRONO_DATA_01', fase: 'FASE PROPEDEUTICA', attivita: 'Costituzione Gruppo di lavoro', default: '' },
    { tag: 'CRONO_DATA_02', fase: '', attivita: 'Sviluppo strategia comunicativa e di coinvolgimento', default: '' },
    { tag: 'CRONO_DATA_03', fase: '', attivita: 'Sensibilizzazione ed informazione', default: '' },
    { tag: 'CRONO_DATA_04', fase: '', attivita: 'Piano di valutazione del Rischio', default: '' },
    { tag: 'CRONO_DATA_05', fase: '', attivita: 'Individuazione gruppi omogenei', default: '' },
    { tag: 'CRONO_DATA_06', fase: 'FASE PRELIMINARE', attivita: 'Lista di controllo ed analisi risultati', default: '' },
    { tag: 'CRONO_DATA_07', fase: '', attivita: 'Piano di monitoraggio', default: '' },
    { tag: 'CRONO_DATA_08', fase: '', attivita: 'Verifica efficacia interventi correttivi', default: '' },
    { tag: 'CRONO_DATA_09', fase: 'FASE APPROFONDITA', attivita: 'Somministrazione Questionario / Focus group', default: 'Non applicabile' },
    { tag: 'CRONO_DATA_10', fase: '', attivita: 'Analisi dei risultati', default: 'Non applicabile' },
    { tag: 'CRONO_DATA_11', fase: 'FASE PIANIFICAZIONE INTERVENTI', attivita: 'Pianificazione interventi correttivi', default: '' },
    { tag: 'CRONO_DATA_12', fase: '', attivita: 'Verifica efficacia interventi correttivi', default: '' },
  ];

  function defaultCronoprogrammaMap() {
    const m = {};
    for (const row of CRONOPROGRAMMA_ROWS) m[row.tag] = row.default;
    return m;
  }

  function cronoprogrammaTemplateFields(wizard, base) {
    const w = wizard || {};
    const cron = w.cronoprogramma && typeof w.cronoprogramma === 'object' ? w.cronoprogramma : {};
    const out = {};
    for (const row of CRONOPROGRAMMA_ROWS) {
      const raw = cron[row.tag] != null ? cron[row.tag] : (base && base[row.tag] != null ? base[row.tag] : row.default);
      out[row.tag] = String(raw ?? '').trim();
    }
    return out;
  }

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  function luogoDaSede(sede) {
    const s = sede || '';
    const match = s.match(/,\s*([A-Z]{2})\s*$/);
    if (match) return match[1];
    const parts = s.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : 'Roma';
  }

  function formatModuloNumeroFromWizard(w) {
    const raw = w?.modulo_numero != null && w.modulo_numero !== ''
      ? String(w.modulo_numero).trim()
      : '1';
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return '01';
    return String(n).padStart(2, '0');
  }

  const GRUPPI_OMOGENEI_GENERALE_DEFAULT =
    'Si è ritenuto valido operare l\'analisi del rischio stress lavoro-correlato senza definire specificamente '
    + 'gruppi omogenei di lavoratori distinti, in considerazione dell\'omogeneità delle mansioni svolte, '
    + 'delle modalità organizzative dell\'unità produttiva e dell\'esposizione complessiva ai fattori di rischio '
    + 'psicosociale oggetto della presente valutazione.';

  /** Nomi profilo → elenco multiriga (cella tabella / modalità elenco). */
  function testoGruppiOmogenei(profiliNomi) {
    const list = (profiliNomi || [])
      .map((n) => String(n).trim())
      .filter(Boolean);
    const uniq = [...new Set(list)];
    uniq.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
    return uniq.join('\n');
  }

  /** Corpo §6.1.2 (senza titolo «6.1.2») per {{SEZIONE_612_GRUPPI_OMOGENEI}}. */
  function buildSezione612GruppiOmogenei(ragioneSociale, modalita, elencoTesto, generaleTesto) {
    const rs = String(ragioneSociale || '').trim();
    if (modalita === 'generale') {
      const intro =
        'Il personale della ' + rs + ' è stato considerato nel suo complesso ai fini della presente '
        + 'valutazione del rischio stress lavoro-correlato.';
      const mid = String(generaleTesto || GRUPPI_OMOGENEI_GENERALE_DEFAULT).trim();
      return intro + '\n\n' + mid;
    }
    const intro =
      'Il personale della ' + rs + ' è distribuito nelle differenti mansioni di seguito specificate. '
      + 'Il personale viene suddiviso con lo scopo di individuare dei gruppi omogenei di lavoratori, '
      + 'sulla base delle mansioni svolte alla luce del loro inquadramento, per i quali è ragionevole supporre '
      + 'lo stesso genere di rischi occupazionali (incidenti e/o malattie professionali).';
    return intro;
  }

  function gruppiOmogeneiFields(wizard, base) {
    const w = wizard || {};
    const b = base || {};
    const modalita = w.gruppi_omogenei_modalita === 'generale' ? 'generale' : 'elenco';
    const profiliDefault = testoGruppiOmogenei(b._profili_nomi);
    const elenco =
      w.gruppi_omogenei_elenco != null
        ? String(w.gruppi_omogenei_elenco).trim()
        : String(b.GRUPPI_OMOGENEI_TESTO || profiliDefault).trim();
    const generale =
      w.gruppi_omogenei_generale_testo != null
        ? String(w.gruppi_omogenei_generale_testo).trim()
        : GRUPPI_OMOGENEI_GENERALE_DEFAULT;
    const rs = b.RAGIONE_SOCIALE || '';
    return {
      GRUPPI_OMOGENEI_TESTO: modalita === 'elenco' ? elenco : '',
      SEZIONE_612_GRUPPI_OMOGENEI: buildSezione612GruppiOmogenei(rs, modalita, elenco, generale),
      _gruppi_omogenei_modalita: modalita,
      _gruppi_omogenei_elenco_default: profiliDefault,
    };
  }

  function pickAziendaField(azienda, snake, pascal) {
    const a = azienda || {};
    const f = a.fields || {};
    for (const key of [snake, pascal]) {
      const v = a[key] != null ? a[key] : f[key];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  function campiAnagraficaComitato(azienda) {
    return {
      DATORE_LAVORO: pickAziendaField(azienda, 'datore_lavoro', 'DatoreLavoro'),
      RSPP: pickAziendaField(azienda, 'rspp', 'RSPP'),
      RLS: pickAziendaField(azienda, 'rls', 'RLS'),
      MEDICO_COMPETENTE: pickAziendaField(azienda, 'medico_competente', 'MedicoCompetente'),
    };
  }

  /** Dati già in forma tag Word (applyWizard); non sovrascrivere con pick su riga DB. */
  function campiAnagraficaForDocx(data, aziendaRow) {
    const fromRow = campiAnagraficaComitato(aziendaRow);
    return {
      DATORE_LAVORO: templateValue(data.DATORE_LAVORO) || fromRow.DATORE_LAVORO,
      RSPP: templateValue(data.RSPP) || fromRow.RSPP,
      RLS: templateValue(data.RLS) || fromRow.RLS,
      MEDICO_COMPETENTE: templateValue(data.MEDICO_COMPETENTE) || fromRow.MEDICO_COMPETENTE,
    };
  }

  function templateValue(v) {
    if (v == null || v === undefined) return '';
    return String(v);
  }

  function questionarioVuotoFields() {
    return {
      RISULTATI_LIVELLO_RISCHIO: '',
      RISULTATI_TESTO_ESITO: '',
      INTEGRATIVA_LIVELLO_RISCHIO: '',
      INTEGRATIVA_TESTO_ESITO: '',
      _risultati_livello_key: '',
      _integrativa_livello_key: '',
    };
  }

  const VALUTAZIONE_APPROFONDITA_DEFAULT =
    'A seguito della Valutazione preliminare, la quale ha evidenziato un rischio NON RILEVANTE, '
    + 'la Direzione aziendale non ha ritenuto opportuno procedere con una valutazione approfondita.\n\n'
    + 'Dalla valutazione del rischio eseguita non emergono situazioni degne di approfondimento.';

  const CONCLUSIONI_DEFAULT =
    'In conclusione, l\'analisi degli indicatori non evidenzia particolari condizioni organizzative '
    + 'che possono determinare la presenza di stress correlato a livelli rilevanti.\n\n'
    + 'In ogni caso data la rilevanza della problematica analizzata, la valutazione oggettiva dovrà essere '
    + 'ripetuta con cadenza biennale, e dovrà tener conto delle indicazioni che la prassi e la giurisprudenza '
    + 'forniranno a valle di questo primo approccio normativo alla problematica dello Stress Lavoro Correlato.';

  function tuttiRischiBassi(data) {
    const k1 = String(data?._risultati_livello_key || '').toUpperCase();
    const k2 = String(data?._integrativa_livello_key || '').toUpperCase();
    return k1 === 'BASSO' && k2 === 'BASSO';
  }

  function conclusioniFields(wizard, dataWithQuestionario) {
    const w = wizard || {};
    const d = dataWithQuestionario || {};
    if (!d._risultati_livello_key && !d._integrativa_livello_key) {
      return {
        CONCLUSIONI_TESTO: '',
        _conclusioni_auto: false,
      };
    }
    if (tuttiRischiBassi(d)) {
      return {
        CONCLUSIONI_TESTO: CONCLUSIONI_DEFAULT,
        _conclusioni_auto: true,
      };
    }
    const custom = w.conclusioni_testo != null
      ? String(w.conclusioni_testo).trim()
      : String(d.CONCLUSIONI_TESTO || '').trim();
    return {
      CONCLUSIONI_TESTO: custom,
      _conclusioni_auto: false,
    };
  }

  function valutazioneApprofonditaFields(wizard, dataWithQuestionario) {
    const w = wizard || {};
    const d = dataWithQuestionario || {};
    if (!d._risultati_livello_key && !d._integrativa_livello_key) {
      return {
        VALUTAZIONE_APPROFONDITA_TESTO: '',
        _valutazione_approfondita_auto: false,
      };
    }
    if (tuttiRischiBassi(d)) {
      return {
        VALUTAZIONE_APPROFONDITA_TESTO: VALUTAZIONE_APPROFONDITA_DEFAULT,
        _valutazione_approfondita_auto: true,
      };
    }
    const custom = w.valutazione_approfondita_testo != null
      ? String(w.valutazione_approfondita_testo).trim()
      : String(d.VALUTAZIONE_APPROFONDITA_TESTO || '').trim();
    return {
      VALUTAZIONE_APPROFONDITA_TESTO: custom,
      _valutazione_approfondita_auto: false,
    };
  }

  function pianificazioneMisureFields(wizard) {
    const w = wizard || {};
    const defaults = window.GEN_STRESS_MISURE?.defaultMisureMap?.() || {};
    const raw = w.pianificazione_misure && typeof w.pianificazione_misure === 'object'
      ? w.pianificazione_misure
      : {};
    const build = window.GEN_STRESS_MISURE?.buildPianificazioneMisureElenco;
    return {
      PIANIFICAZIONE_INTERVENTI_MISURE: build ? build(raw) : '',
      _pianificazione_misure_defaults: defaults,
    };
  }

  function questionarioFieldsFromWizard(wizard, base) {
    const w = wizard || {};
    const esiti = w.questionario_esiti && typeof w.questionario_esiti === 'object'
      ? w.questionario_esiti
      : null;
    if (esiti?.fields) {
      return { ...esiti.fields };
    }
    if (esiti && window.GEN_STRESS_XLSX?.esitiToTemplateFields) {
      const f = window.GEN_STRESS_XLSX.esitiToTemplateFields(esiti.risultati, esiti.integrativa);
      if (esiti.pianificazione) {
        f.PIANIFICAZIONE_INTERVENTI_ELENCO = esiti.pianificazione.testo || '';
        f._pianificazione_dettaglio = esiti.pianificazione;
      }
      return f;
    }
    if (base && base.RISULTATI_LIVELLO_RISCHIO) {
      return {
        RISULTATI_LIVELLO_RISCHIO: base.RISULTATI_LIVELLO_RISCHIO || '',
        RISULTATI_TESTO_ESITO: base.RISULTATI_TESTO_ESITO || '',
        INTEGRATIVA_LIVELLO_RISCHIO: base.INTEGRATIVA_LIVELLO_RISCHIO || '',
        INTEGRATIVA_TESTO_ESITO: base.INTEGRATIVA_TESTO_ESITO || '',
        _risultati_livello_key: base._risultati_livello_key || '',
        _integrativa_livello_key: base._integrativa_livello_key || '',
      };
    }
    return questionarioVuotoFields();
  }

  function formatModuloNumeroFromWizardOverride(w, base) {
    if (w.modulo_numero !== undefined) {
      const raw = String(w.modulo_numero ?? '').trim();
      if (raw === '') return '';
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) return String(n).padStart(2, '0');
      return '';
    }
    return base.MODULO_NUMERO || '01';
  }

  function buildData(azienda, rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const profiliNomi = Array.isArray(w.profili_nomi) ? w.profili_nomi : [];

    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      ...campiAnagraficaComitato(azienda),
      ...gruppiOmogeneiFields(
        {
          gruppi_omogenei_modalita: w.gruppi_omogenei_modalita || 'elenco',
          gruppi_omogenei_elenco: w.gruppi_omogenei_elenco,
          gruppi_omogenei_generale_testo: w.gruppi_omogenei_generale_testo,
        },
        { RAGIONE_SOCIALE: azienda?.ragione_sociale || '', _profili_nomi: profiliNomi }
      ),
      ...cronoprogrammaTemplateFields(w, null),
      ...questionarioVuotoFields(),
      VALUTAZIONE_APPROFONDITA_TESTO: '',
      _valutazione_approfondita_auto: false,
      CONCLUSIONI_TESTO: '',
      _conclusioni_auto: false,
      PIANIFICAZIONE_INTERVENTI_ELENCO: '',
      PIANIFICAZIONE_INTERVENTI_MISURE: '',
      _pianificazione_dettaglio: null,
      _pianificazione_misure_defaults: null,
      LOGO_PREVIEW_URL: w.logo_url || '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      MODULO_NUMERO: formatModuloNumeroFromWizard(w),
      DATA_EMISSIONE: dataEmissione,
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      TESTO_DIREZIONE_PROPRIETARIO:
        w.testo_direzione_proprietario != null && String(w.testo_direzione_proprietario).trim() !== ''
          ? String(w.testo_direzione_proprietario).trim()
          : 'della società',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      _rilevamenti: rilevamenti || [],
      _profili_nomi: profiliNomi,
      _azienda_row: azienda || null,
      _cronoprogramma_defaults: defaultCronoprogrammaMap(),
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const withQuestionario = {
      ...base,
      ...questionarioFieldsFromWizard(w, base),
    };
    const withValutazione = {
      ...withQuestionario,
      ...valutazioneApprofonditaFields(w, withQuestionario),
      ...conclusioniFields(w, withQuestionario),
    };
    return {
      ...withValutazione,
      ...pianificazioneMisureFields(w),
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      MODULO_NUMERO: formatModuloNumeroFromWizardOverride(w, base),
      TESTO_DIREZIONE_PROPRIETARIO:
        w.testo_direzione_proprietario != null
          ? String(w.testo_direzione_proprietario).trim()
          : base.TESTO_DIREZIONE_PROPRIETARIO || 'della società',
      ...cronoprogrammaTemplateFields(w, base),
      ...gruppiOmogeneiFields(w, withValutazione),
      _stress_wizard: { ...w },
    };
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    for (const row of CRONOPROGRAMMA_ROWS) {
      const v = data[row.tag];
      if (v == null || !String(v).trim()) {
        errors.push('Cronoprogramma: data attuazione mancante — ' + row.attivita);
        break;
      }
    }
    if (!data.RISULTATI_LIVELLO_RISCHIO || !String(data.RISULTATI_TESTO_ESITO || '').trim()) {
      errors.push('§6.2: carica il questionario Excel (esiti foglio RISULTATI)');
    }
    if (!data.INTEGRATIVA_LIVELLO_RISCHIO || !String(data.INTEGRATIVA_TESTO_ESITO || '').trim()) {
      errors.push('§6.2: carica il questionario Excel (esiti foglio INTEGRATIVA)');
    }
    if (!data._valutazione_approfondita_auto && !String(data.VALUTAZIONE_APPROFONDITA_TESTO || '').trim()) {
      errors.push('§6.3: compila il testo della valutazione approfondita (rischio medio/alto)');
    }
    if (!data._conclusioni_auto && !String(data.CONCLUSIONI_TESTO || '').trim()) {
      errors.push('Conclusioni: compila il testo (rischio medio/alto)');
    }
    if (!String(data.SEZIONE_612_GRUPPI_OMOGENEI || '').trim()) {
      errors.push('§6.1.2: individuazione gruppi omogenei non compilata');
    }
    if (data._gruppi_omogenei_modalita === 'elenco' && !String(data.GRUPPI_OMOGENEI_TESTO || '').trim()) {
      errors.push('§6.1.2: inserire almeno una mansione/gruppo omogeneo (modalità elenco)');
    }
    return errors;
  }

  function getCronoprogrammaRows() {
    return CRONOPROGRAMMA_ROWS.slice();
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
      templateData[k] = templateValue(v);
    }
    Object.assign(templateData, campiAnagraficaForDocx(data, data._azienda_row));

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const repair = window.GEN_DOCX_REPAIR;
    const issuesBefore = repair?.inspectDocxTemplate
      ? repair.inspectDocxTemplate(templateArrayBuffer)
      : [];
    if (issuesBefore.length) {
      console.warn('[MOD_STRESS_LC] Tag spezzati nel template:', issuesBefore.length, issuesBefore.slice(0, 5));
    }

    let zip = new window.PizZip(templateArrayBuffer);
    if (repair?.repairDocxTemplateZip) {
      zip = repair.repairDocxTemplateZip(zip, []);
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
      throw new Error('Errore rendering template stress: ' + msg);
    }

    const outZip = doc.getZip();
    if (window.GEN_STRESS_DOCX_GRUPPI_612?.applyGruppiOmogenei612ToZip) {
      window.GEN_STRESS_DOCX_GRUPPI_612.applyGruppiOmogenei612ToZip(outZip, data);
    }
    if (window.GEN_STRESS_DOCX_COLOR?.applyRiskLevelCellShadingToZip) {
      window.GEN_STRESS_DOCX_COLOR.applyRiskLevelCellShadingToZip(outZip, data);
    }
    if (window.GEN_STRESS_DOCX_COLOR?.applyEsitoFourCellsLayout) {
      window.GEN_STRESS_DOCX_COLOR.applyEsitoFourCellsLayout(outZip, data);
    }
    if (window.GEN_STRESS_DOCX_COLOR?.applyPianificazioneBoldHeaders) {
      window.GEN_STRESS_DOCX_COLOR.applyPianificazioneBoldHeaders(outZip);
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
    VALUTAZIONE_APPROFONDITA_DEFAULT,
    CONCLUSIONI_DEFAULT,
    GRUPPI_OMOGENEI_GENERALE_DEFAULT,
    buildSezione612GruppiOmogenei,
    tuttiRischiBassi,
    CRONOPROGRAMMA_ROWS,
    getCronoprogrammaRows,
    defaultCronoprogrammaMap,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
