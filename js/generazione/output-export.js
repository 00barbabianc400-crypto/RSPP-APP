/**
 * GEN_OUTPUT_EXPORT — export ZIP documenti generati per azienda, ordinati per categoria catalogo.
 *
 *   GEN_OUTPUT_EXPORT.exportZip(client, cfg, aziendaId, aziendaNome, items, catalog)
 *
 * items: [{ name, codice, ... }]  — file nel bucket output/{aziendaId}/
 * catalog: righe documenti_catalogo (ordine seed)
 */
(function () {
  'use strict';

  const ALTRO = 'Altro';

  function safeFolder(name) {
    return String(name || ALTRO).replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim() || ALTRO;
  }

  function safeFileName(name) {
    return String(name || 'file').replace(/[<>:"/\\|?*]/g, '_');
  }

  function buildCatalogIndex(catalog) {
    const byCodice = {};
    const catMinOrd = {};
    (catalog || []).forEach((doc) => {
      const codice = doc.codice;
      if (!codice) return;
      const cat = doc.categoria || ALTRO;
      byCodice[codice] = cat;
      const ord = doc.ordine ?? 9999;
      if (catMinOrd[cat] == null || ord < catMinOrd[cat]) catMinOrd[cat] = ord;
    });
    const categories = Object.keys(catMinOrd).sort((a, b) => catMinOrd[a] - catMinOrd[b]);
    if (!categories.includes(ALTRO)) categories.push(ALTRO);
    return { byCodice, categories };
  }

  function groupByCategory(items, catalog) {
    const { byCodice, categories } = buildCatalogIndex(catalog);
    const groups = {};
    categories.forEach((c) => { groups[c] = []; });

    (items || []).forEach((item) => {
      const cat = byCodice[item.codice] || ALTRO;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => String(a.name).localeCompare(String(b.name), 'it'));
    });

    return { groups, categories: categories.filter((c) => groups[c]?.length) };
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function zipFileName(aziendaNome) {
    const base = safeFileName(aziendaNome).replace(/\s+/g, '_').slice(0, 60);
    const d = new Date();
    const ymd = d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');
    return base + '_documenti_' + ymd + '.zip';
  }

  async function downloadFile(client, bucket, path) {
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  }

  /**
   * Scarica tutti i documenti dell'azienda in un ZIP con cartelle per categoria seed.
   */
  async function exportZip(client, cfg, aziendaId, aziendaNome, items, catalog) {
    if (!window.JSZip) throw new Error('JSZip non caricato');
    if (!items?.length) throw new Error('Nessun documento da esportare');

    const zip = new JSZip();
    const { groups, categories } = groupByCategory(items, catalog);
    const bucket = cfg.storage.output;
    let done = 0;

    for (const cat of categories) {
      const folder = zip.folder(safeFolder(cat));
      for (const item of groups[cat]) {
        const path = aziendaId + '/' + item.name;
        const blob = await downloadFile(client, bucket, path);
        folder.file(safeFileName(item.name), blob);
        done += 1;
      }
    }

    if (!done) throw new Error('Nessun file scaricato');
    const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    triggerDownload(out, zipFileName(aziendaNome || aziendaId));
    return done;
  }

  window.GEN_OUTPUT_EXPORT = { exportZip, groupByCategory, safeFolder };
})();
