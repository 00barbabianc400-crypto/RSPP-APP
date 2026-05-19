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

  // ── Default studio ────────────────────────────────────────────────────────
  const DEFAULT_STRUMENTO = 'Delta Ohm modello HD2302.0 / Testo modello 540';

  // ── buildData ─────────────────────────────────────────────────────────────
  // Costruisce il data-object da passare al template Docxtemplater
  function buildData(azienda, rilevamenti, wizardInput) {
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const uniSel = getUniOptions().find(o => o.rif === wizardInput?.uni_rif) || null;
    const hasVdt = wizardInput?.has_vdt ?? null;

    // Descrizione ciclo di lavoro
    let descrizioneCicloLavoro = wizardInput?.descrizione_ciclo_lavoro || '';
    if (!descrizioneCicloLavoro && uniSel) {
      if (hasVdt) {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${uniSel.attivita}\u201d che si esplica attraverso l\u2019utilizzo di apparecchiature per l\u2019elaborazione dati (videoterminali)`;
      } else {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${uniSel.attivita}\u201d`;
      }
    }

    // Descrizione locali da rilevamenti o input
    let descrizioneLocali = wizardInput?.descrizione_locali || '';
    if (!descrizioneLocali && rilevamenti?.length) {
      const zones = [...new Set(rilevamenti.map(r => r.zona).filter(Boolean))];
      if (zones.length) {
        descrizioneLocali = 'Gli ambienti esaminati comprendono le seguenti zone di lavoro: ' + zones.join(', ') + '.';
      }
    }

    // Postazioni dalla tabella rilevamenti (filtrate per tipo illuminamento)
    const postazioni = (rilevamenti || []).map(r => ({
      nome: r.zona || r.descrizione_rilevamento || '\u2014',
      n_finestre: '',
      oscuramento: '',
      lux_piano: r.valore_misurato != null ? String(r.valore_misurato) : '',
      lux_ambiente: '',
      annotazioni: r.esito === 'Non conforme' ? (r.note || 'Non conforme') : '',
    }));

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
      LOGO:                   wizardInput?.logo_url || '',
      MODULO_NUMERO:          wizardInput?.modulo_numero || '01',
      DATA_EMISSIONE:         dataEmissione,
      LUOGO:                  luogo,
      DESCRIZIONE_CICLO_LAVORO: descrizioneCicloLavoro,
      STRUMENTO_LUXMETRO:     wizardInput?.strumento_luxmetro || DEFAULT_STRUMENTO,
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
  // Richiede PizZip e Docxtemplater caricati nella pagina (CDN in index.html)
  async function generateDocx(templateArrayBuffer, data) {
    if (!window.PizZip)        throw new Error('PizZip non caricato');
    if (!window.Docxtemplater) throw new Error('Docxtemplater non caricato');

    // Filtra i campi interni prima di passarli al template
    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith('_')) templateData[k] = v;
    }

    const zip = new window.PizZip(templateArrayBuffer);
    const doc = new window.Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks:    true,
    });
    doc.setData(templateData);

    try {
      doc.render();
    } catch (err) {
      const msg = err.properties?.errors?.map(e => e.message).join('; ') || err.message;
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
    validate,
    generateDocx,
  };
})();
