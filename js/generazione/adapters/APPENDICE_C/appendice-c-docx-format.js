/**
 * Post-process DOCX Appendice C: allineamento tabella protocollo, rimozione apici.
 */
(function () {
  'use strict';

  const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  function parseXml(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const err = doc.getElementsByTagName('parsererror');
    if (err.length) throw new Error('XML non valido (document)');
    return doc;
  }

  function serializeXml(doc) {
    return new XMLSerializer().serializeToString(doc);
  }

  function findProtocolTable(body) {
    const tables = body.getElementsByTagNameNS(WNS, 'tbl');
    for (let i = tables.length - 1; i >= 0; i--) {
      const tbl = tables[i];
      const txt = tbl.textContent || '';
      if (
        txt.indexOf('ACCERTAMENTI SANITARI') !== -1 ||
        txt.indexOf('GRUPPO OMOGENEO') !== -1 ||
        txt.indexOf('PERIODICITA') !== -1 ||
        txt.indexOf('PERIODICITÀ') !== -1
      ) {
        return tbl;
      }
    }
    return tables.length ? tables[tables.length - 1] : null;
  }

  function stripFootnoteReferencesFromTable(tbl) {
    const refs = tbl.getElementsByTagNameNS(WNS, 'footnoteReference');
    while (refs.length) {
      const ref = refs[0];
      const run = ref.parentNode;
      if (run?.parentNode) run.parentNode.removeChild(run);
      else ref.parentNode?.removeChild(ref);
    }
  }

  function setJcLeft(pPr, doc) {
    let jc = null;
    for (let i = 0; i < pPr.childNodes.length; i++) {
      if (pPr.childNodes[i].localName === 'jc') {
        jc = pPr.childNodes[i];
        break;
      }
    }
    if (!jc) {
      jc = doc.createElementNS(WNS, 'w:jc');
      pPr.appendChild(jc);
    }
    jc.setAttributeNS(WNS, 'w:val', 'left');
  }

  function ensureParagraphAlignLeft(p, doc) {
    let pPr = null;
    for (let i = 0; i < p.childNodes.length; i++) {
      if (p.childNodes[i].localName === 'pPr') {
        pPr = p.childNodes[i];
        break;
      }
    }
    if (!pPr) {
      pPr = doc.createElementNS(WNS, 'w:pPr');
      p.insertBefore(pPr, p.firstChild);
    }
    setJcLeft(pPr, doc);
  }

  function alignTableCellsLeft(tbl, doc) {
    const cells = tbl.getElementsByTagNameNS(WNS, 'tc');
    for (let c = 0; c < cells.length; c++) {
      const tc = cells[c];
      const paras = tc.getElementsByTagNameNS(WNS, 'p');
      for (let p = 0; p < paras.length; p++) {
        ensureParagraphAlignLeft(paras[p], doc);
      }
    }
  }

  function formatDocumentXml(docXml) {
    const doc = parseXml(docXml);
    const body = doc.getElementsByTagNameNS(WNS, 'body')[0];
    if (!body) return docXml;
    const tbl = findProtocolTable(body);
    if (!tbl) return docXml;
    stripFootnoteReferencesFromTable(tbl);
    alignTableCellsLeft(tbl, doc);
    return serializeXml(doc);
  }

  function formatGeneratedZip(zip) {
    if (!zip) return zip;
    const docPath = 'word/document.xml';
    const raw = zip.file(docPath)?.asText();
    if (!raw) return zip;
    zip.file(docPath, formatDocumentXml(raw));
    return zip;
  }

  window.APPENDICE_C_DOCX_FORMAT = {
    formatGeneratedZip,
    formatDocumentXml,
  };
})();
