/**
 * §6.1.2 — Pulizia DOCX dopo Docxtemplater (solo rimozioni mirate, XML bilanciato).
 */
(function () {
  'use strict';

  const TITOLO_RE = /Gruppi\s+omogenei\s+afferenti/i;
  const ORGANIGRAMMA_RE =
    /Per\s+quanto\s+concerne\s+lo\s+studio\s+dei\s+parametri\s+oggettivi/i;

  function paragraphPlainText(pXml) {
    const parts = [];
    String(pXml).replace(/<w:t[^>]*>([^<]*)<\/w:t>/gi, (_, t) => parts.push(t));
    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  function isTitoloGruppiParagraph(pXml) {
    return TITOLO_RE.test(paragraphPlainText(pXml));
  }

  function isOrganigrammaParagraph(pXml) {
    return ORGANIGRAMMA_RE.test(paragraphPlainText(pXml));
  }

  function collectParagraphRanges(xml) {
    const list = [];
    const re = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
    let m;
    while ((m = re.exec(xml)) !== null) {
      list.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
    }
    return list;
  }

  function isInsideOpenTable(xml, index) {
    const before = xml.slice(0, index);
    const opens = (before.match(/<w:tbl\b/gi) || []).length;
    const closes = (before.match(/<\/w:tbl>/gi) || []).length;
    return opens > closes;
  }

  function extractBalancedTable(xml, fromIndex) {
    const start = xml.indexOf('<w:tbl', fromIndex);
    if (start === -1) return null;

    const tagRe = /<(\/?)(w:tbl)\b/gi;
    tagRe.lastIndex = start;
    let depth = 0;
    let m;
    while ((m = tagRe.exec(xml)) !== null) {
      if (m[1] === '/') depth--;
      else depth++;
      if (depth === 0) {
        const end = m.index + m[0].length;
        return { start, end, xml: xml.slice(start, end) };
      }
    }
    return null;
  }

  function isSmallElencoTable(tblXml) {
    const rows = (tblXml.match(/<w:tr\b/gi) || []).length;
    const text = paragraphPlainText(tblXml);
    return rows > 0 && rows <= 4 && text.length < 900;
  }

  function removeRanges(xml, ranges) {
    const uniq = [];
    const seen = new Set();
    for (const r of ranges) {
      const key = r.start + ':' + r.end;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(r);
    }
    uniq.sort((a, b) => b.start - a.start);
    let out = xml;
    for (const r of uniq) {
      if (r.start >= 0 && r.end > r.start && r.end <= out.length) {
        out = out.slice(0, r.start) + out.slice(r.end);
      }
    }
    return out;
  }

  function rangesForOrganigramma(xml) {
    const ranges = [];
    for (const p of collectParagraphRanges(xml)) {
      if (isOrganigrammaParagraph(p.xml)) ranges.push({ start: p.start, end: p.end });
    }
    return ranges;
  }

  function rangesForGenerale(xml) {
    const ranges = [];
    const paras = collectParagraphRanges(xml);

    for (let i = 0; i < paras.length; i++) {
      const p = paras[i];
      if (!isTitoloGruppiParagraph(p.xml)) continue;

      ranges.push({ start: p.start, end: p.end });

      let scan = p.end;
      const gap = xml.slice(scan, scan + 80);
      if (/^\s*$/.test(gap) || gap.trim() === '') {
        scan = p.end + (gap.match(/^\s*/)?.[0].length || 0);
      }

      const tbl = extractBalancedTable(xml, scan);
      if (tbl && isSmallElencoTable(tbl.xml)) {
        ranges.push({ start: tbl.start, end: tbl.end });
      }
    }

    return ranges;
  }

  function rangesForElencoDuplicate(xml) {
    const ranges = [];
    const paras = collectParagraphRanges(xml);
    const titoli = paras.filter(
      (p) => isTitoloGruppiParagraph(p.xml) && !isInsideOpenTable(xml, p.start)
    );
    if (titoli.length < 2) return ranges;

    const first = titoli[0];
    const idx = paras.findIndex((p) => p.start === first.start);
    const next = paras[idx + 1];
    if (!next || isInsideOpenTable(xml, next.start)) return ranges;
    const nextText = paragraphPlainText(next.xml);
    if (
      isTitoloGruppiParagraph(next.xml) ||
      isOrganigrammaParagraph(next.xml) ||
      nextText.length > 220
    ) {
      return ranges;
    }

    ranges.push({ start: first.start, end: first.end });
    ranges.push({ start: next.start, end: next.end });
    return ranges;
  }

  function applyToDocumentXml(xml, modalita) {
    const ranges = rangesForOrganigramma(xml);
    if (modalita === 'generale') {
      ranges.push(...rangesForGenerale(xml));
    } else {
      ranges.push(...rangesForElencoDuplicate(xml));
    }
    return removeRanges(xml, ranges);
  }

  function applyGruppiOmogenei612ToZip(zip, data) {
    if (!zip || !data) return zip;

    const file = zip.file('word/document.xml');
    if (!file) return zip;

    const modalita = data._gruppi_omogenei_modalita === 'generale' ? 'generale' : 'elenco';
    const before = file.asText();
    const after = applyToDocumentXml(before, modalita);

    if (after.length < before.length * 0.55) {
      console.error(
        '[GEN_STRESS_DOCX_GRUPPI_612] Pulizia §6.1.2 annullata: XML accorciato troppo (' +
          before.length +
          ' → ' +
          after.length +
          ')'
      );
      return zip;
    }

    zip.file('word/document.xml', after);
    return zip;
  }

  window.GEN_STRESS_DOCX_GRUPPI_612 = {
    applyGruppiOmogenei612ToZip,
  };
})();
