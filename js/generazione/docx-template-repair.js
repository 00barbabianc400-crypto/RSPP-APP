/**
 * Ripara tag Docxtemplater spezzati da Word (run XML) — condiviso tra adapter generazione.
 * Delimitatori: {{ }} ; logo {%LOGO} (sostituito post-render).
 */
(function () {
  'use strict';

  const DOCXTEMPLATER_OPTIONS = {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: function () {
      return '';
    },
  };

  const TAG_CHUNK_RE = /\{\{[^{}]+\}\}/g;
  const COMPLETE_IMG_RE = /^\{%[A-Za-z0-9_]+\}$/;

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  /** Solo graffe spezzate da tag XML Word — non riscrive testo normale. */
  function reuniteSplitDelimiters(xml) {
    let out = xml;
    let prev;
    do {
      prev = out;
      out = out.replace(/\{(?:<[^>]+>)+\{/g, '{{');
      out = out.replace(/\}(?:<[^>]+>)+\}/g, '}}');
      out = out.replace(/\{(?:<[^>]+>)*%(?:<[^>]+>)*([A-Za-z0-9_]+)\}/g, '{%$1}');
      out = out.replace(/\{(?:<[^>]+>)*%/g, '{%');
      out = out.replace(/(?:<[^>]+>)*%\}/g, '%}');
    } while (out !== prev);
    return out;
  }

  function isCompleteImagePlaceholderRun(t) {
    return COMPLETE_IMG_RE.test(t);
  }

  function runTouchesTemplateSyntax(t) {
    return t && (/\{\{|\}\}|\{%|%\}/.test(t) || t === '{' || t === '}');
  }

  /** Run OK se, tolti i chunk {{...}} e {%...%}, non restano graffe spezzate. */
  function isRunTemplateSafe(t) {
    if (!t) return true;
    if (isCompleteImagePlaceholderRun(t)) return true;
    if (!runTouchesTemplateSyntax(t)) return true;
    let rest = t;
    TAG_CHUNK_RE.lastIndex = 0;
    let m;
    while ((m = TAG_CHUNK_RE.exec(t)) !== null) {
      rest = rest.replace(m[0], '');
    }
    rest = rest.replace(/\{%[A-Za-z0-9_]+%\}/g, '');
    return !/[{}%]/.test(rest);
  }

  function isBrokenPlaceholderRun(t) {
    if (!t) return false;
    if (isRunTemplateSafe(t)) return false;
    if (t === '{' || t === '}' || t === '{{' || t === '}}' || t === '%') return true;
    if (/^LOGO\}$/.test(t)) return true;
    return /\{|\}|%/.test(t);
  }

  function needsWtMerge(texts, joined) {
    if (texts.length < 2) return false;
    if (!/\{\{|\{%/.test(joined)) return false;
    const tagRuns = texts.filter(runTouchesTemplateSyntax);
    if (!tagRuns.length) return false;
    return tagRuns.some((t) => !isRunTemplateSafe(t)) || texts.some(isBrokenPlaceholderRun);
  }

  function mergeWtInParagraph(block) {
    const texts = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(block)) !== null) texts.push(m[1]);
    const joined = texts.join('');
    if (!needsWtMerge(texts, joined)) return block;
    let idx = 0;
    return block.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (_full, attrs) => {
      const a = attrs || '';
      if (idx === 0) {
        idx += 1;
        return '<w:t' + a + '>' + joined + '</w:t>';
      }
      idx += 1;
      return '<w:t' + a + '></w:t>';
    });
  }

  function mergeAdjacentSplitRuns(xml) {
    let out = xml;
    let prev;
    const part = '[A-Za-z0-9_#\\/]*';
    do {
      prev = out;
      out = out.replace(
        new RegExp(
          '(<w:t(?:\\s[^>]*)?>)(\\{\\{' + part + ')(<\\/w:t>)(<w:t(?:\\s[^>]*)?>)([A-Za-z0-9_#\\/]*\\}\\})(<\\/w:t>)',
          'g'
        ),
        '$1$2$5$3$4$6'
      );
      out = out.replace(
        /(<w:t(?:\s[^>]*)?>)(\{%[A-Za-z0-9_]*)(<\/w:t>)(<w:t(?:\s[^>]*)?>)([A-Za-z0-9_]*%\})(<\/w:t>)/g,
        '$1$2$5$3$4$6'
      );
    } while (out !== prev);
    return out;
  }

  function fixSplitPlaceholdersInXml(xml) {
    let out = reuniteSplitDelimiters(xml);
    out = mergeAdjacentSplitRuns(out);
    out = out.replace(/<w:p[\s\S]*?<\/w:p>/g, (block) => mergeWtInParagraph(block));
    out = mergeAdjacentSplitRuns(out);
    out = out.replace(/<w:p[\s\S]*?<\/w:p>/g, (block) => mergeWtInParagraph(block));
    out = out.replace(/\{\{LOGO\}\}/g, '{%LOGO}');
    return out;
  }

  function findBrokenPlaceholderRunsInXml(xml, filePath) {
    const issues = [];
    const blockRe = /<w:p[\s\S]*?<\/w:p>/g;
    let bm;
    while ((bm = blockRe.exec(xml)) !== null) {
      const block = bm[0];
      const texts = [];
      const tre = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let tm;
      while ((tm = tre.exec(block)) !== null) texts.push(tm[1]);
      const joined = texts.join('');
      if (needsWtMerge(texts, joined)) {
        issues.push({ file: filePath, kind: 'split-run', text: joined.slice(0, 80) });
      }
    }
    return issues;
  }

  function inspectDocxZip(zip) {
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

  function inspectDocxTemplate(arrayBuffer) {
    return inspectDocxZip(new window.PizZip(arrayBuffer));
  }

  function repairDocxTemplateZip(zip) {
    let passes = 0;
    const paths = Object.keys(zip.files || {}).filter((p) => /^word\/.*\.xml$/i.test(p));

    for (let pass = 0; pass < 6; pass += 1) {
      let changed = 0;
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
          changed += 1;
        }
      });
      passes += changed;
      const issues = inspectDocxZip(zip);
      if (issues.length === 0) break;
    }

    const remaining = inspectDocxZip(zip);
    if (remaining.length) {
      console.warn('[GEN_DOCX_REPAIR] Tag ancora spezzati:', remaining.length, remaining.slice(0, 4));
    } else {
      console.info('[GEN_DOCX_REPAIR] Template OK dopo riparazione');
    }
    return zip;
  }

  function escapeXmlText(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function paragraphPlainText(block) {
    const texts = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(block)) !== null) texts.push(m[1]);
    return texts.join('');
  }

  function extractPPr(block) {
    const m = block.match(/<w:pPr[\s\S]*?<\/w:pPr>/);
    return m ? m[0] : null;
  }

  function listItemPlainText(item) {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    if (Array.isArray(item.runs)) return item.runs.map((r) => r.text || '').join('');
    return String(item.plain || item.text || '');
  }

  function runXml(text, bold, underline, baseRPrXml) {
    let rPr = baseRPrXml || '';
    const extra = (bold ? '<w:b/>' : '') + (underline ? '<w:u w:val="single"/>' : '');
    if (extra) {
      if (rPr && /<w:rPr/.test(rPr)) {
        rPr = rPr.replace(/<\/w:rPr>/, extra + '</w:rPr>');
      } else {
        rPr = '<w:rPr>' + extra + '</w:rPr>';
      }
    }
    return '<w:r>' + rPr + '<w:t xml:space="preserve">' + escapeXmlText(text) + '</w:t></w:r>';
  }

  function buildListParagraphRuns(pPr, runs, baseRPrXml) {
    const pr = pPr || '<w:pPr/>';
    const lines = [];
    let current = [];
    for (const r of runs || []) {
      const parts = String(r.text == null ? '' : r.text).split('\n');
      parts.forEach((part, i) => {
        if (i > 0) {
          lines.push(current);
          current = [];
        }
        if (part) current.push({ text: part, bold: !!r.bold, underline: !!r.underline });
      });
    }
    if (current.length) lines.push(current);
    if (!lines.length) lines.push([{ text: '', bold: false, underline: false }]);

    let body = '';
    lines.forEach((lineRuns, li) => {
      if (li > 0) body += '<w:br/>';
      body += lineRuns.map((r) => runXml(r.text, r.bold, r.underline, baseRPrXml)).join('');
    });
    return '<w:p>' + pr + body + '</w:p>';
  }

  function buildListParagraph(pPr, item, rPrXml) {
    if (item && Array.isArray(item.runs) && item.runs.length) {
      return buildListParagraphRuns(pPr, item.runs, rPrXml);
    }
    const text = typeof item === 'string' ? item : listItemPlainText(item);
    const pr = pPr || '<w:pPr/>';
    const rPr = rPrXml || '';
    const parts = String(text == null ? '' : text).split('\n');
    let runs = '';
    parts.forEach((part, i) => {
      if (i > 0) runs += '<w:br/>';
      runs += '<w:r>' + rPr + '<w:t xml:space="preserve">' + escapeXmlText(part) + '</w:t></w:r>';
    });
    return '<w:p>' + pr + runs + '</w:p>';
  }

  function paragraphMatchesLoopTexts(normJoined, texts) {
    if (!texts.length) return false;
    const probe = normalizeMatchText(listItemPlainText(texts[0])).slice(0, 40);
    if (probe.length < 8 || !normJoined.includes(probe)) return false;
    if (texts.length === 1) return true;
    const probe2 = normalizeMatchText(listItemPlainText(texts[1])).slice(0, 28);
    if (probe2 && normJoined.includes(probe2)) return true;
    if ((normJoined.match(/;/g) || []).length >= 1) return true;
    return normJoined.length > probe.length + 15;
  }

  /**
   * Se il loop conclusioni è in un paragrafo normale, Docxtemplater concatena con ";".
   * Dopo il render, spezza in più paragrafi elenco copiando numPr dal punto sopra.
   */
  function expandJoinedListParagraphsInXml(xml, cfg) {
    const marker = cfg?.marker || '';
    const minSemicolons = cfg?.minSemicolons ?? 2;
    let lastListPPr = null;
    const pRe = /<w:p[\s\S]*?<\/w:p>/g;
    let out = '';
    let lastEnd = 0;
    let expanded = 0;
    let m;
    while ((m = pRe.exec(xml)) !== null) {
      const block = m[0];
      const pPr = extractPPr(block);
      if (pPr && /<w:numPr/.test(pPr)) lastListPPr = pPr;

      const joined = paragraphPlainText(block);
      const semiCount = (joined.match(/;/g) || []).length;
      const shouldExpand =
        marker &&
        joined.includes(marker) &&
        semiCount >= minSemicolons &&
        /;Verifica/i.test(joined);

      out += xml.slice(lastEnd, m.index);
      if (shouldExpand) {
        const usePPr = pPr && /<w:numPr/.test(pPr) ? pPr : lastListPPr;
        const parts = joined.split(';').map((s) => s.trim()).filter(Boolean);
        out += parts
          .map((part, i) => {
            const text = i < parts.length - 1 && !part.endsWith(';') ? part + ';' : part;
            return buildListParagraph(usePPr, text);
          })
          .join('');
        expanded += 1;
      } else {
        out += block;
      }
      lastEnd = m.index + block.length;
    }
    out += xml.slice(lastEnd);
    if (expanded) {
      console.info('[GEN_DOCX_REPAIR] Elenco unito con ";" espanso in', expanded, 'blocco/i');
    }
    return out;
  }

  function expandJoinedListParagraphsInZip(zip, cfg) {
    const path = 'word/document.xml';
    const file = zip.file(path);
    if (!file) return zip;
    const xml = file.asText();
    const fixed = expandJoinedListParagraphsInXml(xml, cfg);
    if (fixed !== xml) zip.file(path, fixed);
    return zip;
  }

  /**
   * Loop Docxtemplater in un solo paragrafo puntato concatena le voci con ";".
   * Dopo il render, spezza in più bullet copiando numPr.
   */
  function expandSemicolonJoinedListParagraphsInXml(xml, cfg) {
    const minSemicolons = cfg?.minSemicolons ?? 1;
    const minChars = cfg?.minChars ?? 30;
    let lastListPPr = null;
    const pRe = /<w:p[\s\S]*?<\/w:p>/g;
    let out = '';
    let lastEnd = 0;
    let expanded = 0;
    let m;
    while ((m = pRe.exec(xml)) !== null) {
      const block = m[0];
      const pPr = extractPPr(block);
      const hasNumPr = !!(pPr && /<w:numPr/.test(pPr));
      if (hasNumPr) lastListPPr = pPr;

      const joined = paragraphPlainText(block);
      const semiCount = (joined.match(/;/g) || []).length;
      const shouldExpand =
        semiCount >= minSemicolons &&
        joined.length >= minChars &&
        (hasNumPr || lastListPPr);

      out += xml.slice(lastEnd, m.index);
      if (shouldExpand) {
        const usePPr = hasNumPr ? pPr : lastListPPr;
        const parts = joined.split(';').map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          out += parts
            .map((part, i) => {
              const text = i < parts.length - 1 && !part.endsWith(';') ? part + ';' : part;
              return buildListParagraph(usePPr, text);
            })
            .join('');
          expanded += 1;
        } else {
          out += block;
        }
      } else {
        out += block;
      }
      lastEnd = m.index + block.length;
    }
    out += xml.slice(lastEnd);
    if (expanded) {
      console.info('[GEN_DOCX_REPAIR] Elenco vademecum espanso in', expanded, 'blocco/i');
    }
    return out;
  }

  function expandSemicolonJoinedListParagraphsInZip(zip, cfg) {
    const path = 'word/document.xml';
    const file = zip.file(path);
    if (!file) return zip;
    const xml = file.asText();
    const fixed = expandSemicolonJoinedListParagraphsInXml(xml, cfg);
    if (fixed !== xml) zip.file(path, fixed);
    return zip;
  }

  function decodeXmlText(s) {
    return String(s)
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function normalizeMatchText(s) {
    return decodeXmlText(s).replace(/\u2019/g, "'").replace(/\s+/g, ' ').trim();
  }

  function mergeWtInParagraphForced(block) {
    const texts = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(block)) !== null) texts.push(m[1]);
    if (texts.length < 2) return block;
    const joined = texts.join('');
    let idx = 0;
    return block.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (_full, attrs) => {
      const a = attrs || '';
      if (idx === 0) {
        idx += 1;
        return '<w:t' + a + '>' + joined + '</w:t>';
      }
      idx += 1;
      return '<w:t' + a + '></w:t>';
    });
  }

  function isStructuralOrFieldParagraph(block) {
    return /<w:(?:fldChar|instrText|fldSimple|bookmarkStart|bookmarkEnd)\b/i.test(block);
  }

  /** Unisce run spezzati solo se servono ai tag Docxtemplater — non tocca sommario/campi Word. */
  function mergeFragmentedParagraphsInXml(xml) {
    return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (block) => {
      if (/<w:drawing|<w:pict/i.test(block)) return block;
      if (isStructuralOrFieldParagraph(block)) return block;
      return mergeWtInParagraph(block);
    });
  }

  /**
   * Dopo il render, ricostruisce i bullet dei loop usando i testi del wizard
   * (affidabile anche senza ";" tra le voci e con voci custom).
   * cfg.loops: [{ texts: ['voce 1', 'voce 2', ...] }, ...] in ordine documento.
   */
  function expandVademecumListLoopsInXml(xml, cfg) {
    const loops = Array.isArray(cfg?.loops) ? cfg.loops : [];
    if (!loops.length) return xml;

    let loopIdx = 0;
    let lastListPPr = null;
    const pRe = /<w:p[\s\S]*?<\/w:p>/g;
    let out = '';
    let lastEnd = 0;
    let expanded = 0;
    let m;
    while ((m = pRe.exec(xml)) !== null) {
      const block = m[0];
      const pPr = extractPPr(block);
      const hasNumPr = !!(pPr && /<w:numPr/.test(pPr));
      if (hasNumPr) lastListPPr = pPr;

      out += xml.slice(lastEnd, m.index);

      if (!hasNumPr) {
        out += block;
        lastEnd = m.index + block.length;
        continue;
      }

      if (loopIdx < loops.length) {
        const joined = decodeXmlText(paragraphPlainText(block));
        const normJoined = normalizeMatchText(joined);
        for (let tryIdx = loopIdx; tryIdx < loops.length; tryIdx++) {
          const loopCfg = loops[tryIdx] || {};
          const texts = (loopCfg.texts || []).filter((t) => listItemPlainText(t).trim());
          if (!texts.length) continue;
          if (!paragraphMatchesLoopTexts(normJoined, texts)) continue;
          const usePPr = (hasNumPr ? pPr : null) || lastListPPr || pPr || '<w:pPr/>';
          const rPrXml = loopCfg.rPr || '';
          out += texts.map((t) => buildListParagraph(usePPr, t, rPrXml)).join('');
          loopIdx = tryIdx + 1;
          expanded += 1;
          lastEnd = m.index + block.length;
          break;
        }
        if (lastEnd > m.index) continue;
      }

      out += block;
      lastEnd = m.index + block.length;
    }
    out += xml.slice(lastEnd);
    if (expanded) {
      console.info('[GEN_DOCX_REPAIR] Loop vademecum espansi in', expanded, 'elenco/i');
    }
    return out;
  }

  function expandVademecumListLoopsInZip(zip, cfg) {
    const path = 'word/document.xml';
    const file = zip.file(path);
    if (!file) return zip;
    let xml = file.asText();
    xml = mergeFragmentedParagraphsInXml(xml);
    xml = expandVademecumListLoopsInXml(xml, cfg);
    xml = mergeFragmentedParagraphsInXml(xml);
    zip.file(path, xml);
    return zip;
  }

  function formatDocxtemplaterErrors(err) {
    const list = err.properties?.errors || (err.properties?.id ? [err] : []);
    const parts = list.map((e) => {
      const f = e.properties?.file || '';
      const tag = e.properties?.xtag || e.properties?.context || '';
      const expl = e.properties?.explanation || '';
      return (f ? f + ' — ' : '') + e.message + (tag ? ' [' + tag + ']' : '') + (expl ? ' — ' + expl : '');
    });
    let msg = parts.length ? parts.join('; ') : err.message;
    if (list.some((e) => /duplicate_(open|close)_tag|unclosed_loop/.test(e.properties?.id || ''))) {
      msg += ' (unisci ogni tag in un solo run Word, incolla da Blocco note)';
    }
    return msg;
  }

  window.GEN_DOCX_REPAIR = {
    DOCXTEMPLATER_OPTIONS,
    inspectDocxTemplate,
    inspectDocxZip,
    repairDocxTemplateZip,
    expandJoinedListParagraphsInZip,
    expandSemicolonJoinedListParagraphsInZip,
    expandVademecumListLoopsInZip,
    formatDocxtemplaterErrors,
    fixSplitPlaceholdersInXml,
  };
})();
