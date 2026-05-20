/**
 * Applica grassetto + colore ai testi livello rischio nel DOCX generato.
 */
(function () {
  'use strict';

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function colorizeLabelInXml(xml, label, colorHex) {
    if (!label || !colorHex) return xml;
    const esc = escapeRegex(label);
    const re = new RegExp(
      '<w:r(\\b[^>]*)>((?:(?!<\\/w:r>).)*?)<w:t([^>]*)>(' + esc + ')<\\/w:t>((?:(?!<\\/w:r>).)*?)<\\/w:r>',
      'gi'
    );
    return xml.replace(re, (full, rAttr, before, tAttr, _t, after) => {
      if (/<w:color\s/i.test(before + after)) return full;
      const inner = String(before).replace(/<w:rPr[^>]*>[\s\S]*?<\/w:rPr>/gi, '');
      return (
        '<w:r' + rAttr + '><w:rPr><w:b/><w:color w:val="' + colorHex + '"/></w:rPr>'
        + inner + '<w:t' + tAttr + '>' + label + '</w:t>' + after + '</w:r>'
      );
    });
  }

  function applyRiskLevelColorsToZip(zip, data) {
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
      const hex = xlsx.colorForKey(key);
      if (label && hex) xml = colorizeLabelInXml(xml, String(label).trim(), hex);
    }

    zip.file('word/document.xml', xml);
    return zip;
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
      xml = colorizeLabelInXml(xml, h, '000000');
    }
    zip.file('word/document.xml', xml);
    return zip;
  }

  window.GEN_STRESS_DOCX_COLOR = {
    applyRiskLevelColorsToZip,
    applyPianificazioneBoldHeaders,
  };
})();
