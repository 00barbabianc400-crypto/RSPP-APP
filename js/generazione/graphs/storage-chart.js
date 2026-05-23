/**
 * GEN_STORAGE_CHART  —  grafico a torta (donut SVG) per lo spazio Supabase Storage.
 *
 * API pubblica:
 *   GEN_STORAGE_CHART.render(containerEl, supabaseClient, config)
 *   GEN_STORAGE_CHART.renderAziendaBadge(containerEl, supabaseClient, config, aziendaId)
 *
 * config: { storage: { modelli, output, loghi }, QUOTA_BYTES? }   (QUOTA_BYTES default 1 GB)
 *
 * Usa solo list() sugli stessi bucket già usati dall'app — nessuna API nuova.
 */
(function () {
  'use strict';

  const DEFAULT_QUOTA = 1 * 1024 * 1024 * 1024; // 1 GB

  // Palette — un colore per azienda, poi uno per modelli, uno per libero
  const PALETTE = [
    '#3498db','#2ecc71','#e67e22','#9b59b6','#e74c3c',
    '#1abc9c','#f39c12','#d35400','#16a085','#8e44ad',
    '#27ae60','#c0392b','#2980b9','#f1c40f','#7f8c8d',
  ];
  const COLOR_MODELLI = '#4a90d9';
  const COLOR_FREE    = '#2a2a2a';
  const COLOR_FREE_STROKE = '#444';

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function pct(bytes, quota) {
    return Math.min(100, (bytes / quota) * 100);
  }

  // ── raccolta dati ─────────────────────────────────────────────────────────

  async function listAllFiles(client, bucket, prefix) {
    const { data } = await client.storage.from(bucket).list(prefix || '', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    return data || [];
  }

  /**
   * Restituisce { modelliBytes, byAzienda: { [id]: bytes }, loghiBytes }
   */
  async function collectUsage(client, cfg) {
    const [modelliFiles, loghiFiles] = await Promise.all([
      listAllFiles(client, cfg.storage.modelli),
      listAllFiles(client, cfg.storage.loghi),
    ]);

    const modelliBytes = modelliFiles
      .filter(f => f.name && !f.name.endsWith('/'))
      .reduce((s, f) => s + (f.metadata?.size || 0), 0);

    const loghiBytes = loghiFiles
      .filter(f => f.name && !f.name.endsWith('/'))
      .reduce((s, f) => s + (f.metadata?.size || 0), 0);

    // Per output dobbiamo listare ogni sotto-cartella (una per azienda)
    // Prima otteniamo le cartelle radice del bucket output
    const rootOutput = await listAllFiles(client, cfg.storage.output);
    const aziendaFolders = rootOutput.filter(f => f.id == null || f.name.endsWith('/')).map(f => f.name.replace(/\/$/, ''));
    // Supabase restituisce le cartelle come oggetti senza estensione; se la list restituisce
    // file diretti (formato bucket flat), usiamo il path come azienda_id
    const byAzienda = {};

    if (aziendaFolders.length > 0) {
      await Promise.all(aziendaFolders.map(async (folder) => {
        const files = await listAllFiles(client, cfg.storage.output, folder);
        const size = files.filter(f => f.name && !f.name.endsWith('/'))
          .reduce((s, f) => s + (f.metadata?.size || 0), 0);
        byAzienda[folder] = (byAzienda[folder] || 0) + size;
      }));
    } else {
      // Bucket flat: ogni file si chiama aziendaId/filename
      // Proviamo a listare tutte le cartelle tramite prefisso vuoto con delimiter
      // Fallback: rendiamo tutto come un bucket unico
      const allOut = await listAllFiles(client, cfg.storage.output, '');
      allOut.filter(f => f.name && !f.name.endsWith('/')).forEach(f => {
        // Il nome di lista al livello radice restituisce solo il nome della sotto-cartella
        byAzienda['output'] = (byAzienda['output'] || 0) + (f.metadata?.size || 0);
      });
    }

    return { modelliBytes, loghiBytes, byAzienda };
  }

  // ── SVG donut ─────────────────────────────────────────────────────────────

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const toRad = a => (a - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = (endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  function buildDonutSvg(segments, cx, cy, r, stroke, centerLabel, centerSub) {
    let svg = `<svg viewBox="0 0 ${cx * 2} ${cy * 2}" width="${cx * 2}" height="${cy * 2}" style="display:block;">`;
    // sfondo cerchio
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLOR_FREE_STROKE}" stroke-width="${stroke}" opacity="0.4"/>`;

    let angle = 0;
    for (const seg of segments) {
      const sweep = (seg.bytes / seg.total) * 360;
      if (sweep < 0.5) { angle += sweep; continue; }
      const end = angle + sweep;
      const path = describeArc(cx, cy, r, angle, end);
      svg += `<path d="${path}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-linecap="butt">
        <title>${seg.label}: ${formatBytes(seg.bytes)}</title>
      </path>`;
      angle = end;
    }

    // testo centrale
    svg += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">${centerLabel}</text>`;
    svg += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="#aaa">${centerSub}</text>`;
    svg += `</svg>`;
    return svg;
  }

  // ── legenda ───────────────────────────────────────────────────────────────

  function buildLegend(segments, quota) {
    return segments.map(seg => {
      const p = ((seg.bytes / quota) * 100).toFixed(1);
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${seg.color};flex-shrink:0;"></span>
        <span style="font-size:11.5px;color:#ccc;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${seg.label}">${seg.label}</span>
        <span style="font-size:11px;color:#aaa;white-space:nowrap;">${formatBytes(seg.bytes)} <span style="color:#666;">(${p}%)</span></span>
      </div>`;
    }).join('');
  }

  // ── render principale (nessuna azienda selezionata) ───────────────────────

  async function render(containerEl, client, cfg, aziendaNomiMap) {
    if (!containerEl) return;
    containerEl.innerHTML = '<p style="font-size:12px;color:#aaa;padding:12px;">Caricamento utilizzo storage…</p>';

    try {
      const quota = cfg.QUOTA_BYTES || DEFAULT_QUOTA;
      const { modelliBytes, loghiBytes, byAzienda } = await collectUsage(client, cfg);

      const totalOutput = Object.values(byAzienda).reduce((s, v) => s + v, 0);
      const totalUsed = modelliBytes + loghiBytes + totalOutput;
      const freeBytes = Math.max(0, quota - totalUsed);

      // Costruisci segmenti
      const segments = [];

      // Modelli (bucket condiviso)
      if (modelliBytes > 0) {
        segments.push({ label: 'Modelli (template)', bytes: modelliBytes, color: COLOR_MODELLI, total: quota });
      }

      // Loghi (se significativi)
      if (loghiBytes > 0) {
        segments.push({ label: 'Loghi', bytes: loghiBytes, color: '#95a5a6', total: quota });
      }

      // Output per azienda
      const sortedAziende = Object.entries(byAzienda)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

      sortedAziende.forEach(([id, bytes], idx) => {
        const nome = (aziendaNomiMap && aziendaNomiMap[id]) || id;
        segments.push({
          label: nome,
          bytes,
          color: PALETTE[idx % PALETTE.length],
          total: quota,
        });
      });

      // Spazio libero
      if (freeBytes > 0) {
        segments.push({ label: 'Libero', bytes: freeBytes, color: COLOR_FREE, total: quota });
      }

      const usedPct = pct(totalUsed, quota);
      const centerLabel = formatBytes(freeBytes);
      const centerSub = 'liberi';

      const svgHtml = buildDonutSvg(segments, 90, 90, 68, 18, centerLabel, centerSub);
      const legendHtml = buildLegend(segments.filter(s => s.label !== 'Libero'), quota);

      // Barra % uso
      const barColor = usedPct > 90 ? '#e74c3c' : usedPct > 70 ? '#e67e22' : '#2ecc71';

      containerEl.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;">
          <div style="flex-shrink:0;">${svgHtml}</div>
          <div style="flex:1;min-width:180px;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;">
              ${formatBytes(totalUsed)} usati di ${formatBytes(quota)} totali
            </div>
            <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;margin-bottom:12px;">
              <div style="width:${usedPct.toFixed(1)}%;height:100%;background:${barColor};transition:width .5s;"></div>
            </div>
            <div style="max-height:220px;overflow-y:auto;">${legendHtml}</div>
          </div>
        </div>`;
    } catch (err) {
      containerEl.innerHTML = '<p style="font-size:12px;color:#e74c3c;padding:8px;">Errore caricamento storage: ' + err.message + '</p>';
    }
  }

  // ── badge singola azienda ─────────────────────────────────────────────────

  async function renderAziendaBadge(containerEl, client, cfg, aziendaId, aziendaNome) {
    if (!containerEl || !aziendaId) return;
    containerEl.innerHTML = '<span style="font-size:11px;color:#888;">Caricamento…</span>';
    try {
      const quota = cfg.QUOTA_BYTES || DEFAULT_QUOTA;
      const files = await listAllFiles(client, cfg.storage.output, aziendaId);
      const bytes = files.filter(f => f.name && !f.name.endsWith('/'))
        .reduce((s, f) => s + (f.metadata?.size || 0), 0);

      const p = pct(bytes, quota);
      const color = p > 10 ? '#e67e22' : '#2ecc71';

      containerEl.innerHTML = `
        <span style="font-size:11.5px;color:#aaa;">
          <span style="font-weight:600;color:${color};">${formatBytes(bytes)}</span>
          nel cloud (${p.toFixed(2)}% quota)
        </span>`;
    } catch (_) {
      containerEl.innerHTML = '';
    }
  }

  // ── export ────────────────────────────────────────────────────────────────

  window.GEN_STORAGE_CHART = { render, renderAziendaBadge, formatBytes };
})();
