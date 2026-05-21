/**
 * Ripara tag Docxtemplater spezzati da Word (run XML) — condiviso tra adapter generazione.
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

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

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
    return /^\{%[A-Za-z0-9_]+\}$/.test(t);
  }

  function isBrokenPlaceholderRun(t) {
    if (isCompleteImagePlaceholderRun(t)) return false;
    if (t === '{' || t === '%' || /^LOGO\}$/.test(t)) return true;
    const hasOpen = /\{\{/.test(t) || /\{%/.test(t);
    const hasClose = /\}\}/.test(t) || /%\}/.test(t);
    if (hasOpen && !hasClose) return true;
    if (hasClose && !hasOpen) return true;
    return false;
  }

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

  function consolidatePlaceholderBlocks(xml, tagName) {
    const re = new RegExp('<' + tagName + '[\\s\\S]*?<\\/' + tagName + '>', 'g');
    return xml.replace(re, (block) => mergeWtInBlock(block));
  }

  /** Solo paragrafo: unire w:tc interi può fondere etichetta + tag e peggiorare lo spezzamento. */
  function consolidatePlaceholderParagraphs(xml) {
    return consolidatePlaceholderBlocks(xml, 'w:p');
  }

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

  function fixSplitPlaceholdersInXml(xml) {
    let out = reuniteSplitDelimiters(xml);
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = consolidatePlaceholderParagraphs(out);
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = out.replace(/\{\{LOGO\}\}/g, '{%LOGO}');
    return out;
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

    const mods = modules || [];
    let lastIssueCount = Infinity;
    for (let pass = 0; pass < 10; pass += 1) {
      fixedCount += repairAllXml();
      const issues = inspectDocxZip(zip);
      const compileErr = tryCompileDocxtemplater(zip, mods);
      if (!compileErr && issues.length === 0) break;
      if (issues.length >= lastIssueCount && pass > 2) break;
      lastIssueCount = issues.length;
      if (pass === 9) {
        console.warn(
          '[GEN_DOCX_REPAIR] Template ancora con tag spezzati:',
          issues.length,
          issues.slice(0, 6)
        );
      }
    }

    console.info('[GEN_DOCX_REPAIR] Riparati', fixedCount, 'file XML');
    return zip;
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
      msg += ' (tag Word spezzati: nel .docx unisci ogni tag in un unico run, oppure ricarica il template dopo riparazione)';
    }
    return msg;
  }

  window.GEN_DOCX_REPAIR = {
    DOCXTEMPLATER_OPTIONS,
    inspectDocxTemplate,
    repairDocxTemplateZip,
    formatDocxtemplaterErrors,
    fixSplitPlaceholdersInXml,
  };
})();
