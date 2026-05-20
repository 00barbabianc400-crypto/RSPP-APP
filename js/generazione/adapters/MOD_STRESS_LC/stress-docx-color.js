/**
 * Post-render DOCX §6.2: sfondo colorato celle livello, testo grassetto nero,
 * allineamento sinistro su tutte e 4 le celle (2 tabelle × livello + testo).
 */
(function () {
  'use strict';

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function ensureTcTopLeft(body) {
    let b = body;
    if (!/<w:vAlign/i.test(b)) {
      if (/<w:tcPr[^>]*>/i.test(b)) {
        b = b.replace(/<w:tcPr([^>]*)>/i, '<w:tcPr$1><w:vAlign w:val="top"/>');
      } else {
        b = '<w:tcPr><w:vAlign w:val="top"/></w:tcPr>' + b;
      }
    }
    b = b.replace(/<w:pPr([^>]*)>/gi, (p, attrs) => {
      if (/w:jc/i.test(p)) {
        return p.replace(/<w:jc[^/]*\/>/gi, '<w:jc w:val="left"/>');
      }
      return '<w:pPr' + attrs + '><w:jc w:val="left"/>';
    });
    b = b.replace(/<w:p(\b)(?![^>]*w:pPr)([^>]*)>/gi, '<w:p$1$2><w:pPr><w:jc w:val="left"/></w:pPr>');
    return b;
  }

  function forceBoldBlackRunsInTc(body) {
    return body.replace(/<w:r(\b[^>]*)>([\s\S]*?)<\/w:r>/gi, (full, rAttr, inner) => {
      const withoutRPr = String(inner).replace(/<w:rPr[^>]*>[\s\S]*?<\/w:rPr>/gi, '');
      return '<w:r' + rAttr + '><w:rPr><w:b/><w:color w:val="000000"/></w:rPr>' + withoutRPr + '</w:r>';
    });
  }

  function applyTcShade(body, fillHex) {
    const shd = '<w:shd w:val="clear" w:color="auto" w:fill="' + fillHex + '"/>';
    if (/<w:tcPr[^>]*>/i.test(body)) {
      if (/<w:shd/i.test(body)) {
        return body.replace(/<w:shd[^/]*\/>/gi, shd);
      }
      return body.replace(/<w:tcPr([^>]*)>/i, '<w:tcPr$1>' + shd);
    }
    return '<w:tcPr>' + shd + '</w:tcPr>' + body;
  }

  /** Trova w:tc che contiene un frammento di testo e applica callback sul corpo cella. */
  function forEachTcContaining(xml, snippet, fn) {
    if (!snippet || snippet.length < 6) return xml;
    const esc = escapeRegex(snippet.slice(0, Math.min(snippet.length, 160)));
    const re = new RegExp(
      '(<w:tc(?:\\b[^>]*)>)([\\s\\S]*?' + esc + '[\\s\\S]*?)(</w:tc>)',
      'gi'
    );
    return xml.replace(re, (full, open, body, close) => open + fn(body) + close);
  }

  function snippetsForField(value) {
    const s = String(value || '').trim();
    if (!s) return [];
    const out = [];
    if (s.length >= 12) out.push(s.slice(0, Math.min(s.length, 140)));
    for (const line of s.split('\n')) {
      const t = line.trim();
      if (t.length >= 6) out.push(t.slice(0, Math.min(t.length, 80)));
    }
    return [...new Set(out)];
  }

  /** Sfondo colore + grassetto nero sulle due celle livello (sinistra). */
  function applyRiskLevelCellShadingToZip(zip, data) {
    const xlsx = window.GEN_STRESS_XLSX;
    if (!zip || !xlsx) return zip;

    const file = zip.file('word/document.xml');
    if (!file) return zip;

    let xml = file.asText();
    const pairs = [
      [data.RISULTATI_LIVELLO_RISCHIO, data._risultati_livello_key],
      [data.INTEGRATIVA_LIVELLO_RISCHIO, data._integrativa_livello_key],
    ];

    for (const [label, key] of pairs) {
      const fill = xlsx.colorForKey(key);
      if (!label || !fill) continue;
      const search = String(label).split('\n')[0].trim();
      if (search.length < 6) continue;
      xml = forEachTcContaining(xml, search, (body) => {
        let b = applyTcShade(body, fill);
        b = forceBoldBlackRunsInTc(b);
        return ensureTcTopLeft(b);
      });
    }

    zip.file('word/document.xml', xml);
    return zip;
  }

  /** Allineamento sinistro (e alto) sulle 4 celle §6.2. */
  function applyEsitoFourCellsLayout(zip, data) {
    const file = zip.file('word/document.xml');
    if (!file) return zip;

    let xml = file.asText();
    const fields = [
      data.RISULTATI_LIVELLO_RISCHIO,
      data.RISULTATI_TESTO_ESITO,
      data.INTEGRATIVA_LIVELLO_RISCHIO,
      data.INTEGRATIVA_TESTO_ESITO,
    ];

    for (const field of fields) {
      for (const snip of snippetsForField(field)) {
        xml = forEachTcContaining(xml, snip, ensureTcTopLeft);
      }
    }

    zip.file('word/document.xml', xml);
    return zip;
  }

  function boldBlackLabelInXml(xml, label) {
    if (!label) return xml;
    const esc = escapeRegex(label);
    const re = new RegExp(
      '<w:r(\\b[^>]*)>((?:(?!<\\/w:r>).)*?)<w:t([^>]*)>(' + esc + ')<\\/w:t>((?:(?!<\\/w:r>).)*?)<\\/w:r>',
      'gi'
    );
    return xml.replace(re, (full, rAttr, before, tAttr, _t, after) => {
      const inner = String(before).replace(/<w:rPr[^>]*>[\s\S]*?<\/w:rPr>/gi, '');
      return (
        '<w:r' + rAttr + '><w:rPr><w:b/><w:color w:val="000000"/></w:rPr>'
        + inner + '<w:t' + tAttr + '>' + label + '</w:t>' + after + '</w:r>'
      );
    });
  }

  function applyPianificazioneBoldHeaders(zip) {
    const file = zip.file('word/document.xml');
    if (!file) return zip;
    let xml = file.asText();
    const headers = [
      'Area indicatori aziendali:',
      'Area contenuto:',
      'Area Contesto:',
    ];
    for (const h of headers) {
      xml = boldBlackLabelInXml(xml, h);
    }
    zip.file('word/document.xml', xml);
    return zip;
  }

  /** @deprecated usa applyRiskLevelCellShadingToZip */
  function applyRiskLevelColorsToZip(zip, data) {
    return applyRiskLevelCellShadingToZip(zip, data);
  }

  window.GEN_STRESS_DOCX_COLOR = {
    applyRiskLevelCellShadingToZip,
    applyRiskLevelColorsToZip,
    applyEsitoFourCellsLayout,
    applyEsitoTableLayout: applyEsitoFourCellsLayout,
    applyPianificazioneBoldHeaders,
  };
})();
