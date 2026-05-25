/**
 * Adapter VADEMECUM_AGGRESSIONI — Comportamenti in caso di aggressione o molestie.
 */
(function () {
  'use strict';

  const CODICE = 'VADEMECUM_AGGRESSIONI';
  const NOME = 'Vademecum aggressioni e molestie';

  const TITOLO_DEFAULT = 'COMPORTAMENTI CONSIGLIATI IN CASO DI AGGRESSIONE O MOLESTIE';
  const SOTTOTITOLO_DEFAULT = 'DA PARTE DI PERSONALE TERZO';

  const TESTO_INTRO_P1_DEFAULT =
    'In caso di aggressioni verbali o fisiche, molestie (verbali, comportamentali, fisiche), atteggiamenti intimidatori o minacciosi posti in essere da personale terzo, la priorit\u00e0 assoluta \u00e8 la sicurezza personale e la richiesta di aiuto immediato. Successivamente, \u00e8 fondamentale raccogliere prove e sporgere denuncia alle autorit\u00e0 competenti.';

  const TESTO_INTRO_P2_DEFAULT =
    'La presente procedura ha lo scopo di tutelare la sicurezza, la dignit\u00e0 e l\u2019integrit\u00e0 psicofisica dei lavoratori, fornire indicazioni chiare sui comportamenti da adottare in caso di aggressioni o molestie e definire le azioni successive all\u2019evento e le modalit\u00e0 di segnalazione.';

  const DEFAULT_RACCOMANDAZIONI = [
    {
      id: 'calma',
      testo:
        'Mantenere prioritariamente, per quanto possibile, un atteggiamento calmo e controllato, evitando qualsiasi comportamento o reazione che possa innescare o aggravare una risposta violenta da parte del soggetto aggressore.',
      selezionato: true,
    },
    {
      id: 'interazione',
      testo:
        'Gestione dell\u2019interazione: parlare con tono fermo ma pacato evitando il contatto fisico, e se possibile, non restare soli (chiedere supporto a colleghi o responsabili). In tutti i casi se possibile, interrompere l\u2019attivit\u00e0 e rinviare l\u2019interazione.',
      selezionato: true,
    },
    {
      id: 'forze_ordine',
      testo:
        'In caso di pericolo imminente, chiamare le Forze dell\'Ordine: Se ti trovi in pericolo immediato o l\'aggressione \u00e8 in corso, chiama subito il numero unico di emergenza 112 (o 113). Fornisci la tua posizione e una breve descrizione dell\'accaduto. Restare sul posto e invitare i testimoni dell\u2019evento a trattenersi fino all\u2019arrivo delle Forze dell\u2019Ordine.',
      selezionato: true,
    },
    {
      id: 'allontanarsi',
      testo:
        'Se la situazione degenera, allontanarsi immediatamente e raggiungere un luogo sicuro: Allontanati immediatamente dall\'aggressore e recati in un luogo sicuro (locale con possibilit\u00e0 di chiusura a chiave)',
      selezionato: true,
    },
    {
      id: 'pronto_soccorso',
      testo:
        'Se hai subito lesioni fisiche o shock, recati immediatamente al Pronto Soccorso. \u00c8 fondamentale ottenere un referto medico dettagliato, che documenti tutte le lesioni fisiche e psicologiche subite; questo documento sar\u00e0 una prova cruciale in sede legale.',
      selezionato: true,
    },
  ];

  const DEFAULT_DOPO_EVENTO = [
    {
      id: 'segnalazione',
      testo: 'Segnalare immediatamente l\u2019accaduto ai propri superiori ed alla Direzione Aziendale.',
      selezionato: true,
    },
    {
      id: 'prove',
      testo:
        'Raccogliere Prove: Testimonianze, Documentazione (come messaggi, e-mail, foto, o registrazioni) e se hai subito lesioni fisiche o shock, copia del referto del Pronto Soccorso;',
      selezionato: true,
    },
    { id: 'denuncia', testo: 'Sporgere Denuncia/Querela', selezionato: true },
    {
      id: 'supporto_psicologico',
      testo:
        'Valuta di concerto con la Direzione un percorso di supporto psicologico per gestire lo stress e il trauma subiti a seguito dell\'aggressione o delle molestie.',
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
      SOTTOTITOLO_DESTINATARIO:
        w.sottotitolo != null && String(w.sottotitolo).trim()
          ? String(w.sottotitolo).trim()
          : SOTTOTITOLO_DEFAULT,
      TESTO_INTRO_P1:
        w.testo_intro_p1 != null && String(w.testo_intro_p1).trim()
          ? String(w.testo_intro_p1).trim()
          : TESTO_INTRO_P1_DEFAULT,
      TESTO_INTRO_P2:
        w.testo_intro_p2 != null && String(w.testo_intro_p2).trim()
          ? String(w.testo_intro_p2).trim()
          : TESTO_INTRO_P2_DEFAULT,
      VOCI_RACCOMANDAZIONI: vociForTemplate(w, 'raccomandazioni', DEFAULT_RACCOMANDAZIONI),
      VOCI_DOPO_EVENTO: vociForTemplate(w, 'dopo_evento', DEFAULT_DOPO_EVENTO),
      _vademecum_wizard: {
        titolo: w.titolo,
        sottotitolo: w.sottotitolo,
        testo_intro_p1: w.testo_intro_p1,
        testo_intro_p2: w.testo_intro_p2,
        data_revisione: w.data_revisione,
        raccomandazioni: mergeVociWizard(w, 'raccomandazioni', DEFAULT_RACCOMANDAZIONI),
        dopo_evento: mergeVociWizard(w, 'dopo_evento', DEFAULT_DOPO_EVENTO),
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
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '29'),
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      DATA_REVISIONE: formatDataRevisione(w.data_revisione),
      LOGO_PREVIEW_URL: w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      TITOLO: testi.TITOLO,
      SOTTOTITOLO_DESTINATARIO: testi.SOTTOTITOLO_DESTINATARIO,
      TESTO_INTRO_P1: testi.TESTO_INTRO_P1,
      TESTO_INTRO_P2: testi.TESTO_INTRO_P2,
      VOCI_RACCOMANDAZIONI: testi.VOCI_RACCOMANDAZIONI,
      VOCI_DOPO_EVENTO: testi.VOCI_DOPO_EVENTO,
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
      SOTTOTITOLO_DESTINATARIO: testi.SOTTOTITOLO_DESTINATARIO,
      TESTO_INTRO_P1: testi.TESTO_INTRO_P1,
      TESTO_INTRO_P2: testi.TESTO_INTRO_P2,
      VOCI_RACCOMANDAZIONI: testi.VOCI_RACCOMANDAZIONI,
      VOCI_DOPO_EVENTO: testi.VOCI_DOPO_EVENTO,
      _vademecum_wizard: testi._vademecum_wizard,
    };
  }

  function validate(data) {
    const errors = [];
    if (!String(data.SEDE_OPERATIVA || '').trim()) {
      errors.push('Sede operativa mancante (scegli la sede in generazione)');
    }
    if (!String(data.TITOLO || '').trim()) errors.push('Titolo mancante');
    if (!String(data.SOTTOTITOLO_DESTINATARIO || '').trim()) {
      errors.push('Sottotitolo destinatario mancante');
    }
    if (!String(data.TESTO_INTRO_P1 || '').trim()) errors.push('Intro paragrafo 1 mancante');
    if (!String(data.TESTO_INTRO_P2 || '').trim()) errors.push('Intro paragrafo 2 mancante');
    const rac = data.VOCI_RACCOMANDAZIONI || [];
    if (!rac.length) errors.push('Selezionare almeno una voce nell\u2019elenco raccomandazioni');
    const dopo = data.VOCI_DOPO_EVENTO || [];
    if (!dopo.length) errors.push('Selezionare almeno una voce nell\u2019elenco \u00abSuccessivamente\u00bb');
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
        (k === 'VOCI_RACCOMANDAZIONI' || k === 'VOCI_DOPO_EVENTO') &&
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
      throw new Error('Errore rendering vademecum aggressioni: ' + msg);
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
    SOTTOTITOLO_DEFAULT,
    TESTO_INTRO_P1_DEFAULT,
    TESTO_INTRO_P2_DEFAULT,
    DEFAULT_RACCOMANDAZIONI,
    DEFAULT_DOPO_EVENTO,
    mergeVociWizard,
    vociForTemplate,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    repairDocxTemplateZip: (zip) => window.GEN_DOCX_REPAIR?.repairDocxTemplateZip?.(zip) || zip,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
