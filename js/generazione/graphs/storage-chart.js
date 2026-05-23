/**
 * GEN_STORAGE_CHART  —  donut SVG per lo Storage nella tab «Documenti generati».
 *
 * Comportamento:
 *   renderOutputByAzienda(el, client, cfg, nomiMap)
 *     → donut: spicchio per ogni azienda, basato su output/{id}/*
 *
 *   renderOutputByDocumento(el, client, cfg, aziendaId, aziendaNome)
 *     → donut: spicchio per ogni file generato di quell'azienda
 *
 * config richiede: { storage: { output }, QUOTA_BYTES? }
 * QUOTA_BYTES default: 1 GB (plan Free Supabase)
 *
 * Nessuna libreria esterna — SVG puro.
 */
(function () {
  'use strict';

  const DEFAULT_QUOTA = 1 * 1024 * 1024 * 1024; // 1 GB

  const PALETTE = [
    '#3498db','#2ecc71','#e67e22','#9b59b6','#e74c3c',
    '#1abc9c','#f39c12','#d35400','#16a085','#8e44ad',
    '#27ae60','#c0392b','#2980b9','#f1c40f','#7f8c8d',
    '#00b894','#fd79a8','#6c5ce7','#fdcb6e','#00cec9',
  ];
  const COLOR_FREE        = '#222';
  const COLOR_FREE_STROKE = '#444';

  // ── utilità ────────────────────────────────────────────────────────────────

  function fmt(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function listFiles(client, bucket, prefix) {
    const { data } = await client.storage.from(bucket).list(prefix || '', {
      limit: 1000,
      sortBy: { column: 'name', order: 'desc' },
    });
    return (data || []).filter(f => f.name && !f.name.endsWith('/'));
  }

  // ── SVG donut ──────────────────────────────────────────────────────────────

  function arc(cx, cy, r, a1, a2) {
    const rad = a => (a - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
    const x2 = cx + r * Math.cos(rad(a2)), y2 = cy + r * Math.sin(rad(a2));
    return `M${x1} ${y1} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  }

  function donut(segments, quota, centerTop, centerBot) {
    const S = 180, cx = S / 2, cy = S / 2, r = 68, sw = 22;
    let svg = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;flex-shrink:0;">`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLOR_FREE_STROKE}" stroke-width="${sw}" opacity="0.35"/>`;
    let ang = 0;
    for (const seg of segments) {
      const sweep = Math.min(359.99, (seg.bytes / quota) * 360);
      if (sweep < 0.3) { ang += sweep; continue; }
      svg += `<path d="${arc(cx, cy, r, ang, ang + sweep)}" fill="none" stroke="${seg.color}"
        stroke-width="${sw}" stroke-linecap="butt"><title>${esc(seg.label)}: ${esc(fmt(seg.bytes))}</title></path>`;
      ang += sweep;
    }
    svg += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="17" font-weight="700" fill="#f0f0f0">${esc(centerTop)}</text>`;
    svg += `<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="11" fill="#888">${esc(centerBot)}</text>`;
    svg += `</svg>`;
    return svg;
  }

  function legend(segments) {
    return segments.map(s => `
      <div style="display:flex;align-items:center;gap:8px;padding:3px 0;min-width:0;">
        <span style="flex-shrink:0;width:11px;height:11px;border-radius:2px;background:${s.color};"></span>
        <span style="flex:1;font-size:11.5px;color:#ccc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(s.label)}">${esc(s.label)}</span>
        <span style="font-size:11px;color:#888;white-space:nowrap;">${fmt(s.bytes)}</span>
      </div>`).join('');
  }

  function shell(svgHtml, legendHtml, usedBytes, quota, subtitle) {
    const p = Math.min(100, (usedBytes / quota) * 100);
    const barColor = p > 90 ? '#e74c3c' : p > 70 ? '#e67e22' : '#2ecc71';
    return `
      <div style="display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap;">
        ${svgHtml}
        <div style="flex:1;min-width:160px;padding-top:4px;">
          <div style="font-size:11px;color:#666;margin-bottom:6px;">${esc(subtitle)}</div>
          <div style="background:#1a1a1a;border-radius:4px;height:6px;overflow:hidden;margin-bottom:10px;">
            <div style="width:${p.toFixed(1)}%;height:100%;background:${barColor};transition:width .5s;"></div>
          </div>
          <div style="max-height:200px;overflow-y:auto;">${legendHtml}</div>
        </div>
      </div>`;
  }

  // ── renderOutputByAzienda ──────────────────────────────────────────────────
  // Tab «Documenti generati», nessuna azienda selezionata.
  // Mostra spicchi per ogni azienda (solo bucket output).

  async function renderOutputByAzienda(containerEl, client, cfg, nomiMap) {
    if (!containerEl) return;
    containerEl.style.display = '';
    containerEl.innerHTML = '<p style="font-size:12px;color:#888;padding:8px 0;">Calcolo spazio documenti generati…</p>';
    try {
      const quota = cfg.QUOTA_BYTES || DEFAULT_QUOTA;

      // Elenca cartelle/prefissi radice del bucket output
      const rootItems = await listFiles(client, cfg.storage.output);
      // Supabase restituisce le sottocartelle come item senza estensione con id=null
      const { data: rawRoot } = await client.storage.from(cfg.storage.output).list('', { limit: 1000 });
      const folders = (rawRoot || []).filter(f => f.id == null || !f.name.includes('.'));

      const byAzienda = {};
      if (folders.length > 0) {
        await Promise.all(folders.map(async f => {
          const id = f.name.replace(/\/$/, '');
          const files = await listFiles(client, cfg.storage.output, id);
          byAzienda[id] = files.reduce((s, ff) => s + (ff.metadata?.size || 0), 0);
        }));
      } else {
        // Bucket flat (tutti i file alla radice) — usa il rootItems
        rootItems.forEach(f => {
          const parts = f.name.split('/');
          const id = parts.length > 1 ? parts[0] : 'output';
          byAzienda[id] = (byAzienda[id] || 0) + (f.metadata?.size || 0);
        });
      }

      const totalOutput = Object.values(byAzienda).reduce((s, v) => s + v, 0);

      const sorted = Object.entries(byAzienda)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

      if (!sorted.length) {
        containerEl.innerHTML = '<p style="font-size:12px;color:#888;padding:8px 0;">Nessun documento generato ancora.</p>';
        return;
      }

      const segments = sorted.map(([id, bytes], i) => ({
        label: (nomiMap && nomiMap[id]) || id,
        bytes,
        color: PALETTE[i % PALETTE.length],
      }));

      const freeInOutput = Math.max(0, quota - totalOutput);
      const centerTop = fmt(totalOutput);
      const centerBot = 'documenti';

      const segsForDonut = segments.map(s => ({ ...s, bytes: s.bytes }));
      if (freeInOutput > 0) segsForDonut.push({ label: 'Libero', bytes: freeInOutput, color: COLOR_FREE });

      containerEl.innerHTML = shell(
        donut(segsForDonut, quota, centerTop, centerBot),
        legend(segments),
        totalOutput,
        quota,
        fmt(totalOutput) + ' usati di ' + fmt(quota) + ' — solo documenti generati'
      );
    } catch (err) {
      containerEl.innerHTML = '<p style="font-size:12px;color:#e74c3c;padding:8px 0;">Errore storage: ' + esc(err.message) + '</p>';
    }
  }

  // ── renderOutputByDocumento ────────────────────────────────────────────────
  // Tab «Documenti generati», azienda selezionata.
  // Mostra uno spicchio per ogni file generato di quell'azienda.

  async function renderOutputByDocumento(containerEl, client, cfg, aziendaId, aziendaNome) {
    if (!containerEl || !aziendaId) return;
    containerEl.style.display = '';
    containerEl.innerHTML = '<p style="font-size:12px;color:#888;padding:8px 0;">Calcolo spazio ' + esc(aziendaNome || aziendaId) + '…</p>';
    try {
      const quota = cfg.QUOTA_BYTES || DEFAULT_QUOTA;
      const files = await listFiles(client, cfg.storage.output, aziendaId);

      if (!files.length) {
        containerEl.innerHTML = '<p style="font-size:12px;color:#888;padding:8px 0;">Nessun documento generato per questa azienda.</p>';
        return;
      }

      // Raggruppa per codice documento (MOD_XXX)
      const byDoc = {};
      files.forEach(f => {
        const stem = f.name.replace(/\.[^.]+$/, '');
        // Formato atteso: MOD_XXX_YYYYMMDD — estraiamo MOD_XXX
        const m = stem.match(/^(.+?)_\d{8}/);
        const codice = m ? m[1] : stem;
        byDoc[codice] = (byDoc[codice] || 0) + (f.metadata?.size || 0);
      });

      const totalAz = Object.values(byDoc).reduce((s, v) => s + v, 0);
      const sorted = Object.entries(byDoc).sort((a, b) => b[1] - a[1]);

      const segments = sorted.map(([cod, bytes], i) => ({
        label: cod,
        bytes,
        color: PALETTE[i % PALETTE.length],
      }));

      const freeSlice = Math.max(0, quota - totalAz);
      const segsForDonut = [...segments];
      if (freeSlice > 0) segsForDonut.push({ label: 'Resto quota', bytes: freeSlice, color: COLOR_FREE });

      containerEl.innerHTML = shell(
        donut(segsForDonut, quota, fmt(totalAz), esc(aziendaNome || aziendaId)),
        legend(segments),
        totalAz,
        quota,
        fmt(totalAz) + ' — ' + files.length + ' file generati'
      );
    } catch (err) {
      containerEl.innerHTML = '<p style="font-size:12px;color:#e74c3c;padding:8px 0;">Errore storage: ' + esc(err.message) + '</p>';
    }
  }

  // ── export ─────────────────────────────────────────────────────────────────

  window.GEN_STORAGE_CHART = {
    renderOutputByAzienda,
    renderOutputByDocumento,
    fmt,
  };
})();
