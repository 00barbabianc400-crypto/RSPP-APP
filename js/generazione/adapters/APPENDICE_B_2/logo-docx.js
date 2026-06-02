/**
 * Logo nel DOCX via PizZip — Appendici B.2/B.3 (tag copertina {%LOGO}, anche spezzato su più run).
 */
(function () {
  'use strict';

  const MAX_LOGO_W = 140;
  const MAX_LOGO_H = 56;
  const LOGO_TAGS = ['{%LOGO}', '{%LOGO%}', '{{LOGO}}'];

  function pixelsToEmus(px) {
    return Math.round(px * 9525);
  }

  function getImageExtension(buffer, pathHint) {
    if (pathHint && /\.jpe?g$/i.test(pathHint)) return { ext: 'jpeg', fileExt: 'jpg' };
    if (pathHint && /\.png$/i.test(pathHint)) return { ext: 'png', fileExt: 'png' };
    const u8 = new Uint8Array(buffer);
    if (u8[0] === 0xff && u8[1] === 0xd8) return { ext: 'jpeg', fileExt: 'jpg' };
    if (u8[0] === 0x89 && u8[1] === 0x50) return { ext: 'png', fileExt: 'png' };
    return { ext: 'png', fileExt: 'png' };
  }

  function getImageDrawingXml(rId, sizeEmus) {
    return (
      '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + sizeEmus[0] + '" cy="' + sizeEmus[1] + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="2" name="Logo" descr="logo"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:nvPicPr><pic:cNvPr id="0" name="Logo" descr="logo"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rId + '"><a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext></a:extLst></a:blip><a:srcRect/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + sizeEmus[0] + '" cy="' + sizeEmus[1] + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline>'
    );
  }

  function nextRelationshipId(relsXml) {
    let max = 0;
    const re = /Id="rId(\d+)"/g;
    let m;
    while ((m = re.exec(relsXml)) !== null) max = Math.max(max, parseInt(m[1], 10));
    return 'rId' + (max + 1);
  }

  function ensureContentTypeDefault(zip, extension, contentType) {
    const path = '[Content_Types].xml';
    let xml = zip.file(path).asText();
    if (xml.indexOf('Extension="' + extension + '"') !== -1) return;
    xml = xml.replace(
      '</Types>',
      '<Default Extension="' + extension + '" ContentType="' + contentType + '"/></Types>'
    );
    zip.file(path, xml);
  }

  function measureLogoSize(arrayBuffer) {
    return new Promise((resolve) => {
      try {
        const blob = new Blob([arrayBuffer]);
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = function () {
          let w = img.naturalWidth || img.width || MAX_LOGO_W;
          let h = img.naturalHeight || img.height || MAX_LOGO_H;
          const scale = Math.min(MAX_LOGO_W / w, MAX_LOGO_H / h, 1);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          URL.revokeObjectURL(url);
          resolve([w, h]);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          resolve([MAX_LOGO_W, MAX_LOGO_H]);
        };
        img.src = url;
      } catch (_) {
        resolve([MAX_LOGO_W, MAX_LOGO_H]);
      }
    });
  }

  function plainTextFromOoxml(xml) {
    return xml.replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '');
  }

  function hasLogoPlaceholder(docXml) {
    if (LOGO_TAGS.some((t) => docXml.indexOf(t) !== -1)) return true;
    return /[\{]{1,2}%?LOGO%?[\}]{0,2}/i.test(plainTextFromOoxml(docXml));
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripLogoTags(docXml) {
    let out = docXml;
    LOGO_TAGS.forEach((t) => {
      out = out.split(t).join('');
    });
    out = out.replace(/\{%\s*<\/w:t>[\s\S]*?LOGO[\s\S]*?%\s*\}/gi, '');
    out = out.replace(/\{\{?\s*LOGO\s*\}?\}?/gi, '');
    return out;
  }

  function injectLogoInDocXml(docXml, drawingRun) {
    if (!hasLogoPlaceholder(docXml)) return { xml: docXml, replaced: false };

    for (const tag of LOGO_TAGS) {
      const esc = escapeRegex(tag);
      const runRe = new RegExp(
        '<w:r(?:\\s[^>]*)?>(?:(?!<\\/w:r>)[\\s\\S])*?<w:t(?:\\s[^>]*)?>' + esc + '<\\/w:t>(?:(?!<\\/w:r>)[\\s\\S])*?<\\/w:r>',
        'g'
      );
      if (runRe.test(docXml)) {
        let out = docXml.replace(runRe, drawingRun);
        out = stripLogoTags(out);
        return { xml: out, replaced: true };
      }
    }

    const pRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
    let replaced = false;
    let out = docXml.replace(pRe, (pXml) => {
      const plain = plainTextFromOoxml(pXml);
      if (!/LOGO/i.test(plain)) return pXml;
      if (!LOGO_TAGS.some((t) => plain.includes(t)) && !/[\{]{1,2}%?LOGO/i.test(plain)) return pXml;
      const pPrMatch = pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
      const pPr = pPrMatch ? pPrMatch[0] : '';
      replaced = true;
      return '<w:p>' + pPr + drawingRun + '</w:p>';
    });
    if (replaced) {
      out = stripLogoTags(out);
      return { xml: out, replaced: true };
    }

    console.warn('[GEN_LOGO_DOCX] placeholder LOGO non sostituibile, rimozione testo residuo');
    return { xml: stripLogoTags(docXml), replaced: false };
  }

  async function injectLogoIntoDocxZip(zip, logoArrayBuffer, pathHint) {
    if (!zip || !logoArrayBuffer) return zip;

    const { ext, fileExt } = getImageExtension(logoArrayBuffer, pathHint);
    const mediaFile = 'logo_rspp.' + fileExt;
    const mediaPath = 'word/media/' + mediaFile;
    const sizePx = await measureLogoSize(logoArrayBuffer);
    const sizeEmus = [pixelsToEmus(sizePx[0]), pixelsToEmus(sizePx[1])];

    const relsPath = 'word/_rels/document.xml.rels';
    if (!zip.file(relsPath)) return zip;

    let relsXml = zip.file(relsPath).asText();
    const rId = nextRelationshipId(relsXml);
    const rel =
      '<Relationship Id="' + rId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + mediaFile + '"/>';
    relsXml = relsXml.replace('</Relationships>', rel + '</Relationships>');
    zip.file(relsPath, relsXml);

    zip.file(mediaPath, logoArrayBuffer);
    ensureContentTypeDefault(
      zip,
      ext === 'jpeg' ? 'jpeg' : ext,
      'image/' + (ext === 'jpeg' ? 'jpeg' : ext)
    );

    const docPaths = Object.keys(zip.files || {}).filter(
      (p) => /^word\/(document|footer\d*|header\d*)\.xml$/i.test(p) && zip.file(p)
    );

    const drawingRun =
      '<w:r><w:rPr/><w:drawing>' + getImageDrawingXml(rId, sizeEmus) + '</w:drawing></w:r>';

    let replaced = false;
    docPaths.forEach((docPath) => {
      let docXml = zip.file(docPath).asText();
      if (!hasLogoPlaceholder(docXml)) return;
      const result = injectLogoInDocXml(docXml, drawingRun);
      zip.file(docPath, result.xml);
      if (result.replaced) replaced = true;
    });

    if (!replaced) {
      console.warn('[GEN_LOGO_DOCX] Tag logo non sostituito nel template (verifica {%LOGO} in copertina)');
    }
    return zip;
  }

  function isSvgBuffer(buf, pathHint) {
    if (pathHint && /\.svg$/i.test(pathHint)) return true;
    try {
      const head = new TextDecoder().decode(new Uint8Array(buf).slice(0, 200));
      return head.includes('<svg') || head.includes('<?xml');
    } catch (_) {
      return false;
    }
  }

  window.GEN_LOGO_DOCX = {
    injectLogoIntoDocxZip,
    measureLogoSize,
    isSvgBuffer,
    MAX_LOGO_W,
    MAX_LOGO_H,
  };
})();
