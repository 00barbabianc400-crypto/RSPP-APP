/**
 * Ripara tag Docxtemplater spezzati da Word (run XML) — condiviso tra adapter generazione.
 * Delimitatori: {{ }} per campi e loop; {%LOGO} per immagine (sostituito post-render).
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

  const COMPLETE_TAG_RE = /^\{\{[^{}]+\}\}$/;
  const COMPLETE_IMG_RE = /^\{%[A-Za-z0-9_]+\}$/;
  const TAG_CHUNK_RE = /\{\{[^{}]+\}\}/g;

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
      out = out.replace(
        /\{(?:<[^>]+>)*#(?:<[^>]+>)*([A-Za-z0-9_]+)(?:<[^>]+>)*\}/g,
        '{{#$1}}'
      );
      out = out.replace(
        /\{(?:<[^>]+>)*\/(?:<[^>]+>)*([A-Za-z0-9_]+)(?:<[^>]+>)*\}/g,
        '{{/$1}}'
      );
      out = out.replace(/\{(?:<[^>]+>)*%(?:<[^>]+>)*([A-Za-z0-9_]+)\}/g, '{%$1}');
      out = out.replace(/\{(?:<[^>]+>)*%(?:<[^>]+>)*\}/g, '{%');
      out = out.replace(/(?:<[^>]+>)*%\}/g, '%}');
      out = out.replace(
        /\{(?:<[^>]+>)*([A-Za-z0-9_]+)(?:<[^>]+>)*\}/g,
        (match, name) => (match.indexOf('<') >= 0 ? '{{' + name + '}}' : match)
      );
    } while (out !== prev);
    return out;
  }

  function isCompleteImagePlaceholderRun(t) {
    return COMPLETE_IMG_RE.test(t);
  }

  /** Run con testo + tag, o più tag attaccati — valido se non restano graffe spezzate. */
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
    if (/\{|\}|%/.test(t)) return true;
    return false;
  }

  function runTouchesTemplateSyntax(t) {
    return t && (/\{\{|\}\}|\{%|%\}/.test(t) || t === '{' || t === '}');
  }

  /**
   * Word spezza spesso {{#loop}} in run tipo "{", "{#loop", "}", "}".
   * Se il testo unito è corretto ma i run no → unisci tutti i w:t del blocco.
   */
  function needsWtMerge(texts, joined) {
    if (texts.length < 2) return false;
    if (!/\{\{|\{%/.test(joined)) return false;

    const tagRuns = texts.filter(runTouchesTemplateSyntax);
    if (!tagRuns.length) return false;

    if (tagRuns.some((t) => !isRunTemplateSafe(t))) return true;
    if (texts.some(isBrokenPlaceholderRun)) return true;

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

  function consolidatePlaceholderParagraphs(xml) {
    return consolidatePlaceholderBlocks(xml, 'w:p');
  }

  function consolidatePlaceholderTableCells(xml) {
    return consolidatePlaceholderBlocks(xml, 'w:tc');
  }

  function mergeAdjacentSplitPlaceholderRuns(xml) {
    let out = xml;
    let prev;
    const tagPart = '[A-Za-z0-9_#\\/]*';
    const patterns = [
      [
        new RegExp(
          '(<w:t(?:\\s[^>]*)?>)(\\{\\{' + tagPart + ')(<\\/w:t>)([\\s\\S]*?)(<w:t(?:\\s[^>]*)?>)([A-Za-z0-9_#\\/]*\\}\\})(<\\/w:t>)',
          'g'
        ),
        (_, o, p1, c1, _mid, o2, p2, c2) => o + p1 + p2 + c1 + o2 + c2,
      ],
      [
        /(<w:t(?:\s[^>]*)?>)(\{%[A-Za-z0-9_]*)(<\/w:t>)([\s\S]*?)(<w:t(?:\s[^>]*)?>)([A-Za-z0-9_]*%\})(<\/w:t>)/g,
        (_, o, p1, c1, _mid, o2, p2, c2) => o + p1 + p2 + c1 + o2 + c2,
      ],
    ];
    do {
      prev = out;
      for (const [re, repl] of patterns) {
        out = out.replace(re, repl);
      }
    } while (out !== prev);
    return out;
  }

  function fixSplitPlaceholdersInXml(xml) {
    let out = reuniteSplitDelimiters(xml);
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = consolidatePlaceholderParagraphs(out);
    out = consolidatePlaceholderTableCells(out);
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = consolidatePlaceholderParagraphs(out);
    out = consolidatePlaceholderTableCells(out);
    out = out.replace(/\{\{LOGO\}\}/g, '{%LOGO}');
    return out;
  }

  function findBrokenPlaceholderRunsInXml(xml, filePath) {
    const issues = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const t = m[1];
      if (!runTouchesTemplateSyntax(t)) continue;
      if (!isBrokenPlaceholderRun(t)) continue;
      issues.push({ file: filePath, kind: 'broken-run', text: t });
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
          issues.push({ file: filePath, kind: 'split-run', text: joined.slice(0, 80) });
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
    return inspectDocxZip(zip);
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
    for (let pass = 0; pass < 12; pass += 1) {
      fixedCount += repairAllXml();
      const issues = inspectDocxZip(zip);
      const compileErr = tryCompileDocxtemplater(zip, mods);
      if (!compileErr && issues.length === 0) break;
      if (issues.length >= lastIssueCount && pass > 3) break;
      lastIssueCount = issues.length;
      if (pass === 11) {
        console.warn(
          '[GEN_DOCX_REPAIR] Template ancora con problemi:',
          issues.length,
          compileErr ? compileErr.message : '',
          issues.slice(0, 5)
        );
      }
    }

    console.info('[GEN_DOCX_REPAIR] Riparati', fixedCount, 'passaggi XML');
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
      msg +=
        ' (tag Word spezzati: incolla ogni tag da Blocco note in un colpo solo; alla generazione l’app tenta la riparazione automatica)';
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
