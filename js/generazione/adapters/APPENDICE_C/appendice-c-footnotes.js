/**
 * Iniezione note a piè di pagina OOXML — Appendice C (post Docxtemplater).
 */
(function () {
  'use strict';

  const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const RULES = () => window.APPENDICE_C_FOOTNOTE_RULES;

  function escapeXml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cellText(tc) {
    const doc = tc.ownerDocument;
    const nodes = tc.getElementsByTagNameNS(WNS, 't');
    let out = '';
    for (let i = 0; i < nodes.length; i++) out += nodes[i].textContent || '';
    return out.trim();
  }

  function buildFootnoteParagraphXml(text) {
    return (
      '<w:p xmlns:w="' + WNS + '">'
      + '<w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr>'
      + '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>'
      + '<w:r><w:t xml:space="preserve"> ' + escapeXml(text) + '</w:t></w:r>'
      + '</w:p>'
    );
  }

  function buildFootnoteReferenceRunXml(id) {
    return (
      '<w:r xmlns:w="' + WNS + '">'
      + '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr>'
      + '<w:footnoteReference w:id="' + id + '"/>'
      + '</w:r>'
    );
  }

  function parseXml(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('XML non valido (footnotes/document)');
    }
    return doc;
  }

  function serializeXml(doc) {
    return new XMLSerializer().serializeToString(doc);
  }

  function footnoteIdAttr(el) {
    return el.getAttribute('w:id') || el.getAttributeNS(WNS, 'id') || '0';
  }

  function getMaxFootnoteId(footnotesRoot) {
    let max = 0;
    const list = footnotesRoot.getElementsByTagNameNS(WNS, 'footnote');
    for (let i = 0; i < list.length; i++) {
      const id = parseInt(footnoteIdAttr(list[i]), 10);
      if (Number.isFinite(id) && id > max) max = id;
    }
    return max;
  }

  function stripFootnoteReferencesFromTable(tbl) {
    const refs = tbl.getElementsByTagNameNS(WNS, 'footnoteReference');
    while (refs.length) {
      const ref = refs[0];
      const run = ref.parentNode;
      if (run && run.parentNode) run.parentNode.removeChild(run);
      else ref.parentNode.removeChild(ref);
    }
  }

  function ensureFootnotesPart(zip) {
    const path = 'word/footnotes.xml';
    if (zip.file(path)) {
      return parseXml(zip.file(path).asText());
    }
    const empty =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:footnotes xmlns:w="' + WNS + '">'
      + '<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>'
      + '<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>'
      + '</w:footnotes>';
    return parseXml(empty);
  }

  function addFootnoteEntry(footnotesRoot, id, text) {
    const parser = new DOMParser();
    const wrap = parser.parseFromString(
      '<w:footnote xmlns:w="' + WNS + '" w:id="' + id + '">' + buildFootnoteParagraphXml(text) + '</w:footnote>',
      'application/xml'
    );
    const fn = wrap.documentElement;
    footnotesRoot.appendChild(footnotesRoot.ownerDocument.importNode(fn, true));
  }

  function insertPageBreakBeforeRow(tr) {
    const cells = tr.getElementsByTagNameNS(WNS, 'tc');
    if (!cells.length) return;
    const tc = cells[0];
    let p = tc.getElementsByTagNameNS(WNS, 'p')[0];
    if (!p) {
      p = tr.ownerDocument.createElementNS(WNS, 'p');
      tc.insertBefore(p, tc.firstChild);
    }
    const parser = new DOMParser();
    const brWrap = parser.parseFromString(
      '<w:r xmlns:w="' + WNS + '"><w:br w:type="page"/></w:r>',
      'application/xml'
    );
    p.insertBefore(p.ownerDocument.importNode(brWrap.documentElement, true), p.firstChild);
  }

  function insertFootnoteAfterText(tc, searchText, footnoteId) {
    if (!searchText) return false;
    const texts = tc.getElementsByTagNameNS(WNS, 't');
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      const content = t.textContent || '';
      const idx = content.indexOf(searchText);
      if (idx === -1) continue;

      const run = t.parentNode;
      if (!run || run.localName !== 'r') continue;

      const before = content.slice(0, idx + searchText.length);
      const after = content.slice(idx + searchText.length);
      t.textContent = before;

      const parser = new DOMParser();
      const refDoc = parser.parseFromString(buildFootnoteReferenceRunXml(footnoteId), 'application/xml');
      const refRun = refDoc.documentElement;
      const parent = run.parentNode;

      if (after) {
        const afterRun = run.cloneNode(true);
        const afterT = afterRun.getElementsByTagNameNS(WNS, 't')[0];
        if (afterT) afterT.textContent = after;
        parent.insertBefore(parent.ownerDocument.importNode(refRun, true), run.nextSibling);
        parent.insertBefore(parent.ownerDocument.importNode(afterRun, true), refRun.nextSibling);
      } else {
        parent.insertBefore(parent.ownerDocument.importNode(refRun, true), run.nextSibling);
      }
      return true;
    }
    return false;
  }

  function findProtocolTable(body) {
    const tables = body.getElementsByTagNameNS(WNS, 'tbl');
    for (let i = tables.length - 1; i >= 0; i--) {
      const tbl = tables[i];
      const txt = tbl.textContent || '';
      if (
        txt.indexOf('ACCERTAMENTI SANITARI') !== -1 ||
        txt.indexOf('GRUPPO OMOGENEO') !== -1 ||
        txt.indexOf('PERIODICITA') !== -1
      ) {
        return tbl;
      }
    }
    return tables.length ? tables[tables.length - 1] : null;
  }

  function getDataRows(tbl) {
    const rows = tbl.getElementsByTagNameNS(WNS, 'tr');
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const tr = rows[i];
      const cells = tr.getElementsByTagNameNS(WNS, 'tc');
      if (cells.length < 4) continue;
      const nome = cellText(cells[0]);
      if (!nome || /GRUPPO OMOGENEO/i.test(nome)) continue;
      out.push({ tr, cells });
    }
    return out;
  }

  /**
   * @param {object} zip PizZip dopo render
   * @param {Array} gruppi output buildGruppiOmogenei (con FN_ANCHORS)
   */
  function injectFootnotesIntoDocxZip(zip, gruppi) {
    if (!zip || !Array.isArray(gruppi) || !gruppi.length) return zip;

    const docPath = 'word/document.xml';
    const docXml = zip.file(docPath)?.asText();
    if (!docXml) return zip;

    const doc = parseXml(docXml);
    const body = doc.getElementsByTagNameNS(WNS, 'body')[0];
    if (!body) return zip;

    const tbl = findProtocolTable(body);
    if (!tbl) {
      console.warn('[APPENDICE_C_FOOTNOTES] Tabella protocollo non trovata');
      return zip;
    }

    stripFootnoteReferencesFromTable(tbl);
    const dataRows = getDataRows(tbl);
    const footnotesDoc = ensureFootnotesPart(zip);
    const footnotesRoot = footnotesDoc.documentElement;

    let nextId = getMaxFootnoteId(footnotesRoot) + 1;
    let segmentIndex = 0;
    const segmentTypeToId = {};
    let globalArt176Id = null;

    function allocFootnote(text) {
      const id = String(nextId++);
      addFootnoteEntry(footnotesRoot, id, text);
      return id;
    }

    function footnoteIdForAnchor(anchor) {
      if (anchor.type === 'ART176') {
        if (!globalArt176Id) globalArt176Id = allocFootnote(anchor.text);
        return globalArt176Id;
      }
      const key = anchor.type + '_seg' + segmentIndex;
      if (!segmentTypeToId[key]) segmentTypeToId[key] = allocFootnote(anchor.text);
      return segmentTypeToId[key];
    }

    const activeGruppi = gruppi.filter((g) => g.SORVEGLIANZA_PREVISTA !== false);

    for (let i = 0; i < activeGruppi.length; i++) {
      const g = activeGruppi[i];
      const row = dataRows[i];
      if (!row) {
        console.warn('[APPENDICE_C_FOOTNOTES] Riga tabella mancante per', g.GRUPPO_NOME);
        continue;
      }

      if (g.PAGE_BREAK_BEFORE) {
        insertPageBreakBeforeRow(row.tr);
        segmentIndex++;
      }

      const anchors = Array.isArray(g.FN_ANCHORS) ? g.FN_ANCHORS : [];
      anchors.forEach((anchor) => {
        const fnId = footnoteIdForAnchor(anchor);
        const cell =
          anchor.cell === 'periodicita'
            ? row.cells[3]
            : row.cells[2];
        const ok = insertFootnoteAfterText(cell, anchor.search, fnId);
        if (!ok) {
          console.warn(
            '[APPENDICE_C_FOOTNOTES] Testo non trovato per apice',
            anchor.type,
            anchor.search,
            g.GRUPPO_NOME
          );
        }
      });
    }

    zip.file(docPath, serializeXml(doc));
    zip.file('word/footnotes.xml', serializeXml(footnotesDoc));

    const relsPath = 'word/_rels/document.xml.rels';
    let rels = zip.file(relsPath)?.asText() || '';
    if (rels.indexOf('footnotes.xml') === -1) {
      const rid = 'rIdFootnotesAppendiceC';
      if (rels.indexOf('</Relationships>') !== -1) {
        rels = rels.replace(
          '</Relationships>',
          '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/></Relationships>'
        );
        zip.file(relsPath, rels);
      }
      const ctPath = '[Content_Types].xml';
      let ct = zip.file(ctPath)?.asText() || '';
      if (ct.indexOf('/word/footnotes.xml') === -1 && ct.indexOf('</Types>') !== -1) {
        ct = ct.replace(
          '</Types>',
          '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/></Types>'
        );
        zip.file(ctPath, ct);
      }
    }

    return zip;
  }

  window.APPENDICE_C_FOOTNOTES = {
    injectFootnotesIntoDocxZip,
  };
})();
