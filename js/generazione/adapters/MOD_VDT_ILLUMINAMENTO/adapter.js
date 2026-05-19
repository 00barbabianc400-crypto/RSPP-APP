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
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  /** Rimuove tag OOXML tra caratteri di delimitatori spezzati ({ + XML + { → {{). */
  function reuniteSplitDelimiters(xml) {
    let out = xml;
    let prev;
    do {
      prev = out;
      out = out.replace(/\{(?:<[^>]+>)+\{/g, '{{');
      out = out.replace(/\}(?:<[^>]+>)+\}/g, '}}');
      // {%LOGO} spezzato in { | % | LOGO} (tre run Word)
      out = out.replace(/\{(?:<[^>]+>)*%(?:<[^>]+>)*([A-Za-z0-9_]+)\}/g, '{%$1}');
      out = out.replace(/\{(?:<[^>]+>)*%/g, '{%');
      out = out.replace(/(?:<[^>]+>)*%\}/g, '%}');
    } while (out !== prev);
    return out;
  }

  /** Unisce testo placeholder spezzato tra più <w:t> dentro {{…}} / {%…}. */
  function mergeDelimitedPlaceholders(text, open, close) {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      esc(open) + '((?:(?!' + esc(open) + '|' + esc(close) + ').)*?)' + esc(close),
      'gs'
    );
    return text.replace(re, (_, inner) => open + inner.replace(/<[^>]+>/g, '') + close);
  }

  /**
   * Unisce <w:t> solo se un placeholder è spezzato tra run.
   * Più tag completi nella stessa cella (es. copertina: {%LOGO} + {{RAGIONE_SOCIALE}}) sono OK.
   */
  function needsWtMerge(texts, joined) {
    if (texts.length < 2) return false;
    if (texts.some(isBrokenPlaceholderRun)) return true;
    const opens = (joined.match(/\{\{/g) || []).length;
    const complete = (joined.match(/\{\{[A-Z0-9_]+\}\}/g) || []).length;
    if (opens > complete) return true;
    const opensImg = (joined.match(/\{%/g) || []).length;
    const completeImg = (joined.match(/\{%[A-Za-z0-9_]+\}/g) || []).length;
    if (opensImg > completeImg) return true;
    return false;
  }

  function mergeWtInBlock(block) {
    const texts = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(block)) !== null) texts.push(m[1]);
    const joined = texts.join('');
    if (!needsWtMerge(texts, joined)) return block;
    let idx = 0;
    return block.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (_full, attrs, _text) => {
      const a = attrs || '';
      if (idx === 0) {
        idx += 1;
        return '<w:t' + a + '>' + joined + '</w:t>';
      }
      idx += 1;
      return '<w:t' + a + '></w:t>';
    });
  }

  function consolidatePlaceholderBlocks(xml, tagName) {
    const re = new RegExp('<' + tagName + '[\\s\\S]*?<\\/' + tagName + '>', 'g');
    return xml.replace(re, (block) => mergeWtInBlock(block));
  }

  function consolidatePlaceholderParagraphs(xml) {
    let out = consolidatePlaceholderBlocks(xml, 'w:p');
    out = consolidatePlaceholderBlocks(out, 'w:tc');
    return out;
  }

  /** Unisce coppie adiacenti spezzate: <w:t>{{RAGI</w:t>…<w:t>ONE_SOCIALE}}</w:t> */
  function mergeAdjacentSplitPlaceholderRuns(xml) {
    let out = xml;
    let prev;
    do {
      prev = out;
      out = out.replace(
        /(<w:t(?:\s[^>]*)?>)(\{\{[A-Z0-9_]*)(<\/w:t>)([\s\S]*?)(<w:t(?:\s[^>]*)?>)([A-Z0-9_]*\}\})(<\/w:t>)/g,
        (_, o, p1, c1, _mid, o2, p2, c2) => o + p1 + p2 + c1 + o2 + c2
      );
      out = out.replace(
        /(<w:t(?:\s[^>]*)?>)(\{%[A-Z0-9_]*)(<\/w:t>)([\s\S]*?)(<w:t(?:\s[^>]*)?>)([A-Z0-9_]*%\})(<\/w:t>)/g,
        (_, o, p1, c1, _mid, o2, p2, c2) => o + p1 + p2 + c1 + o2 + c2
      );
    } while (out !== prev);
    return out;
  }

  /** Tag immagine Docxtemplater completo in un solo run (es. {%LOGO}). */
  function isCompleteImagePlaceholderRun(t) {
    return /^\{%[A-Za-z0-9_]+\}$/.test(t);
  }

  /** Vero solo se il run è un frammento (es. {{RAGI | IALE}}), non testo+tag intero. */
  function isBrokenPlaceholderRun(t) {
    if (isCompleteImagePlaceholderRun(t)) return false;
    if (t === '{' || t === '%' || /^LOGO\}$/.test(t)) return true;
    const hasOpen = /\{\{/.test(t) || /\{%/.test(t);
    const hasClose = /\}\}/.test(t);
    if (hasOpen && !hasClose) return true;
    if (hasClose && !hasOpen) return true;
    return false;
  }

  function findBrokenPlaceholderRunsInXml(xml, filePath) {
    const issues = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const t = m[1];
      if (!/\{\{|\{%|\}\}|%\}/.test(t)) continue;
      if (!isBrokenPlaceholderRun(t)) continue;
      const openOnly = (/\{\{/.test(t) || /\{%/.test(t)) && !/\}\}/.test(t) && !/%\}/.test(t);
      issues.push({ file: filePath, kind: openOnly ? 'open' : 'close', text: t });
    }
    ['w:p', 'w:tc'].forEach((tag) => {
      const blockRe = new RegExp('<' + tag + '[\\s\\S]*?<\\/' + tag + '>', 'g');
      let bm;
      while ((bm = blockRe.exec(xml)) !== null) {
        const block = bm[0];
        const texts = [];
        const tre = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let tm;
        while ((tm = tre.exec(block)) !== null) texts.push(tm[1]);
        const joined = texts.join('');
        if (needsWtMerge(texts, joined)) {
          issues.push({ file: filePath, kind: 'split-run', text: joined.slice(0, 60) });
        }
      }
    });
    return issues;
  }

  /** Delimitatori template Word ({{CAMPO}}); default Docxtemplater è { } e rompe {{…}}. */
  const DOCXTEMPLATER_OPTIONS = {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  };

  function tryCompileDocxtemplater(zip, modules) {
    const DocxtemplaterCtor = getDocxtemplaterCtor();
    try {
      new DocxtemplaterCtor(zip, {
        modules: modules || [],
        ...DOCXTEMPLATER_OPTIONS,
      });
      return null;
    } catch (err) {
      return err;
    }
  }

  function inspectDocxTemplate(arrayBuffer) {
    const zip = new window.PizZip(arrayBuffer);
    const issues = [];
    Object.keys(zip.files || {}).forEach((path) => {
      if (!/^word\/.*\.xml$/i.test(path)) return;
      const file = zip.file(path);
      if (!file || file.dir) return;
      try {
        issues.push(...findBrokenPlaceholderRunsInXml(file.asText(), path));
      } catch (_) { /* skip */ }
    });
    return issues;
  }

  function fixSplitPlaceholdersInXml(xml) {
    let out = reuniteSplitDelimiters(xml);
    // Non usare mergeDelimitedPlaceholders su tutto il file: può cancellare </w:p> tra {{ e }}
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = consolidatePlaceholderParagraphs(out);
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = out.replace(/\{\{LOGO\}\}/g, '{%LOGO}');
    return out;
  }

  function assertValidWordXml(zip, label) {
    const path = 'word/document.xml';
    const file = zip.file(path);
    if (!file) return;
    const xml = file.asText();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const errNode = doc.getElementsByTagName('parsererror')[0];
    if (errNode) {
      const detail = (errNode.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      throw new Error(
        (label ? label + ': ' : '') +
          'XML Word non valido in document.xml' +
          (detail ? ' (' + detail + ')' : '')
      );
    }
  }

  function formatDocxtemplaterErrors(err) {
    const list = err.properties?.errors || (err.properties?.id ? [err] : []);
    const parts = list.map((e) => {
      const f = e.properties?.file || '';
      const tag = e.properties?.xtag || e.properties?.context || '';
      return (f ? f + ' — ' : '') + e.message + (tag ? ' [' + tag + ']' : '');
    });
    let msg = parts.length ? parts.join('; ') : err.message;
    if (list.some((e) => /duplicate_(open|close)_tag/.test(e.properties?.id || ''))) {
      msg += ' (tag Word spezzati nel .docx del bucket modelli)';
    }
    return msg;
  }

  function repairDocxTemplateZip(zip, modules) {
    let fixedCount = 0;
    const paths = Object.keys(zip.files || {}).filter((p) => /^word\/.*\.xml$/i.test(p));

    function repairAllXml() {
      let n = 0;
      paths.forEach((path) => {
        const file = zip.file(path);
        if (!file || file.dir) return;
        let xml;
        try {
          xml = file.asText();
        } catch (_) {
          return;
        }
        const fixed = fixSplitPlaceholdersInXml(xml);
        if (fixed !== xml) {
          zip.file(path, fixed);
          n += 1;
        }
      });
      return n;
    }

    for (let pass = 0; pass < 5; pass += 1) {
      const n = repairAllXml();
      fixedCount += n;
      // Senza moduli: evita "ImageModule already attached" al render finale
      const compileErr = tryCompileDocxtemplater(zip, []);
      if (!compileErr) break;
      if (pass === 4) {
        console.warn('[MOD_VDT] Template ancora non compilabile dopo 5 passaggi');
      }
    }

    console.info('[MOD_VDT] Riparati', fixedCount, 'file XML (passaggi fino a compilazione)');
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
  // Template logo: {%LOGO} — inserito post-render via PizZip (no ImageModule browser)
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

    const issuesBefore = inspectDocxTemplate(templateArrayBuffer);
    if (issuesBefore.length) {
      console.warn('[MOD_VDT] Tag spezzati nel template scaricato:', issuesBefore.length, issuesBefore.slice(0, 5));
    }

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const zip = repairDocxTemplateZip(new window.PizZip(templateArrayBuffer), []);
    if (!zip || typeof zip.file !== 'function') {
      throw new Error('Template Word non leggibile (PizZip)');
    }

    let doc;
    try {
      doc = new DocxtemplaterCtor(zip, {
        ...DOCXTEMPLATER_OPTIONS,
      });
      doc.setData(templateData);
      doc.render();
    } catch (err) {
      throw new Error('Errore rendering template: ' + formatDocxtemplaterErrors(err));
    }

    const outZip = doc.getZip();
    if (!outZip || typeof outZip.generate !== 'function') {
      throw new Error('Errore rendering template: zip di output non disponibile');
    }
    if (logoBuffer && window.GEN_LOGO_DOCX?.injectLogoIntoDocxZip) {
      await window.GEN_LOGO_DOCX.injectLogoIntoDocxZip(outZip, logoBuffer, logoPathHint);
    }

    assertValidWordXml(outZip, 'Dopo generazione');

    return outZip.generate({ type: 'arraybuffer', compression: 'DEFLATE' });
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
    inspectDocxTemplate,
    repairDocxTemplateZip,
  };
})();
