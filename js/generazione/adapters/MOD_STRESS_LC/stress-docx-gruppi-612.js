/**
 * §6.1.2 — Dopo Docxtemplater, in modalità «generale» rimuove dal DOCX
 * il titolo «Gruppi omogenei afferenti…» e la tabella/cella elenco (vuota).
 * In modalità «elenco» non modifica nulla.
 */
(function () {
  'use strict';

  const TITOLO_RE = /Gruppi\s+omogenei\s+afferenti/i;

  function paragraphPlainText(pXml) {
    const parts = [];
    String(pXml).replace(/<w:t[^>]*>([^<]*)<\/w:t>/gi, (_, t) => parts.push(t));
    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  function isTitoloGruppiParagraph(pXml) {
    return TITOLO_RE.test(paragraphPlainText(pXml));
  }

  /** Rimuove un w:p titolo e, se subito dopo, un w:tbl (cella blu elenco). */
  function removeTitoloAndTabella(xml) {
    return xml.replace(
      /(<w:p\b[^>]*>[\s\S]*?<\/w:p>)(\s*)(<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>)?/gi,
      (full, pBlock, _sp, tblBlock) => {
        if (!isTitoloGruppiParagraph(pBlock)) return full;
        return '';
      }
    );
  }

  /** Cella elenco resa come paragrafo con ombreggiatura (senza w:tbl). */
  function removeTitoloAndParagrafoCella(xml) {
    return xml.replace(
      /(<w:p\b[^>]*>[\s\S]*?<\/w:p>)(\s*)(<w:p\b[^>]*>[\s\S]*?<\/w:p>)/gi,
      (full, pTitolo, _sp, pCella) => {
        if (!isTitoloGruppiParagraph(pTitolo)) return full;
        if (!/<w:shd\b/i.test(pCella) && paragraphPlainText(pCella).length > 0) return full;
        if (!/<w:shd\b/i.test(pCella) && paragraphPlainText(pCella).length === 0) {
          return '';
        }
        if (/<w:shd\b/i.test(pCella)) return '';
        return full;
      }
    );
  }

  function applyToDocumentXml(xml) {
    let out = removeTitoloAndTabella(xml);
    out = removeTitoloAndParagrafoCella(out);
    out = out.replace(/<w:p\b[^>]*>\s*<w:pPr[\s\S]*?<\/w:pPr>\s*<\/w:p>/gi, '');
    return out;
  }

  function applyGruppiOmogenei612ToZip(zip, data) {
    if (!zip || !data) return zip;
    if (data._gruppi_omogenei_modalita !== 'generale') return zip;

    const file = zip.file('word/document.xml');
    if (!file) return zip;

    const xml = applyToDocumentXml(file.asText());
    zip.file('word/document.xml', xml);
    return zip;
  }

  window.GEN_STRESS_DOCX_GRUPPI_612 = {
    applyGruppiOmogenei612ToZip,
  };
})();
