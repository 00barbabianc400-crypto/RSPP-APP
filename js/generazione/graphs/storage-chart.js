/**
 * GEN_STORAGE_CHART — grafici SVG dark/vividi (Generazione + Monitoraggio).
 * Nessuna libreria esterna.
 */
(function () {
  'use strict';

  const DEFAULT_QUOTA = 1 * 1024 * 1024 * 1024;

  const THEME = {
    bg: '#0f1419',
    bgPanel: '#161b22',
    border: '#30363d',
    text: '#f0f6fc',
    textMuted: '#8b949e',
    textDim: '#6e7681',
    font: 'Segoe UI, system-ui, sans-serif',
    palette: [
      '#58a6ff', '#3fb950', '#f78166', '#d2a8ff', '#ffa657',
      '#79c0ff', '#56d364', '#ff7b72', '#bc8cff', '#e3b341',
      '#1f6feb', '#238636', '#da3633', '#8957e5', '#9e6a03',
    ],
    free: '#21262d',
    freeStroke: '#484f58',
    warn: '#ffa657',
    danger: '#f85149',
    ok: '#3fb950',
  };

  function fmt(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  function fmtNum(n) {
    const x = Number(n) || 0;
    if (x >= 1e6) return (x / 1e6).toFixed(2) + ' M';
    if (x >= 1e4) return (x / 1e3).toFixed(1) + ' k';
    return x.toLocaleString('it-IT');
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function pct(part, total) {
    if (!total) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
  }

  async function listFiles(client, bucket, prefix) {
    const { data } = await client.storage.from(bucket).list(prefix || '', {
      limit: 1000,
      sortBy: { column: 'name', order: 'desc' },
    });
    return (data || []).filter((f) => f.name && !f.name.endsWith('/'));
  }

  function arc(cx, cy, r, a1, a2) {
    const rad = (a) => (a - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(rad(a1));
    const y1 = cy + r * Math.sin(rad(a1));
    const x2 = cx + r * Math.cos(rad(a2));
    const y2 = cy + r * Math.sin(rad(a2));
    return `M${x1} ${y1} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  }

  /** Donut generico — segments: [{ label, value, color? }] */
  function renderDonut(segments, centerTop, centerBot, opts) {
    const o = opts || {};
    const S = o.size || 188;
    const cx = S / 2;
    const cy = S / 2;
    const r = o.radius || 72;
    const sw = o.stroke || 24;
    const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
    let svg = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;flex-shrink:0;font-family:${THEME.font};">`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${THEME.freeStroke}" stroke-width="${sw}" opacity="0.45"/>`;
    let ang = 0;
    segments.forEach((seg, i) => {
      const val = Number(seg.value) || 0;
      if (val <= 0) return;
      const sweep = Math.min(359.99, (val / total) * 360);
      if (sweep < 0.25) { ang += sweep; return; }
      const color = seg.color || THEME.palette[i % THEME.palette.length];
      svg += `<path d="${arc(cx, cy, r, ang, ang + sweep)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt">`;
      svg += `<title>${esc(seg.label)}: ${esc(fmtNum(val))}</title></path>`;
      ang += sweep;
    });
    svg += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="18" font-weight="700" fill="${THEME.text}">${esc(centerTop)}</text>`;
    svg += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="12" fill="${THEME.textMuted}">${esc(centerBot)}</text>`;
    svg += '</svg>';
    return svg;
  }

  function renderLegend(segments, valueFmt) {
    const vf = valueFmt || fmtNum;
    return segments.filter((s) => (Number(s.value) || 0) > 0).map((s, i) => `
      <div class="gen-chart-legend-row">
        <span class="gen-chart-swatch" style="background:${s.color || THEME.palette[i % THEME.palette.length]};"></span>
        <span class="gen-chart-legend-label" title="${esc(s.label)}">${esc(s.label)}</span>
        <span class="gen-chart-legend-val">${vf(s.value)}</span>
      </div>`).join('');
  }

  function renderHBar(items, opts) {
    const o = opts || {};
    const maxVal = o.maxVal || Math.max(...items.map((i) => Number(i.n ?? i.value) || 0), 1);
    const valueKey = o.valueKey || 'n';
    const labelKey = o.labelKey || 'nome';
    return items.map((it, i) => {
      const n = Number(it[valueKey] ?? it.value) || 0;
      const w = Math.max(3, (n / maxVal) * 100);
      const color = it.color || THEME.palette[i % THEME.palette.length];
      const label = it[labelKey] ?? it.label ?? '—';
      return `<div class="gen-chart-hbar-row">
        <div class="gen-chart-hbar-head">
          <span class="gen-chart-hbar-label" title="${esc(label)}">${esc(label)}</span>
          <span class="gen-chart-hbar-val">${fmtNum(n)}</span>
        </div>
        <div class="gen-chart-hbar-track"><div class="gen-chart-hbar-fill" style="width:${w.toFixed(1)}%;background:${color};"></div></div>
      </div>`;
    }).join('');
  }

  function renderProgressBar(label, used, quota, hint, opts) {
    const o = opts || {};
    const p = Math.min(100, (used / (quota || 1)) * 100);
    const color = p > 90 ? THEME.danger : p > 70 ? THEME.warn : THEME.ok;
    const fmtUsed = o.fmtUsed || fmt;
    return `<div class="gen-chart-progress">
      <div class="gen-chart-progress-head">
        <span>${esc(label)}</span>
        <span>${fmtUsed(used)} / ${fmtUsed(quota)}</span>
      </div>
      <div class="gen-chart-progress-track"><div class="gen-chart-progress-fill" style="width:${p.toFixed(1)}%;background:${color};"></div></div>
      ${hint ? `<div class="gen-chart-progress-hint">${esc(hint)}</div>` : ''}
    </div>`;
  }

  function injectChartStylesOnce() {
    if (document.getElementById('gen-chart-styles')) return;
    const el = document.createElement('style');
    el.id = 'gen-chart-styles';
    el.textContent = `
      .gen-chart-panel{background:${THEME.bgPanel};border:1px solid ${THEME.border};border-radius:8px;padding:16px 18px;}
      .gen-chart-title{margin:0 0 14px;font-size:15px;font-weight:600;color:${THEME.text};letter-spacing:.01em;}
      .gen-chart-sub{font-size:12px;color:${THEME.textMuted};margin:-8px 0 12px;}
      .gen-chart-body{display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;}
      .gen-chart-legend{flex:1;min-width:180px;max-height:220px;overflow-y:auto;padding-top:2px;}
      .gen-chart-legend-row{display:flex;align-items:center;gap:10px;padding:5px 0;min-width:0;}
      .gen-chart-swatch{flex-shrink:0;width:12px;height:12px;border-radius:3px;}
      .gen-chart-legend-label{flex:1;font-size:13px;color:${THEME.textMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .gen-chart-legend-val{font-size:13px;font-weight:600;color:${THEME.text};white-space:nowrap;}
      .gen-chart-hbar-row{margin-bottom:10px;}
      .gen-chart-hbar-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:5px;}
      .gen-chart-hbar-label{font-size:13px;color:${THEME.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72%;font-weight:500;}
      .gen-chart-hbar-val{font-size:13px;font-weight:700;color:${THEME.text};}
      .gen-chart-hbar-track{background:${THEME.bg};border-radius:6px;height:10px;overflow:hidden;border:1px solid ${THEME.border};}
      .gen-chart-hbar-fill{height:100%;border-radius:6px;transition:width .45s ease;}
      .gen-chart-progress{margin-bottom:16px;}
      .gen-chart-progress-head{display:flex;justify-content:space-between;font-size:13px;font-weight:500;color:${THEME.text};margin-bottom:6px;gap:12px;}
      .gen-chart-progress-track{background:${THEME.bg};border-radius:6px;height:10px;overflow:hidden;border:1px solid ${THEME.border};}
      .gen-chart-progress-fill{height:100%;border-radius:6px;transition:width .45s ease;}
      .gen-chart-progress-hint{font-size:11px;color:${THEME.textDim};margin-top:4px;}
      .gen-chart-foot{font-size:11px;color:${THEME.textDim};margin-top:10px;}
    `;
    document.head.appendChild(el);
  }

  function chartPanel(title, subtitle, innerHtml, foot) {
    injectChartStylesOnce();
    return `<div class="gen-chart-panel">
      <h3 class="gen-chart-title">${esc(title)}</h3>
      ${subtitle ? `<p class="gen-chart-sub">${esc(subtitle)}</p>` : ''}
      ${innerHtml}
      ${foot ? `<div class="gen-chart-foot">${esc(foot)}</div>` : ''}
    </div>`;
  }

  function shell(svgHtml, legendHtml, foot) {
    injectChartStylesOnce();
    return `<div class="gen-chart-body">${svgHtml}<div class="gen-chart-legend">${legendHtml}</div></div>${foot ? `<div class="gen-chart-foot">${esc(foot)}</div>` : ''}`;
  }

  async function renderOutputByAzienda(containerEl, client, cfg, nomiMap) {
    if (!containerEl) return;
    injectChartStylesOnce();
    containerEl.innerHTML = '<p style="font-size:13px;color:#8b949e;padding:8px 0;">Calcolo spazio documenti generati…</p>';
    try {
      const quota = cfg.QUOTA_BYTES || DEFAULT_QUOTA;
      const { data: rawRoot } = await client.storage.from(cfg.storage.output).list('', { limit: 1000 });
      const folders = (rawRoot || []).filter((f) => f.id == null || !f.name.includes('.'));

      const byAzienda = {};
      if (folders.length > 0) {
        await Promise.all(folders.map(async (f) => {
          const id = f.name.replace(/\/$/, '');
          const files = await listFiles(client, cfg.storage.output, id);
          byAzienda[id] = files.reduce((s, ff) => s + (ff.metadata?.size || 0), 0);
        }));
      } else {
        const rootItems = await listFiles(client, cfg.storage.output);
        rootItems.forEach((f) => {
          const parts = f.name.split('/');
          const id = parts.length > 1 ? parts[0] : 'output';
          byAzienda[id] = (byAzienda[id] || 0) + (f.metadata?.size || 0);
        });
      }

      const sorted = Object.entries(byAzienda).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      if (!sorted.length) {
        containerEl.innerHTML = chartPanel('Storage output', 'Bucket modelli generati', '<p style="font-size:13px;color:#8b949e;">Nessun documento generato ancora.</p>');
        return;
      }

      const totalOutput = sorted.reduce((s, [, v]) => s + v, 0);
      const segments = sorted.map(([id, bytes], i) => ({
        label: (nomiMap && nomiMap[id]) || id,
        value: bytes,
        color: THEME.palette[i % THEME.palette.length],
      }));

      const legendSegs = segments.map((s) => ({ ...s, value: s.value }));
      const donutSegs = [...segments];
      const freeInOutput = Math.max(0, quota - totalOutput);
      if (freeInOutput > 0) donutSegs.push({ label: 'Libero', value: freeInOutput, color: THEME.free });

      containerEl.innerHTML = chartPanel(
        'Storage output',
        'Documenti generati per azienda',
        shell(
          renderDonut(donutSegs, fmt(totalOutput), 'generati', { size: 188 }),
          renderLegend(legendSegs, fmt),
          fmt(totalOutput) + ' usati · quota ref. ' + fmt(quota)
        )
      );
    } catch (err) {
      containerEl.innerHTML = `<p style="font-size:13px;color:${THEME.danger};padding:8px 0;">Errore storage: ${esc(err.message)}</p>`;
    }
  }

  async function renderOutputByDocumento(containerEl, client, cfg, aziendaId, aziendaNome) {
    if (!containerEl || !aziendaId) return;
    injectChartStylesOnce();
    containerEl.innerHTML = '<p style="font-size:13px;color:#8b949e;padding:8px 0;">Calcolo spazio…</p>';
    try {
      const quota = cfg.QUOTA_BYTES || DEFAULT_QUOTA;
      const files = await listFiles(client, cfg.storage.output, aziendaId);
      if (!files.length) {
        containerEl.innerHTML = '<p style="font-size:13px;color:#8b949e;">Nessun documento generato per questa azienda.</p>';
        return;
      }

      const byDoc = {};
      files.forEach((f) => {
        const stem = f.name.replace(/\.[^.]+$/, '');
        const m = stem.match(/^(.+?)_\d{8}/);
        const codice = m ? m[1] : stem;
        byDoc[codice] = (byDoc[codice] || 0) + (f.metadata?.size || 0);
      });

      const totalAz = Object.values(byDoc).reduce((s, v) => s + v, 0);
      const sorted = Object.entries(byDoc).sort((a, b) => b[1] - a[1]);
      const segments = sorted.map(([cod, bytes], i) => ({
        label: cod,
        value: bytes,
        color: THEME.palette[i % THEME.palette.length],
      }));

      const freeSlice = Math.max(0, quota - totalAz);
      const donutSegs = [...segments];
      if (freeSlice > 0) donutSegs.push({ label: 'Resto quota', value: freeSlice, color: THEME.free });

      containerEl.innerHTML = shell(
        renderDonut(donutSegs, fmt(totalAz), esc(aziendaNome || aziendaId)),
        renderLegend(segments, fmt),
        fmt(totalAz) + ' — ' + files.length + ' file'
      );
    } catch (err) {
      containerEl.innerHTML = `<p style="font-size:13px;color:${THEME.danger};">Errore: ${esc(err.message)}</p>`;
    }
  }

  window.GEN_STORAGE_CHART = {
    THEME,
    fmt,
    fmtNum,
    pct,
    renderDonut,
    renderLegend,
    renderHBar,
    renderProgressBar,
    chartPanel,
    injectChartStylesOnce,
    renderOutputByAzienda,
    renderOutputByDocumento,
  };
})();
