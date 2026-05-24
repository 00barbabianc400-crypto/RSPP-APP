/**
 * GEN_OUTPUT_EXPORT — export ZIP documenti generati.
 *
 *   exportZip(client, cfg, aziendaId, aziendaNome, items, catalog)
 *   exportZipAll(client, cfg, nomiById, catalog)  — tutte le aziende
 *
 * items: [{ name, codice }]  — file in output/{aziendaId}/
 * nomiById: { [aziendaId]: 'Ragione Sociale' }
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

  function parseCodiceFromOutputName(name) {
    const stem = String(name || '').replace(/\.[^.]+$/, '');
    const m = stem.match(/^(.+?)_(\d{8})(?:T(\d{6}))?$/);
    return m ? m[1] : stem;
  }

  function isOutputFileEntry(name) {
    return name && !name.endsWith('/') && String(name).includes('.');
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

  function zipStamp() {
    const d = new Date();
    return d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');
  }

  function zipFileNameSingle(aziendaNome) {
    const base = safeFileName(aziendaNome).replace(/\s+/g, '_').slice(0, 60);
    return base + '_documenti_' + zipStamp() + '.zip';
  }

  function zipFileNameAll() {
    return 'documenti_generati_tutte_aziende_' + zipStamp() + '.zip';
  }

  /** Nome cartella azienda da id → ragione sociale (evita duplicati). */
  function resolveAziendaFolderName(aziendaId, nomiById, used) {
    const nome = (nomiById && nomiById[aziendaId]) || aziendaId;
    let base = safeFolder(nome);
    if (!used[base]) {
      used[base] = true;
      return base;
    }
    const withId = safeFolder(nome + ' (' + String(aziendaId).slice(0, 8) + ')');
    if (!used[withId]) {
      used[withId] = true;
      return withId;
    }
    const fallback = safeFolder(String(aziendaId));
    used[fallback] = true;
    return fallback;
  }

  async function downloadFile(client, bucket, path) {
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  }

  async function listOutputAziendaIds(client, bucket) {
    const { data, error } = await client.storage.from(bucket).list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    return (data || [])
      .filter((f) => f.name && (f.id == null || !String(f.name).includes('.')))
      .map((f) => String(f.name).replace(/\/$/, ''));
  }

  async function listOutputItemsForAzienda(client, bucket, aziendaId) {
    const { data, error } = await client.storage.from(bucket).list(aziendaId, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    return (data || [])
      .filter((f) => isOutputFileEntry(f.name))
      .map((f) => ({
        name: f.name,
        codice: parseCodiceFromOutputName(f.name),
      }));
  }

  /**
   * @param {JSZip} zip
   * @param {string|null} aziendaFolderName — se null, categorie alla radice dello zip
   */
  async function addItemsToZip(zip, client, bucket, aziendaId, items, catalog, aziendaFolderName) {
    const { groups, categories } = groupByCategory(items, catalog);
    const root = aziendaFolderName ? zip.folder(safeFolder(aziendaFolderName)) : zip;
    let done = 0;

    for (const cat of categories) {
      const folder = root.folder(safeFolder(cat));
      for (const item of groups[cat]) {
        const path = aziendaId + '/' + item.name;
        const blob = await downloadFile(client, bucket, path);
        folder.file(safeFileName(item.name), blob);
        done += 1;
      }
    }
    return done;
  }

  /** ZIP singola azienda: categorie catalogo alla radice. */
  async function exportZip(client, cfg, aziendaId, aziendaNome, items, catalog) {
    if (!window.JSZip) throw new Error('JSZip non caricato');
    if (!items?.length) throw new Error('Nessun documento da esportare');

    const zip = new JSZip();
    const bucket = cfg.storage.output;
    const done = await addItemsToZip(zip, client, bucket, aziendaId, items, catalog, null);
    if (!done) throw new Error('Nessun file scaricato');

    const out = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    triggerDownload(out, zipFileNameSingle(aziendaNome || aziendaId));
    return done;
  }

  /** ZIP globale: {RagioneSociale}/{Categoria}/file */
  async function exportZipAll(client, cfg, nomiById, catalog) {
    if (!window.JSZip) throw new Error('JSZip non caricato');

    const bucket = cfg.storage.output;
    const aziendaIds = await listOutputAziendaIds(client, bucket);
    if (!aziendaIds.length) throw new Error('Nessun documento nel bucket output');

    const zip = new JSZip();
    const usedFolders = {};
    let done = 0;
    let aziendeConFile = 0;

    for (const aziendaId of aziendaIds) {
      const items = await listOutputItemsForAzienda(client, bucket, aziendaId);
      if (!items.length) continue;

      const folderName = resolveAziendaFolderName(aziendaId, nomiById || {}, usedFolders);
      done += await addItemsToZip(zip, client, bucket, aziendaId, items, catalog, folderName);
      aziendeConFile += 1;
    }

    if (!done) throw new Error('Nessun file da esportare');

    const out = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    triggerDownload(out, zipFileNameAll());
    return { files: done, aziende: aziendeConFile };
  }

  window.GEN_OUTPUT_EXPORT = {
    exportZip,
    exportZipAll,
    groupByCategory,
    safeFolder,
    resolveAziendaFolderName,
  };
})();
