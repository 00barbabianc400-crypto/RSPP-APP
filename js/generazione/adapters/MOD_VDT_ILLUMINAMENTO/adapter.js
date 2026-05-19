/**
 * Adapter MOD_VDT_ILLUMINAMENTO
 * Registra window.GEN_ADAPTERS['MOD_VDT_ILLUMINAMENTO']
 * Usabile in: index.html (generazione DOCX) e preview.html (import script)
 */
(function () {
  'use strict';

  // ── UNI EN 12464-1:2021 — Tabelle 9-61 (331 voci da uni-options.js) ───────
  function getUniOptions() {
    return window.UNI_EN_12464_1_OPTIONS || [];
  }

  // Suggerimento studio (solo placeholder UI, non precompilato automaticamente)
  const DEFAULT_STRUMENTO = 'Delta Ohm modello HD2302.0 / Testo modello 540';

  /** Rilevamenti collegati a tipi illuminamento / VDT / lux */
  function filterRilevamentiIlluminamento(rilevamenti) {
    return (rilevamenti || []).filter(r => {
      const nome = (r.tipo_rilevamento?.nome_tipo || '').toLowerCase();
      return /illumin|vdt|lux/i.test(nome);
    });
  }

  function strumentoDaRilevamenti(rilevamenti) {
    const filtered = filterRilevamentiIlluminamento(rilevamenti);
    const found = filtered.map(r => r.strumento).find(s => s && String(s).trim());
    return found ? String(found).trim() : '';
  }

  /** CDN jsdelivr espone `window.docxtemplater`, non `Docxtemplater` */
  function getDocxtemplaterCtor() {
    return window.Docxtemplater || window.docxtemplater || null;
  }

  /**
   * Word (anche da bucket modelli) spezza spesso i tag tra più <w:t>.
   * Unisce il testo rimuovendo markup OOXML dentro {{…}} e {%…}.
   */
  function fixSplitPlaceholdersInXml(xml) {
    function mergeDelimited(text, open, close) {
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(
        esc(open) + '((?:(?!' + esc(open) + '|' + esc(close) + ').)*?)' + esc(close),
        'gs'
      );
      return text.replace(re, (_, inner) => open + inner.replace(/<[^>]+>/g, '') + close);
    }
    let out = mergeDelimited(xml, '{{', '}}');
    out = mergeDelimited(out, '{%', '%}');
    out = out.replace(/\{\{LOGO\}\}/g, '{%LOGO}');
    return out;
  }

  function repairDocxTemplateZip(zip) {
    Object.keys(zip.files || {}).forEach((path) => {
      if (!/^word\/.*\.xml$/i.test(path)) return;
      const file = zip.file(path);
      if (!file || file.dir) return;
      let xml;
      try {
        xml = file.asText();
      } catch (_) {
        return;
      }
      const fixed = fixSplitPlaceholdersInXml(xml);
      if (fixed !== xml) zip.file(path, fixed);
    });
    return zip;
  }

  function descrizioneLocaliDaRilevamenti(rilevamenti) {
    const filtered = filterRilevamentiIlluminamento(rilevamenti);
    if (!filtered.length) return '';
    const parti = filtered.map(r => {
      const zona = (r.zona || '').trim();
      const desc = (r.descrizione_rilevamento || '').trim();
      if (zona && desc) return zona + ': ' + desc;
      return desc || zona;
    }).filter(Boolean);
    const uniche = [...new Set(parti)];
    if (!uniche.length) return '';
    return 'Gli ambienti esaminati comprendono le seguenti zone di lavoro: ' + uniche.join('; ') + '.';
  }

  function postazioniDaRilevamenti(rilevamenti) {
    return filterRilevamentiIlluminamento(rilevamenti).map(r => ({
      nome: r.zona || r.descrizione_rilevamento || '\u2014',
      n_finestre: '',
      oscuramento: '',
      lux_piano: r.valore_misurato != null ? String(r.valore_misurato) : '',
      lux_ambiente: '',
      annotazioni: r.esito === 'Non conforme' ? (r.note || 'Non conforme') : (r.note || ''),
    }));
  }

  // ── buildData ─────────────────────────────────────────────────────────────
  function buildData(azienda, rilevamenti, wizardInput) {
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const filtered = filterRilevamentiIlluminamento(rilevamenti);
    const uniSel = getUniOptions().find(o => o.rif === wizardInput?.uni_rif) || null;
    const hasVdt = wizardInput?.has_vdt ?? null;

    let descrizioneCicloLavoro = wizardInput?.descrizione_ciclo_lavoro || '';
    if (!descrizioneCicloLavoro && uniSel) {
      if (hasVdt) {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${uniSel.attivita}\u201d che si esplica attraverso l\u2019utilizzo di apparecchiature per l\u2019elaborazione dati (videoterminali)`;
      } else {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${uniSel.attivita}\u201d`;
      }
    }

    let descrizioneLocali = wizardInput?.descrizione_locali || '';
    if (!descrizioneLocali) descrizioneLocali = descrizioneLocaliDaRilevamenti(rilevamenti);

    const postazioni = (wizardInput?.postazioni?.length)
      ? wizardInput.postazioni
      : postazioniDaRilevamenti(rilevamenti);

    const strumento = (wizardInput?.strumento_luxmetro && String(wizardInput.strumento_luxmetro).trim())
      || strumentoDaRilevamenti(rilevamenti)
      || '';

    // Luogo (prima città dall'indirizzo, fallback Roma)
    const luogo = (() => {
      const sede = azienda?.sede_operativa || '';
      const match = sede.match(/,\s*([A-Z]{2})\s*$/);
      if (match) return match[1];
      const parts = sede.split(',');
      return parts.length > 1 ? parts[parts.length - 1].trim() : 'Roma';
    })();

    return {
      // ── Campi template ──
      RAGIONE_SOCIALE:        azienda?.ragione_sociale || '',
      SEDE_OPERATIVA:         azienda?.sede_operativa || '',
      LOGO_PREVIEW_URL:       wizardInput?.logo_url || '',
      _logo_buffer:           wizardInput?.logo_buffer || null,
      _logo_path:             wizardInput?.logo_path || '',
      MODULO_NUMERO:          wizardInput?.modulo_numero || '01',
      DATA_EMISSIONE:         dataEmissione,
      LUOGO:                  luogo,
      DESCRIZIONE_CICLO_LAVORO: descrizioneCicloLavoro,
      STRUMENTO_LUXMETRO:     strumento,
      DESCRIZIONE_LOCALI:     descrizioneLocali,
      UNI_TABELLA_RIF:        uniSel ? uniSel.rif : '',
      UNI_ATTIVITA:           uniSel?.attivita || '',
      UNI_EM_REQ:             uniSel?.em_req != null ? String(uniSel.em_req) : '',
      UNI_EM_MOD:             uniSel?.em_mod != null ? String(uniSel.em_mod) : '',
      UNI_UO:                 uniSel?.uo || '',
      UNI_RA:                 uniSel?.ra != null ? String(uniSel.ra) : '',
      UNI_RUGL:               uniSel?.rugl != null ? String(uniSel.rugl) : '',

      // ── Metadati interni (prefisso _ = non entrano nel template) ──
      _has_vdt:     hasVdt,
      _uni_options: getUniOptions(),
      _postazioni:  postazioni,
      _rilevamenti_illuminamento: filtered,
    };
  }

  /** Applica scelte wizard su payload base (per validazione e generazione) */
  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const uniSel = getUniOptions().find(o => o.rif === w.uni_rif) || null;
    const hasVdt = w.has_vdt !== undefined && w.has_vdt !== null ? w.has_vdt : base._has_vdt;

    let descrizioneCicloLavoro = w.descrizione_ciclo_lavoro || base.DESCRIZIONE_CICLO_LAVORO || '';
    if (uniSel && !w.descrizione_ciclo_lavoro) {
      if (hasVdt) {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${uniSel.attivita}\u201d che si esplica attraverso l\u2019utilizzo di apparecchiature per l\u2019elaborazione dati (videoterminali)`;
      } else if (hasVdt === false) {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${uniSel.attivita}\u201d`;
      }
    }

    const descrizioneLocali = (w.descrizione_locali && String(w.descrizione_locali).trim())
      || base.DESCRIZIONE_LOCALI || '';

    const strumento = (w.strumento_luxmetro && String(w.strumento_luxmetro).trim())
      || base.STRUMENTO_LUXMETRO || '';

    const postazioni = (w.postazioni && w.postazioni.length) ? w.postazioni : (base._postazioni || []);

    return {
      ...base,
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      DESCRIZIONE_CICLO_LAVORO: descrizioneCicloLavoro,
      DESCRIZIONE_LOCALI: descrizioneLocali,
      STRUMENTO_LUXMETRO: strumento,
      UNI_TABELLA_RIF: uniSel ? uniSel.rif : (base.UNI_TABELLA_RIF || ''),
      UNI_ATTIVITA: uniSel ? uniSel.attivita : (w.uni_rif ? '' : base.UNI_ATTIVITA || ''),
      UNI_EM_REQ: uniSel && uniSel.em_req != null ? String(uniSel.em_req) : base.UNI_EM_REQ || '',
      UNI_EM_MOD: uniSel && uniSel.em_mod != null ? String(uniSel.em_mod) : base.UNI_EM_MOD || '',
      UNI_UO: uniSel ? uniSel.uo : base.UNI_UO || '',
      UNI_RA: uniSel && uniSel.ra != null ? String(uniSel.ra) : base.UNI_RA || '',
      UNI_RUGL: uniSel && uniSel.rugl != null ? String(uniSel.rugl) : base.UNI_RUGL || '',
      _has_vdt: hasVdt,
      _postazioni: postazioni,
    };
  }

  // ── validate ──────────────────────────────────────────────────────────────
  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE)  errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA)   errors.push('Sede Operativa mancante');
    if (data._has_vdt === null || data._has_vdt === undefined)
      errors.push('Indicare se sono presenti lavoratori VDT sistematici (≥20 h/sett.)');
    if (!data.UNI_ATTIVITA)
      errors.push('Selezionare l\'attività UNI EN 12464-1 di riferimento');
    if (!data.STRUMENTO_LUXMETRO)
      errors.push('Strumento luxmetro mancante');
    if (!data.DESCRIZIONE_LOCALI)
      errors.push('Descrizione locali (sez. 3.5.1) mancante');
    return errors;
  }

  // ── generateDocx ──────────────────────────────────────────────────────────
  // Template logo: {%LOGO} (paragrafo dedicato) + ImageModule
  async function generateDocx(templateArrayBuffer, data) {
    const DocxtemplaterCtor = getDocxtemplaterCtor();
    if (!window.PizZip)        throw new Error('PizZip non caricato');
    if (!DocxtemplaterCtor)    throw new Error('Docxtemplater non caricato');

    const logoBuffer = data._logo_buffer || null;
    const logoPathHint = data._logo_path || '';

    if (logoBuffer && window.GEN_LOGO_DOCX?.isSvgBuffer(logoBuffer, logoPathHint)) {
      throw new Error('Il logo in formato SVG non è supportato nel Word. Carica PNG o JPEG in Loghi.');
    }

    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (k === 'LOGO_PREVIEW_URL') continue;
      templateData[k] = v;
    }

    const modules = [];
    if (logoBuffer && window.GEN_LOGO_DOCX?.createLogoImageModule) {
      const imageModule = await window.GEN_LOGO_DOCX.createLogoImageModule(logoBuffer);
      if (imageModule) {
        modules.push(imageModule);
        templateData.LOGO = logoBuffer;
      }
    }

    const zip = repairDocxTemplateZip(new window.PizZip(templateArrayBuffer));
    const doc = new DocxtemplaterCtor(zip, {
      modules,
      paragraphLoop: true,
      linebreaks:    true,
    });

    try {
      if (typeof doc.resolveData === 'function') {
        await doc.resolveData(templateData);
        doc.render();
      } else {
        doc.setData(templateData);
        doc.render();
      }
    } catch (err) {
      const parts = (err.properties?.errors || []).map((e) => {
        const f = e.properties?.file || '';
        const tag = e.properties?.xtag || e.properties?.context || '';
        return (f ? f + ' — ' : '') + e.message + (tag ? ' [' + tag + ']' : '');
      });
      let msg = parts.length ? parts.join('; ') : err.message;
      if ((err.properties?.errors || []).some((e) => /duplicate_(open|close)_tag/.test(e.properties?.id || ''))) {
        msg += ' (placeholder Word spezzati: nel template riscrivi ogni tag in un colpo solo, es. {{RAGIONE_SOCIALE}})';
      }
      throw new Error('Errore rendering template: ' + msg);
    }

    return doc.getZip().generate({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  // ── Registra adapter ──────────────────────────────────────────────────────
  window.GEN_ADAPTERS = window.GEN_ADAPTERS || {};
  window.GEN_ADAPTERS['MOD_VDT_ILLUMINAMENTO'] = {
    codice:      'MOD_VDT_ILLUMINAMENTO',
    nome:        'Modulo Illuminamento VDT / NON VDT',
    getUniOptions,
    get UNI_OPTIONS() { return getUniOptions(); },
    DEFAULT_STRUMENTO,
    buildData,
    applyWizard,
    filterRilevamentiIlluminamento,
    validate,
    generateDocx,
  };
})();
