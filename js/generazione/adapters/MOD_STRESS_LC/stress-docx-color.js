/**
 * Post-render DOCX §6.2 — solo celle foglia (w:tc senza tabella annidata).
 * Regex con confine </w:tc> per non inglobare righe/tabelle intere.
 */
(function () {
  'use strict';

  const RISK_LABELS = ['RISCHIO BASSO', 'RISCHIO MEDIO', 'RISCHIO ALTO'];

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isLeafTcBody(body) {
    return body && !/<w:tbl[\s>]/i.test(body);
  }

  /** w:tc la cui body contiene snippet, senza attraversare un altro </w:tc>. */
  function forEachLeafTcContaining(xml, snippet, fn) {
    const s = String(snippet || '').trim();
    if (s.length < 8) return xml;

    const esc = escapeRegex(s.slice(0, Math.min(s.length, 120)));
    const re = new RegExp(
      '(<w:tc(?:\\b[^>]*)>)((?:(?!<\\/w:tc>)[\\s\\S])*?' + esc + '(?:(?!<\\/w:tc>)[\\s\\S])*?)(<\\/w:tc>)',
      'gi'
    );

    return xml.replace(re, (full, open, body, close) => {
      if (!isLeafTcBody(body)) return full;
      return open + fn(body) + close;
    });
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

  function riskLabelForKey(key) {
    const k = String(key || '').toUpperCase();
    if (k === 'BASSO' || k === 'MEDIO' || k === 'ALTO') return 'RISCHIO ' + k;
    return '';
  }

  function uniqueSnippetsForEsitoAlign(data) {
    const out = [];
    const push = (v, minLen) => {
      const s = String(v || '').trim();
      if (s.length >= minLen) out.push(s.slice(0, Math.min(s.length, 100)));
    };

    for (const key of ['_risultati_livello_key', '_integrativa_livello_key']) {
      const lbl = riskLabelForKey(data[key]);
      if (lbl) out.push(lbl);
    }
    push(data.RISULTATI_TESTO_ESITO, 40);
    push(data.INTEGRATIVA_TESTO_ESITO, 40);

    return [...new Set(out)];
  }

  /** Sfondo + grassetto nero solo sulla cella che contiene «RISCHIO …». */
  function applyRiskLevelCellShadingToZip(zip, data) {
    const xlsx = window.GEN_STRESS_XLSX;
    if (!zip || !xlsx) return zip;

    const file = zip.file('word/document.xml');
    if (!file) return zip;

    let xml = file.asText();
    const keys = [
      data._risultati_livello_key,
      data._integrativa_livello_key,
    ];

    for (const key of keys) {
      const fill = xlsx.colorForKey(key);
      const label = riskLabelForKey(key);
      if (!fill || !label) continue;

      xml = forEachLeafTcContaining(xml, label, (body) => {
        let b = applyTcShade(body, fill);
        b = forceBoldBlackRunsInTc(b);
        return ensureTcTopLeft(b);
      });
    }

    zip.file('word/document.xml', xml);
    return zip;
  }

  /** Allineamento sinistro sulle 4 celle §6.2 (snippet lunghi e univoci). */
  function applyEsitoFourCellsLayout(zip, data) {
    const file = zip.file('word/document.xml');
    if (!file) return zip;

    let xml = file.asText();
    for (const snip of uniqueSnippetsForEsitoAlign(data)) {
      xml = forEachLeafTcContaining(xml, snip, ensureTcTopLeft);
    }

    zip.file('word/document.xml', xml);
    return zip;
  }

  /** Grassetto solo sul run che contiene l’intestazione Area (§6.4). */
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
    for (const h of [
      'Area indicatori aziendali:',
      'Area contenuto:',
      'Area Contesto:',
    ]) {
      xml = boldBlackLabelInXml(xml, h);
    }
    zip.file('word/document.xml', xml);
    return zip;
  }

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
