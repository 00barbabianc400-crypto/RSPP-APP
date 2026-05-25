/**
 * Riparazione template condivisa per VADEMECUM_* (tag spezzati in header/body).
 */
(function () {
  'use strict';

  function repairDocxTemplateZip(zip) {
    const repair = window.GEN_DOCX_REPAIR;
    if (!repair?.repairDocxTemplateZip) return zip;
    return repair.repairDocxTemplateZip(zip);
  }

  window.GEN_VADEMECUM_REPAIR = {
    repairDocxTemplateZip,
  };
})();
