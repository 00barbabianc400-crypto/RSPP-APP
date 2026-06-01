/** Re-export matrice condivisa (caricare prima js/rischio-accertamento-matrice.js in index / preview). */
(function () {
  'use strict';
  if (!window.RISCHIO_ACCERTAMENTO_MATRICE) {
    console.warn('APPENDICE_C: caricare js/rischio-accertamento-matrice.js prima del adapter');
  }
  window.APPENDICE_C_MATRICE = window.RISCHIO_ACCERTAMENTO_MATRICE || window.APPENDICE_C_MATRICE;
})();
