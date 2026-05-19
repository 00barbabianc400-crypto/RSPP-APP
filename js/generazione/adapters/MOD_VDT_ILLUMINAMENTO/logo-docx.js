/**
 * Helper logo per Docxtemplater ImageModule (browser).
 */
(function () {
  'use strict';

  const MAX_LOGO_W = 140;
  const MAX_LOGO_H = 56;

  function getImageModuleClass() {
    return window.ImageModule || null;
  }

  /** Dimensioni logo mantenendo proporzioni (max 140×56 px nel Word). */
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

  async function createLogoImageModule(logoArrayBuffer) {
    const ImageModule = getImageModuleClass();
    if (!ImageModule || !logoArrayBuffer) return null;

    const size = await measureLogoSize(logoArrayBuffer);

    return new ImageModule({
      centered: false,
      fileType: 'docx',
      getImage(tagValue) {
        if (tagValue instanceof ArrayBuffer) return tagValue;
        if (tagValue && tagValue.buffer instanceof ArrayBuffer) return tagValue.buffer;
        return logoArrayBuffer;
      },
      getSize() {
        return size;
      },
    });
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
    createLogoImageModule,
    measureLogoSize,
    isSvgBuffer,
    MAX_LOGO_W,
    MAX_LOGO_H,
  };
})();
