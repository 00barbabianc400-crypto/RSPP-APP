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

  function titleCaseTitolo(s) {
    if (!s) return '';
    const t = String(s).trim();
    if (!t.length) return '';
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  /** Macrocategorie (Tab. N — titolo), non singole righe UNI */
  function getUniTableGroups() {
    const opts = getUniOptions();
    const byNum = new Map();
    for (const o of opts) {
      const num = o.tabella_num;
      if (num == null || byNum.has(num)) continue;
      const label = titleCaseTitolo(o.tabella_titolo);
      const rows = opts.filter(r => r.tabella_num === num);
      byNum.set(num, {
        tabella_num: num,
        tabella: o.tabella,
        tabella_titolo: o.tabella_titolo,
        label,
        tabella_rif: formatUniTabellaRif(o.tabella, label),
        default_rif: pickDefaultRifForTable(rows),
      });
    }
    return Array.from(byNum.values()).sort((a, b) => a.tabella_num - b.tabella_num);
  }

  function formatUniTabellaRif(tabella, label) {
    return `${tabella} - ${label}`;
  }

  function pickDefaultRifForTable(rows) {
    const exact2 = rows.find(r => /^\d+\.2$/.test(String(r.rif)));
    if (exact2) return exact2.rif;
    const ends2 = rows.find(r => /\.2$/.test(String(r.rif)) && !/\.2\./.test(String(r.rif)));
    if (ends2) return ends2.rif;
    return rows[0]?.rif || '';
  }

  /** Risolve macro-tabella + riga tipica (lux) da wizard */
  function resolveUniFromWizard(wizard) {
    const w = wizard || {};
    const opts = getUniOptions();
    let group = null;
    let row = null;

    if (w.uni_tabella_num != null && w.uni_tabella_num !== '') {
      const num = Number(w.uni_tabella_num);
      group = getUniTableGroups().find(g => g.tabella_num === num) || null;
      if (group) {
        row = opts.find(o => o.rif === group.default_rif)
          || opts.find(o => o.tabella_num === num);
      }
    } else if (w.uni_rif) {
      row = opts.find(o => o.rif === w.uni_rif) || null;
      if (row) {
        group = getUniTableGroups().find(g => g.tabella_num === row.tabella_num) || null;
      }
    }

    return { group, row };
  }

  function uniFieldsFromWizard(wizard, hasVdt) {
    const { group, row } = resolveUniFromWizard(wizard);
    if (!group) {
      return {
        UNI_TABELLA_RIF: '',
        UNI_ATTIVITA: '',
        UNI_EM_REQ: '',
        UNI_EM_MOD: '',
        UNI_UO: '',
        UNI_RA: '',
        UNI_RUGL: '',
        descrizioneCicloLavoro: wizard?.descrizione_ciclo_lavoro || '',
      };
    }

    const macroLabel = group.label;
    let descrizioneCicloLavoro = wizard?.descrizione_ciclo_lavoro || '';
    if (!descrizioneCicloLavoro) {
      if (hasVdt) {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${macroLabel}\u201d che si esplica attraverso l\u2019utilizzo di apparecchiature per l\u2019elaborazione dati (videoterminali)`;
      } else if (hasVdt === false) {
        descrizioneCicloLavoro = `attivit\u00e0 del tipo \u201c${macroLabel}\u201d`;
      }
    }

    return {
      UNI_TABELLA_RIF: group.tabella_rif,
      UNI_ATTIVITA: macroLabel,
      UNI_EM_REQ: row?.em_req != null ? String(row.em_req) : '',
      UNI_EM_MOD: row?.em_mod != null ? String(row.em_mod) : '',
      UNI_UO: row?.uo || '',
      UNI_RA: row?.ra != null ? String(row.ra) : '',
      UNI_RUGL: row?.rugl != null ? String(row.rugl) : '',
      descrizioneCicloLavoro,
    };
  }

  function getVdtTextBlocks() {
    return window.VDT_TEXT_BLOCKS || [];
  }

  function getVdtVariants() {
    return window.VDT_VARIANTS || getVdtTextBlocks().map((b) => ({
      id: b.id,
      label: b.label,
      sezione: b.sezione,
      vdt: b.onlyNonVdt ? '(non applicabile)' : (b.vdt || '(vuoto)'),
      nonVdt: b.onlyVdt ? '(non applicabile)' : (b.nonVdt || '(vuoto)'),
      onlyNonVdt: !!b.onlyNonVdt,
      onlyVdt: !!b.onlyVdt,
      placeholder: b.placeholder,
    }));
  }

  function interpolateVdtText(text, ctx) {
    if (!text) return '';
    return String(text)
      .replace(/\{\{RAGIONE_SOCIALE\}\}/g, ctx.ragioneSociale || '')
      .replace(/\{\{SEDE_OPERATIVA\}\}/g, ctx.sedeOperativa || '');
  }

  /** Campi {{…}} variabili VDT/NON VDT per template unico */
  function buildVdtPlaceholderFields(hasVdt, ctx, overrides) {
    if (hasVdt === null || hasVdt === undefined) return {};
    const out = {};
    const ovr = overrides || {};
    for (const block of getVdtTextBlocks()) {
      const key = block.placeholder;
      if (!key) continue;
      if (ovr[key] !== undefined && ovr[key] !== null) {
        out[key] = String(ovr[key]);
        continue;
      }
      if (hasVdt && block.onlyNonVdt) {
        out[key] = '';
        continue;
      }
      if (hasVdt === false && block.onlyVdt) {
        out[key] = '';
        continue;
      }
      const raw = hasVdt ? block.vdt : block.nonVdt;
      out[key] = interpolateVdtText(raw, ctx);
    }
    return out;
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

  /** Formato lux per Word (es. "490 lx") */
  function formatLuxCell(val) {
    if (val == null || val === '') return '';
    const s = String(val).trim();
    if (!s) return '';
    if (/\blx\b/i.test(s)) return s;
    return s + ' lx';
  }

  /** Righe tabella §3.5.2 per loop Docxtemplater {{#POSTAZIONI}}…{{/POSTAZIONI}} */
  function postazioniToTemplateRows(postazioni) {
    return (postazioni || [])
      .map(p => ({
        POSTAZIONE: String(p.nome ?? p.postazione ?? '').trim(),
        N_FINESTRE: String(p.n_finestre ?? '').trim(),
        OSCURAMENTO: String(p.oscuramento ?? '').trim(),
        LUX_PIANO: formatLuxCell(p.lux_piano),
        LUX_CENTRO: formatLuxCell(p.lux_ambiente),
        ANNOTAZIONI: String(p.annotazioni ?? '').trim(),
      }))
      .filter(r => r.POSTAZIONE);
  }

  // ── buildData ─────────────────────────────────────────────────────────────
  function buildData(azienda, rilevamenti, wizardInput) {
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const filtered = filterRilevamentiIlluminamento(rilevamenti);
    const hasVdt = wizardInput?.has_vdt ?? null;
    const uniFields = uniFieldsFromWizard(wizardInput, hasVdt);
    const vdtCtx = {
      ragioneSociale: azienda?.ragione_sociale || '',
      sedeOperativa: azienda?.sede_operativa || '',
    };
    const vdtFields = buildVdtPlaceholderFields(hasVdt, vdtCtx, wizardInput?.vdt_text_overrides);

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
      DESCRIZIONE_CICLO_LAVORO: uniFields.descrizioneCicloLavoro,
      STRUMENTO_LUXMETRO:     strumento,
      DESCRIZIONE_LOCALI:     descrizioneLocali,
      UNI_TABELLA_RIF:        uniFields.UNI_TABELLA_RIF,
      UNI_ATTIVITA:           uniFields.UNI_ATTIVITA,
      UNI_EM_REQ:             uniFields.UNI_EM_REQ,
      UNI_EM_MOD:             uniFields.UNI_EM_MOD,
      UNI_UO:                 uniFields.UNI_UO,
      UNI_RA:                 uniFields.UNI_RA,
      UNI_RUGL:               uniFields.UNI_RUGL,
      POSTAZIONI:             postazioniToTemplateRows(postazioni),
      ...vdtFields,

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
    const hasVdt = w.has_vdt !== undefined && w.has_vdt !== null ? w.has_vdt : base._has_vdt;
    const uniFields = uniFieldsFromWizard(w, hasVdt);
    const descrizioneCicloLavoro = w.descrizione_ciclo_lavoro
      || uniFields.descrizioneCicloLavoro
      || base.DESCRIZIONE_CICLO_LAVORO
      || '';

    const descrizioneLocali = (w.descrizione_locali && String(w.descrizione_locali).trim())
      || base.DESCRIZIONE_LOCALI || '';

    const strumento = (w.strumento_luxmetro && String(w.strumento_luxmetro).trim())
      || base.STRUMENTO_LUXMETRO || '';

    const postazioni = (w.postazioni && w.postazioni.length) ? w.postazioni : (base._postazioni || []);

    const vdtCtx = {
      ragioneSociale: base.RAGIONE_SOCIALE || '',
      sedeOperativa: base.SEDE_OPERATIVA || '',
    };
    const vdtFields = buildVdtPlaceholderFields(
      hasVdt,
      vdtCtx,
      w.vdt_text_overrides || base._vdt_text_overrides
    );

    const modNum = (() => {
      if (w.modulo_numero !== undefined) {
        const raw = String(w.modulo_numero ?? '').trim();
        if (raw === '') return '';
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 0) return String(n).padStart(2, '0');
        return '';
      }
      return base.MODULO_NUMERO || '01';
    })();

    return {
      ...base,
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      MODULO_NUMERO: modNum,
      DESCRIZIONE_CICLO_LAVORO: descrizioneCicloLavoro,
      DESCRIZIONE_LOCALI: descrizioneLocali,
      STRUMENTO_LUXMETRO: strumento,
      UNI_TABELLA_RIF: uniFields.UNI_TABELLA_RIF || base.UNI_TABELLA_RIF || '',
      UNI_ATTIVITA: uniFields.UNI_ATTIVITA || base.UNI_ATTIVITA || '',
      UNI_EM_REQ: uniFields.UNI_EM_REQ || base.UNI_EM_REQ || '',
      UNI_EM_MOD: uniFields.UNI_EM_MOD || base.UNI_EM_MOD || '',
      UNI_UO: uniFields.UNI_UO || base.UNI_UO || '',
      UNI_RA: uniFields.UNI_RA || base.UNI_RA || '',
      UNI_RUGL: uniFields.UNI_RUGL || base.UNI_RUGL || '',
      POSTAZIONI: postazioniToTemplateRows(postazioni),
      ...vdtFields,
      _has_vdt: hasVdt,
      _postazioni: postazioni,
      _vdt_text_overrides: w.vdt_text_overrides || base._vdt_text_overrides || null,
    };
  }

  // ── validate ──────────────────────────────────────────────────────────────
  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE)  errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA)   errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo (titolo documento) mancante o non valido');
    }
    if (data._has_vdt === null || data._has_vdt === undefined)
      errors.push('Indicare se sono presenti lavoratori VDT sistematici (≥20 h/sett.)');
    if (!data.UNI_TABELLA_RIF)
      errors.push('Selezionare la tabella UNI EN 12464-1 di riferimento (es. Tab. 34 — Uffici)');
    if (!data.STRUMENTO_LUXMETRO)
      errors.push('Strumento luxmetro mancante');
    if (!data.DESCRIZIONE_LOCALI)
      errors.push('Descrizione locali (sez. 3.5.1) mancante');
    const postRows = data.POSTAZIONI || postazioniToTemplateRows(data._postazioni);
    if (!postRows.length)
      errors.push('Inserire almeno una postazione nella tabella misure (§3.5.2)');
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
    getUniTableGroups,
    resolveUniFromWizard,
    getVdtVariants,
    getVdtTextBlocks,
    buildVdtPlaceholderFields,
    get UNI_OPTIONS() { return getUniOptions(); },
    DEFAULT_STRUMENTO,
    buildData,
    applyWizard,
    postazioniToTemplateRows,
    filterRilevamentiIlluminamento,
    validate,
    generateDocx,
    inspectDocxTemplate,
    repairDocxTemplateZip,
  };
})();
