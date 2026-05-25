/**
 * Adapter MOD_GAS_RADON — Monitoraggio gas radon (scaffold iniziale).
 */
(function () {
  'use strict';

  const CODICE = 'MOD_GAS_RADON';
  const NOME = 'Monitoraggio gas radon';

  const UNITA_DEFAULT = 'Bq/m³';
  const PERIODO_RILEVAMENTO_DEFAULT = 'gennaio 2018 e dicembre 2019';
  const LABORATORIO_DOSIMETRIA_DEFAULT = 'laboratorio di dosimetria della LB SERVIZI S.r.l.';
  const LIMITE_RADON_BQ = 300;

  const TESTO_CONCLUSIONI_CONFORME =
    'Per nessuno dei punti oggetto della presente indagine è stato superato il livello d\u2019azione (300 Bq/m\u00b3) non sono pertanto necessarie ulteriori azioni, avendo l\u2019esercente dei locali monitorati assolto a tutti gli obblighi previsti in materia di radioprotezione dalle radiazioni di origine naturale.\n'
    + 'Ad ogni buon conto, al fine di mantenere costantemente sotto controllo tale rischio è da considerarsi aspetto prioritario la manutenzione ordinaria degli impianti atti a garantire adeguati ricambi di aria per tutti gli ambienti interrati e seminterrati.\n'
    + 'Si fa infine presente come tale valutazione debba essere ripetuta ogni otto anni e ogniqualvolta siano realizzati gli interventi che comportano lavori strutturali a livello dell\u2019attacco a terra nonché gli interventi volti a migliorare l\u2019isolamento termico.';

  const TESTO_INTERVENTO_SUPERAMENTO_DEFAULT =
    'Ad ogni buon conto, in seguito ai risultati trasmessi del primo e nel secondo periodo di misurazione, la società {{RAGIONE_SOCIALE}} ha deciso, dopo aver consultato un Esperto in interventi di risanamento, di adottare un intervento finalizzato a ridurre ulteriormente il rischio ovvero installando un apposito impianto di immissione/estrazione aria, installando membrana antiradon e provvedendo alla manutenzione della pavimentazione con stuccatura delle crepe.';

  const TESTO_MISURE_CORRETTIVE_DEFAULT =
    'La Direzione aziendale attuerà misure correttive intese a ridurre le concentrazioni al livello più basso ragionevolmente ottenibile, avvalendosi dell\u2019\u201cesperto in interventi di risanamento radon\u201d, tenendo conto dello stato delle conoscenze tecniche e dei fattori economici e sociali. Dette misure di risanamento saranno completate entro due anni dal rilascio della relazione tecnica (rilasciata dai Servizi di Dosimetria) e saranno verificate, sotto il profilo dell\u2019efficacia, mediante nuova misurazione. Al fine di garantire il mantenimento nel tempo dell\u2019efficacia delle misure correttive le indagini radon verranno ripetute con cadenza quadriennale in conformità con le disposizioni del D.Lgs. 101/20.\n'
    + 'Ad ogni buon conto, al fine di mantenere costantemente sotto controllo tale rischio è da considerarsi aspetto prioritario la manutenzione ordinaria degli impianti atti a garantire adeguati ricambi di aria per tutti gli ambienti interrati e seminterrati.';

  function normalizePeriodoRilevamento(v) {
    const s = v != null ? String(v).trim() : '';
    return s || PERIODO_RILEVAMENTO_DEFAULT;
  }

  function normalizeLaboratorioDosimetria(v) {
    const s = v != null ? String(v).trim() : '';
    return s || LABORATORIO_DOSIMETRIA_DEFAULT;
  }

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

  function formatItalianoMisura(raw, unitHint) {
    if (raw == null || raw === '') return '';
    const num = Number(raw);
    if (!Number.isFinite(num)) return String(raw).trim();
    const s = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    const u = unitHint != null && String(unitHint).trim() !== '' ? String(unitHint).trim() : '';
    return u ? s + '\u202f' + u : s;
  }

  function isTipoRadonCatalogo(nomeTipo) {
    const n = String(nomeTipo || '').trim().toLowerCase();
    return n.includes('radon') || n.includes('gas radon');
  }

  function filterRilevamentiRadon(rilevamenti) {
    return (rilevamenti || []).filter((r) => isTipoRadonCatalogo(r.tipo_rilevamento?.nome_tipo));
  }

  function emptyLocaleRadon() {
    return {
      locale: '',
      rilevatore: '',
      periodo_1: '',
      periodo_2: '',
      periodo_3: '',
      media_annuale: '',
    };
  }

  function normalizeLocaleRadon(r) {
    const e = emptyLocaleRadon();
    const o = r || {};
    Object.keys(e).forEach((k) => {
      const v = o[k];
      e[k] = v != null && v !== undefined ? String(v) : '';
    });
    return e;
  }

  function formatNumRadon(v) {
    if (v == null || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v).trim();
    return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n);
  }

  function localeRadonFromDettaglio(loc) {
    const row = normalizeLocaleRadon(loc);
    row.periodo_1 = formatNumRadon(loc.periodo_1);
    row.periodo_2 = formatNumRadon(loc.periodo_2);
    row.periodo_3 = formatNumRadon(loc.periodo_3);
    row.media_annuale = formatNumRadon(loc.media_annuale);
    return row;
  }

  function rilevamentiRadonToLocali(rilevamenti) {
    const out = [];
    for (const r of filterRilevamentiRadon(rilevamenti)) {
      const det = r.dettaglio_radon;
      const locali = det?.locali;
      if (Array.isArray(locali) && locali.length) {
        locali.forEach((loc) => out.push(localeRadonFromDettaglio(loc)));
      }
    }
    return out;
  }

  function mergeRigheRadonWizard(wizard, rilevamenti) {
    const incoming = wizard?.righe_radon;
    if (Array.isArray(incoming) && incoming.length) {
      return incoming.map(normalizeLocaleRadon);
    }
    const fromDb = rilevamentiRadonToLocali(rilevamenti);
    return fromDb.length ? fromDb : [emptyLocaleRadon()];
  }

  function parseMediaAnnuaValue(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v).replace(/\u202f/g, '').replace(/\s/g, '').replace(',', '.');
    const m = s.match(/[\d.]+/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function resolvePianoFromRilevamenti(rilevamenti) {
    for (const r of filterRilevamentiRadon(rilevamenti)) {
      const p = r.dettaglio_radon?.piano ?? r.zona;
      if (p != null && String(p).trim()) return String(p).trim();
    }
    return '';
  }

  function analizzaMedieRadon(righe) {
    const superati = [];
    const valide = [];
    for (const row of righe || []) {
      const locale = String(row.locale || '').trim();
      if (!locale) continue;
      const media = parseMediaAnnuaValue(row.media_annuale);
      if (media == null) continue;
      const item = { locale, media_annuale: media, media_fmt: formatNumRadon(media) };
      valide.push(item);
      if (media >= LIMITE_RADON_BQ) superati.push(item);
    }
    const tuttiConformi = valide.length > 0 && superati.length === 0;
    return { tuttiConformi, superati, valide };
  }

  function labelLocaleSuperamento(loc) {
    const name = String(loc.locale || '').trim();
    const idMatch = name.match(/\(ID\s*=\s*([^)]+)\)/i);
    if (idMatch) {
      const area = name.replace(/\(ID\s*=[^)]*\)/i, '').trim() || name;
      return 'ID=' + idMatch[1] + ' «' + area + '»';
    }
    return '«' + name + '»';
  }

  function buildTestoIntroConclusioni(periodo, piano, ragioneSociale, sedeOperativa) {
    return (
      'La misura delle concentrazioni di Gas Radon è stata condotta nel periodo '
      + periodo
      + ' presso il piano '
      + piano
      + ' della '
      + ragioneSociale
      + ' con sede in '
      + sedeOperativa
      + '. L\u2019analisi dei dati ottenuti in termini di concentrazione media annuale di gas Radon (Bq/m\u00b3) evidenzia i seguenti risultati:'
    );
  }

  function fillRagioneSocialeInTesto(testo, ragioneSociale) {
    return String(testo || '').replace(/\{\{RAGIONE_SOCIALE\}\}/g, ragioneSociale || '');
  }

  function buildTestoSuperamentoNucleo(superati, ragioneSociale, interventoOverride) {
    const elenco = superati.map(labelLocaleSuperamento).join('; ');
    const blocco1 =
      'Per la maggior parte delle aree oggetto della presente indagine non si è riscontrato alcun superamento del livello d\u2019azione (300 Bq/m\u00b3). Solo per gli ambienti indicati come '
      + elenco
      + ' si è riscontrata una concentrazione media annuale di gas Radon superiore a tale valore di azione.\n'
      + 'Analizzando nel dettaglio le caratteristiche di tali ambienti e la reale permanenza del personale all\u2019interno degli stessi si può dedurre come il rischio sia da ritenersi trascurabile in quanto i tempi di permanenza del personale all\u2019interno delle aree interessate siano nettamente inferiori alle 10 ore mensili per tutti i lavoratori.\n';
    const intervento = fillRagioneSocialeInTesto(
      interventoOverride != null && String(interventoOverride).trim()
        ? String(interventoOverride).trim()
        : TESTO_INTERVENTO_SUPERAMENTO_DEFAULT,
      ragioneSociale
    );
    return blocco1 + intervento + '\n\n' + TESTO_MISURE_CORRETTIVE_DEFAULT;
  }

  function buildConclusioniBundle(azienda, rilevamenti, wizard) {
    const w = wizard || {};
    const righe = mergeRigheRadonWizard(w, rilevamenti);
    const analisi = analizzaMedieRadon(righe);
    const periodo = normalizePeriodoRilevamento(w.periodo_rilevamento);
    const piano = String(w.piano_rilevamento || '').trim() || resolvePianoFromRilevamenti(rilevamenti);
    const ragione = azienda?.ragione_sociale || '';
    const sede = azienda?.sede_operativa || '';

    const intro =
      w.testo_conclusioni_intro != null && String(w.testo_conclusioni_intro).trim()
        ? String(w.testo_conclusioni_intro).trim()
        : buildTestoIntroConclusioni(periodo, piano, ragione, sede);

    let esito;
    if (analisi.tuttiConformi) {
      esito =
        w.testo_conclusioni_esito != null && String(w.testo_conclusioni_esito).trim()
          ? String(w.testo_conclusioni_esito).trim()
          : TESTO_CONCLUSIONI_CONFORME;
    } else if (analisi.superati.length) {
      esito =
        w.testo_conclusioni_esito != null && String(w.testo_conclusioni_esito).trim()
          ? String(w.testo_conclusioni_esito).trim()
          : buildTestoSuperamentoNucleo(analisi.superati, ragione, w.testo_intervento_superamento);
    } else {
      esito =
        w.testo_conclusioni_esito != null && String(w.testo_conclusioni_esito).trim()
          ? String(w.testo_conclusioni_esito).trim()
          : TESTO_CONCLUSIONI_CONFORME;
    }

    return {
      PIANO_RILEVAMENTO: piano,
      PERIODO_RILEVAMENTO: periodo,
      TESTO_CONCLUSIONI_INTRO: intro,
      TESTO_CONCLUSIONI_ESITO: esito,
      TESTO_CONCLUSIONI: intro + '\n\n' + esito,
      _radon_tutti_conformi: analisi.tuttiConformi,
      _radon_superati: analisi.superati,
      _radon_analisi_valide: analisi.valide,
    };
  }

  function righeRadonForTemplate(wizard, rilevamenti) {
    return mergeRigheRadonWizard(wizard, rilevamenti).map((r, i) => ({
      RIGA_N: String(i + 1),
      LOCALE: r.locale,
      RILEVATORE: r.rilevatore,
      PERIODO_1: r.periodo_1,
      PERIODO_2: r.periodo_2,
      PERIODO_3: r.periodo_3,
      MEDIA_ANNUALE: r.media_annuale,
    }));
  }

  function buildData(azienda, rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const righe = righeRadonForTemplate(w, rilevamenti);
    const conclusioni = buildConclusioniBundle(azienda, rilevamenti, w);

    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '22'),
      DATA_EMISSIONE: dataEmissione,
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      LOGO_PREVIEW_URL: w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      PERIODO_RILEVAMENTO: conclusioni.PERIODO_RILEVAMENTO,
      PIANO_RILEVAMENTO: conclusioni.PIANO_RILEVAMENTO,
      LABORATORIO_DOSIMETRIA: normalizeLaboratorioDosimetria(w.laboratorio_dosimetria),
      TESTO_CONCLUSIONI_INTRO: conclusioni.TESTO_CONCLUSIONI_INTRO,
      TESTO_CONCLUSIONI_ESITO: conclusioni.TESTO_CONCLUSIONI_ESITO,
      TESTO_CONCLUSIONI: conclusioni.TESTO_CONCLUSIONI,
      RIGHE_RADON: righe,
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _righe_radon: mergeRigheRadonWizard(w, rilevamenti),
      _rilevamenti_radon: filterRilevamentiRadon(rilevamenti),
      _radon_tutti_conformi: conclusioni._radon_tutti_conformi,
      _radon_superati: conclusioni._radon_superati,
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '22';
    const righe = righeRadonForTemplate(w, base._rilevamenti_radon);
    const fakeAzienda = {
      ragione_sociale: base.RAGIONE_SOCIALE,
      sede_operativa: base.SEDE_OPERATIVA,
    };
    const conclusioni = buildConclusioniBundle(fakeAzienda, base._rilevamenti_radon, {
      ...w,
      righe_radon: mergeRigheRadonWizard(w, base._rilevamenti_radon),
    });

    return {
      ...base,
      MODULO_NUMERO: modNum,
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      PERIODO_RILEVAMENTO: conclusioni.PERIODO_RILEVAMENTO,
      PIANO_RILEVAMENTO: conclusioni.PIANO_RILEVAMENTO,
      LABORATORIO_DOSIMETRIA:
        w.laboratorio_dosimetria != null
          ? normalizeLaboratorioDosimetria(w.laboratorio_dosimetria)
          : base.LABORATORIO_DOSIMETRIA || LABORATORIO_DOSIMETRIA_DEFAULT,
      TESTO_CONCLUSIONI_INTRO: conclusioni.TESTO_CONCLUSIONI_INTRO,
      TESTO_CONCLUSIONI_ESITO: conclusioni.TESTO_CONCLUSIONI_ESITO,
      TESTO_CONCLUSIONI: conclusioni.TESTO_CONCLUSIONI,
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      RIGHE_RADON: righe,
      _righe_radon: mergeRigheRadonWizard(w, base._rilevamenti_radon),
      _radon_tutti_conformi: conclusioni._radon_tutti_conformi,
      _radon_superati: conclusioni._radon_superati,
      _radon_wizard: { ...w },
    };
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    if (!String(data.PERIODO_RILEVAMENTO || '').trim()) {
      errors.push('§1 Premessa: periodo del rilievo mancante');
    }
    if (!String(data.LABORATORIO_DOSIMETRIA || '').trim()) {
      errors.push('§7 Risultati: nome laboratorio di dosimetria mancante');
    }
    const righe = data._righe_radon || data.RIGHE_RADON || [];
    const conLocale = righe.filter((r) => String(r.locale || r.LOCALE || '').trim());
    if (!conLocale.length) {
      errors.push('Inserire almeno un locale di misura radon (da Rilevamenti o wizard)');
    }
    if (!String(data.PIANO_RILEVAMENTO || '').trim()) {
      errors.push('§8 Conclusioni: indicare il piano (da Rilevamenti o wizard)');
    }
    if (!String(data.TESTO_CONCLUSIONI_ESITO || data.TESTO_CONCLUSIONI || '').trim()) {
      errors.push('§8 Conclusioni: testo esito mancante');
    }
    const analisi = analizzaMedieRadon(data._righe_radon || []);
    if (!analisi.valide.length) {
      errors.push('§8 Conclusioni: inserire almeno una media annuale nella tabella');
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
      if (k === 'RIGHE_RADON' && Array.isArray(v)) {
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
      throw new Error('Errore rendering template radon: ' + msg);
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
    PERIODO_RILEVAMENTO_DEFAULT,
    LABORATORIO_DOSIMETRIA_DEFAULT,
    normalizePeriodoRilevamento,
    normalizeLaboratorioDosimetria,
    filterRilevamentiRadon,
    mergeRigheRadonWizard,
    righeRadonForTemplate,
    parseMediaAnnuaValue,
    resolvePianoFromRilevamenti,
    analizzaMedieRadon,
    buildConclusioniBundle,
    TESTO_CONCLUSIONI_CONFORME,
    TESTO_INTERVENTO_SUPERAMENTO_DEFAULT,
    TESTO_MISURE_CORRETTIVE_DEFAULT,
    LIMITE_RADON_BQ,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
