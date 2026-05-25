/**
 * Adapter VADEMECUM_ANTIRAPINA — Comportamenti in caso di furto o rapina.
 */
(function () {
  'use strict';

  const CODICE = 'VADEMECUM_ANTIRAPINA';
  const NOME = 'Vademecum antirapina';

  const TITOLO_DEFAULT = 'COMPORTAMENTI CONSIGLIATI IN CASO DI FURTO O RAPINA';

  const TESTO_INTRO_DEFAULT =
    'L\u2019esperienza e le statistiche hanno dimostrato che, nella realt\u00e0, i rischi di danni fisici per i lavoratori presenti ad una rapina sono bassi. Ci\u00f2 nonostante, la principale preoccupazione deve essere sempre quella di salvaguardare l\u2019incolumit\u00e0 dei lavoratori e delle persone presenti.';

  const DEFAULT_DURANTE_RAPINA = [
    {
      id: 'calma',
      testo:
        'mantenere e far mantenere innanzitutto la calma ai presenti e non fare nulla che possa provocare una reazione violenta dei rapinatori (si consiglia di respirare lentamente e profondamente) limitando al minimo i movimenti;',
      selezionato: true,
    },
    {
      id: 'non_opporsi',
      testo:
        'non opporsi agli ordini, ma allo stesso tempo, non eseguirli con eccessiva premura e cercando di ostentare sempre una grande calma;',
      selezionato: true,
    },
    {
      id: 'assecondare',
      testo:
        'assecondare le richieste del rapinatore, ivi compresa la consegna di oggetti/denaro di propriet\u00e0 aziendale o personale;',
      selezionato: true,
    },
    {
      id: 'telefono',
      testo:
        'non rispondere al telefono se non espressamente invitati a farlo, dai rapinatori;',
      selezionato: true,
    },
    {
      id: 'ostaggio',
      testo:
        'se \u00e8 stato presa una persona in ostaggio, fare di tutto per tranquillizzare la vittima e calmare l\u2019aggressore;',
      selezionato: true,
    },
    {
      id: 'fuga',
      testo:
        'non tentare mai di ostacolare la fuga ai rapinatori o bloccare la porta d\u2019uscita, potrebbero reagire con violenza e fare del male ai presenti.',
      selezionato: true,
    },
    {
      id: 'furto_apertura',
      testo:
        'Qualora i dipendenti, o personale di ditte esterne deputate all\u2019apertura dei locali, si trovassero di fronte ad uno scenario compatibile con quello di un furto avvenuto prima dell\u2019apertura della sede, essi dovranno abbandonare i locali senza indugi procedendo alla chiamata delle forze dell\u2019ordine. In particolare, dovranno astenersi dall\u2019ispezionare i locali per evitare di trovarsi di fronte eventuali malviventi ancora presenti in sede.',
      selezionato: true,
    },
  ];

  const DEFAULT_DOPO_RAPINA = [
    {
      id: 'forze_ordine',
      testo:
        'avvisare tempestivamente le Forze dell\u2019Ordine, fornendo telefonicamente le prime indicazioni su quanto accaduto, avendo cura di riferire pi\u00f9 particolari possibili circa l\u2019autore del reato, l\u2019eventuale mezzo utilizzato;',
      selezionato: true,
    },
    {
      id: 'testimoni',
      testo:
        'restare sul posto e invitare i testimoni dell\u2019evento a trattenersi fino all\u2019arrivo delle Forze dell\u2019Ordine;',
      selezionato: true,
    },
    {
      id: 'non_toccare',
      testo:
        'non toccare nulla ed evitare di calpestare/ripassare nelle parti segnate dal rapinatore;',
      selezionato: true,
    },
    {
      id: 'direzione',
      testo: 'avvisare i propri superiori e la Direzione Aziendale.',
      selezionato: true,
    },
  ];

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
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

  function formatDataRevisione(raw) {
    if (raw != null && String(raw).trim()) return String(raw).trim();
    const now = new Date();
    return now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function normalizeVoce(row, idx, fallback) {
    const fb = fallback || { id: 'v' + idx, testo: '', selezionato: true };
    return {
      id: String(row?.id || fb.id || 'v' + idx).trim(),
      testo:
        row != null && row.testo != null && String(row.testo).trim() !== ''
          ? String(row.testo).trim()
          : fb.testo,
      selezionato: row != null && row.selezionato === false ? false : fb.selezionato !== false,
    };
  }

  function mergeVociWizard(wizard, wizardKey, defaults) {
    const incoming = Array.isArray(wizard?.[wizardKey]) ? wizard[wizardKey] : [];
    if (!incoming.length) return defaults.map((r) => ({ ...r }));
    const byId = new Map();
    incoming.forEach((r, i) => {
      const n = normalizeVoce(r, i, defaults[i]);
      if (n.id) byId.set(n.id, n);
    });
    const merged = defaults.map((d) => {
      const w = byId.get(d.id);
      return w ? { ...d, testo: w.testo, selezionato: w.selezionato } : { ...d };
    });
    const extra = incoming
      .filter((r, i) => {
        const n = normalizeVoce(r, i);
        return !defaults.some((d) => d.id === n.id);
      })
      .map((r, i) => normalizeVoce(r, i));
    return merged.concat(extra);
  }

  function vociForTemplate(wizard, wizardKey, defaults) {
    return mergeVociWizard(wizard, wizardKey, defaults)
      .filter((m) => m.selezionato !== false && String(m.testo || '').trim())
      .map((m) => ({ TESTO: m.testo }));
  }

  function bundleTesti(wizard) {
    const w = wizard || {};
    return {
      TITOLO:
        w.titolo != null && String(w.titolo).trim() ? String(w.titolo).trim() : TITOLO_DEFAULT,
      TESTO_INTRO:
        w.testo_intro != null && String(w.testo_intro).trim()
          ? String(w.testo_intro).trim()
          : TESTO_INTRO_DEFAULT,
      VOCI_DURANTE_RAPINA: vociForTemplate(w, 'durante_rapina', DEFAULT_DURANTE_RAPINA),
      VOCI_DOPO_RAPINA: vociForTemplate(w, 'dopo_rapina', DEFAULT_DOPO_RAPINA),
      _vademecum_wizard: {
        titolo: w.titolo,
        testo_intro: w.testo_intro,
        data_revisione: w.data_revisione,
        durante_rapina: mergeVociWizard(w, 'durante_rapina', DEFAULT_DURANTE_RAPINA),
        dopo_rapina: mergeVociWizard(w, 'dopo_rapina', DEFAULT_DOPO_RAPINA),
      },
    };
  }

  function buildData(azienda, _rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const testi = bundleTesti(w);

    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '28'),
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      DATA_REVISIONE: formatDataRevisione(w.data_revisione),
      LOGO_PREVIEW_URL: w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      TITOLO: testi.TITOLO,
      TESTO_INTRO: testi.TESTO_INTRO,
      VOCI_DURANTE_RAPINA: testi.VOCI_DURANTE_RAPINA,
      VOCI_DOPO_RAPINA: testi.VOCI_DOPO_RAPINA,
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _vademecum_wizard: testi._vademecum_wizard,
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '01';
    const testi = bundleTesti({ ...base._vademecum_wizard, ...w, modulo_numero: modNum });

    return {
      ...base,
      MODULO_NUMERO: modNum,
      DATA_REVISIONE: formatDataRevisione(
        w.data_revisione != null ? w.data_revisione : base.DATA_REVISIONE
      ),
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      TITOLO: testi.TITOLO,
      TESTO_INTRO: testi.TESTO_INTRO,
      VOCI_DURANTE_RAPINA: testi.VOCI_DURANTE_RAPINA,
      VOCI_DOPO_RAPINA: testi.VOCI_DOPO_RAPINA,
      _vademecum_wizard: testi._vademecum_wizard,
    };
  }

  function validate(data) {
    const errors = [];
    if (!String(data.SEDE_OPERATIVA || '').trim()) {
      errors.push('Sede operativa mancante (scegli la sede in generazione)');
    }
    if (!String(data.TITOLO || '').trim()) errors.push('Titolo mancante');
    if (!String(data.TESTO_INTRO || '').trim()) errors.push('Testo introduttivo mancante');
    const durante = data.VOCI_DURANTE_RAPINA || [];
    if (!durante.length) {
      errors.push('Selezionare almeno una voce nell\u2019elenco durante la rapina');
    }
    const dopo = data.VOCI_DOPO_RAPINA || [];
    if (!dopo.length) {
      errors.push('Selezionare almeno una voce in \u00abCosa fare dopo la rapina\u00bb');
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
      if (
        (k === 'VOCI_DURANTE_RAPINA' || k === 'VOCI_DOPO_RAPINA') &&
        Array.isArray(v)
      ) {
        templateData[k] = v.map((row) => ({ TESTO: templateValue(row.TESTO) }));
        continue;
      }
      templateData[k] = templateValue(v);
    }

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const repair = window.GEN_VADEMECUM_REPAIR || window.GEN_DOCX_REPAIR;
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
      throw new Error('Errore rendering vademecum antirapina: ' + msg);
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
    TITOLO_DEFAULT,
    TESTO_INTRO_DEFAULT,
    DEFAULT_DURANTE_RAPINA,
    DEFAULT_DOPO_RAPINA,
    mergeVociWizard,
    vociForTemplate,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    repairDocxTemplateZip: (zip) =>
      (window.GEN_VADEMECUM_REPAIR || window.GEN_DOCX_REPAIR)?.repairDocxTemplateZip?.(zip) || zip,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
