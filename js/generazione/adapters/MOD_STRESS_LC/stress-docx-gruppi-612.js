/**
 * §6.1.2 — Pulizia DOCX dopo Docxtemplater:
 * - rimuove sempre il vecchio paragrafo «organigramma» (testo fisso nel modello);
 * - generale: rimuove titolo «Gruppi omogenei…» + cella/tabella elenco;
 * - elenco: rimuove duplicato titolo+mansione fuori dalla tabella (prima occorrenza).
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

  function removeMatchingParagraphs(xml, testFn) {
    return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi, (p) => (testFn(p) ? '' : p));
  }

  /** Titolo + paragrafo o tabella subito sotto (modalità generale). */
  function removeTitoloAndFollowingBlock(xml) {
    return xml.replace(
      /(<w:p\b[^>]*>[\s\S]*?<\/w:p>)(\s*)(<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*>[\s\S]*?<\/w:p>)?/gi,
      (full, pBlock) => {
        if (!isTitoloGruppiParagraph(pBlock)) return full;
        return '';
      }
    );
  }

  function splitByTables(xml) {
    const parts = [];
    const re = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/gi;
    let last = 0;
    let m;
    while ((m = re.exec(xml)) !== null) {
      if (m.index > last) parts.push({ type: 'out', xml: xml.slice(last, m.index) });
      parts.push({ type: 'tbl', xml: m[0] });
      last = m.index + m[0].length;
    }
    if (last < xml.length) parts.push({ type: 'out', xml: xml.slice(last) });
    return parts;
  }

  function listParagraphs(segmentXml) {
    const list = [];
    const re = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
    let m;
    while ((m = re.exec(segmentXml)) !== null) {
      list.push({ full: m[0], index: m.index, len: m[0].length });
    }
    return list;
  }

  /** Prima coppia titolo + mansione (testo breve) fuori dalle tabelle, se il titolo compare più volte. */
  function removeDuplicatePlainTitoloOutsideTables(outsideXml) {
    const paras = listParagraphs(outsideXml);
    const titoloIdx = [];
    for (let i = 0; i < paras.length; i++) {
      if (isTitoloGruppiParagraph(paras[i].full)) titoloIdx.push(i);
    }
    if (titoloIdx.length < 2) return outsideXml;

    const first = titoloIdx[0];
    const next = paras[first + 1];
    if (!next) return outsideXml;
    const nextText = paragraphPlainText(next.full);
    if (isTitoloGruppiParagraph(next.full) || isOrganigrammaParagraph(next.full)) {
      return outsideXml;
    }
    if (nextText.length > 220) return outsideXml;

    let out = outsideXml;
    out = out.replace(next.full, '');
    out = out.replace(paras[first].full, '');
    return out;
  }

  function applyToDocumentXml(xml, modalita) {
    let out = removeMatchingParagraphs(xml, isOrganigrammaParagraph);

    if (modalita === 'generale') {
      out = removeTitoloAndFollowingBlock(out);
      out = removeMatchingParagraphs(out, isTitoloGruppiParagraph);
    } else {
      const parts = splitByTables(out);
      out = parts
        .map((p) =>
          p.type === 'tbl' ? p.xml : removeDuplicatePlainTitoloOutsideTables(p.xml)
        )
        .join('');
    }

    out = out.replace(/<w:p\b[^>]*>\s*<w:pPr[\s\S]*?<\/w:pPr>\s*<\/w:p>/gi, '');
    return out;
  }

  function applyGruppiOmogenei612ToZip(zip, data) {
    if (!zip || !data) return zip;

    const file = zip.file('word/document.xml');
    if (!file) return zip;

    const modalita = data._gruppi_omogenei_modalita === 'generale' ? 'generale' : 'elenco';
    const xml = applyToDocumentXml(file.asText(), modalita);
    zip.file('word/document.xml', xml);
    return zip;
  }

  window.GEN_STRESS_DOCX_GRUPPI_612 = {
    applyGruppiOmogenei612ToZip,
  };
})();
