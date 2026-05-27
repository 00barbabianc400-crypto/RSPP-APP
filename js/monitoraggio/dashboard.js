/**
 * MONITORAGGIO_DASH — pannello admin, SVG puro, payload da fn_statistiche_monitoraggio.
 */
(function () {
  'use strict';

  const DB_QUOTA_PRO = 8 * 1024 * 1024 * 1024;
  const PALETTE = ['#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#6c5ce7'];

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmtNum(n) {
    const x = Number(n) || 0;
    if (x >= 1e6) return (x / 1e6).toFixed(2) + ' M';
    if (x >= 1e4) return (x / 1e3).toFixed(1) + ' k';
    return x.toLocaleString('it-IT');
  }

  function fmtBytes(b) {
    const x = Number(b) || 0;
    if (x < 1024) return x + ' B';
    if (x < 1048576) return (x / 1024).toFixed(1) + ' KB';
    if (x < 1073741824) return (x / 1048576).toFixed(1) + ' MB';
    return (x / 1073741824).toFixed(2) + ' GB';
  }

  function fmtPct(part, total) {
    if (!total) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
  }

  function arc(cx, cy, r, a1, a2) {
    const rad = a => (a - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
    const x2 = cx + r * Math.cos(rad(a2)), y2 = cy + r * Math.sin(rad(a2));
    return `M${x1} ${y1} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  }

  function donut(segments, centerTop, centerBot) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const S = 160, cx = S / 2, cy = S / 2, r = 60, sw = 20;
    let svg = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;">`;
    let ang = 0;
    for (const seg of segments) {
      const sweep = Math.min(359.99, (seg.value / total) * 360);
      if (sweep < 0.3) { ang += sweep; continue; }
      svg += `<path d="${arc(cx, cy, r, ang, ang + sweep)}" fill="none" stroke="${seg.color}" stroke-width="${sw}"><title>${esc(seg.label)}: ${fmtNum(seg.value)}</title></path>`;
      ang += sweep;
    }
    svg += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="15" font-weight="700" fill="#f0f0f0">${esc(centerTop)}</text>`;
    svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="#888">${esc(centerBot)}</text></svg>`;
    return svg;
  }

  function hBar(items, maxVal) {
    const m = maxVal || Math.max(...items.map(i => i.n), 1);
    return items.map((it, i) => {
      const w = Math.max(2, (it.n / m) * 100);
      return `<div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#aaa;margin-bottom:3px;">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;" title="${esc(it.nome)}">${esc(it.nome)}</span>
          <span>${fmtNum(it.n)}</span>
        </div>
        <div style="background:#1a1a1a;border-radius:3px;height:8px;overflow:hidden;">
          <div style="width:${w.toFixed(1)}%;height:100%;background:${PALETTE[i % PALETTE.length]};"></div>
        </div>
      </div>`;
    }).join('');
  }

  function progressBar(label, used, quota, hint) {
    const p = Math.min(100, (used / quota) * 100);
    const color = p > 90 ? '#e74c3c' : p > 70 ? '#e67e22' : '#2ecc71';
    return `<div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#ccc;margin-bottom:4px;">
        <span>${esc(label)}</span>
        <span>${fmtBytes(used)} / ${fmtBytes(quota)}</span>
      </div>
      <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;">
        <div style="width:${p.toFixed(1)}%;height:100%;background:${color};"></div>
      </div>
      ${hint ? `<div style="font-size:10px;color:#666;margin-top:3px;">${esc(hint)}</div>` : ''}
    </div>`;
  }

  function kpi(label, value, sub) {
    return `<div class="mon-kpi">
      <div class="mon-kpi-val">${esc(value)}</div>
      <div class="mon-kpi-label">${esc(label)}</div>
      ${sub ? `<div class="mon-kpi-sub">${esc(sub)}</div>` : ''}
    </div>`;
  }

  function buildAlerts(stats) {
    const c = stats.conteggi || {};
    const s = stats.stima || {};
    const a = stats.anomalie || {};
    const alerts = [];
    const delta = Number(s.delta_righe) || 0;
    if (Math.abs(delta) > Math.max(500, (s.righe_teoriche || 0) * 0.05)) {
      alerts.push({
        level: delta > 0 ? 'warn' : 'info',
        text: delta > 0
          ? `+${fmtNum(delta)} valutazioni oltre la stima teorica (possibili duplicati o profili legacy).`
          : `${fmtNum(Math.abs(delta))} valutazioni mancanti rispetto alla stima (sync catalogo/fasi consigliato).`
      });
    }
    if ((a.aziende_senza_profili || 0) > 0) {
      alerts.push({ level: 'info', text: `${a.aziende_senza_profili} aziende senza profili associati.` });
    }
    if ((a.profili_senza_associazioni || 0) > 0) {
      alerts.push({ level: 'info', text: `${a.profili_senza_associazioni} profili attivi non associati ad alcuna azienda.` });
    }
    const dbB = stats.db?.database_bytes || 0;
    if (dbB > DB_QUOTA_PRO * 0.85) {
      alerts.push({ level: 'warn', text: `Database oltre l'85% della quota Pro inclusa (8 GB).` });
    }
    if (!alerts.length) {
      alerts.push({ level: 'ok', text: 'Nessuna anomalia rilevata sui conteggi aggregati.' });
    }
    return alerts;
  }

  function injectStylesOnce() {
    if (document.getElementById('mon-dash-styles')) return;
    const el = document.createElement('style');
    el.id = 'mon-dash-styles';
    el.textContent = `
      .mon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:18px;}
      .mon-kpi{background:var(--sp-bg-secondary,#1e1e1e);border:1px solid var(--sp-border,#333);border-radius:6px;padding:14px 12px;}
      .mon-kpi-val{font-size:22px;font-weight:700;color:var(--sp-text,#f0f0f0);line-height:1.1;}
      .mon-kpi-label{font-size:11px;color:var(--sp-text-secondary,#999);margin-top:4px;}
      .mon-kpi-sub{font-size:10px;color:#666;margin-top:2px;}
      .mon-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      @media(max-width:900px){.mon-cols{grid-template-columns:1fr;}}
      .mon-alert{padding:8px 12px;border-radius:4px;font-size:12px;margin-bottom:8px;border-left:3px solid;}
      .mon-alert.ok{border-color:#2ecc71;background:rgba(46,204,113,.08);color:#9fdfb8;}
      .mon-alert.info{border-color:#3498db;background:rgba(52,152,219,.08);color:#9ecae8;}
      .mon-alert.warn{border-color:#e67e22;background:rgba(230,126,34,.1);color:#f0c090;}
    `;
    document.head.appendChild(el);
  }

  function render(container, stats, meta) {
    if (!container || !stats) return;
    injectStylesOnce();
    const c = stats.conteggi || {};
    const s = stats.stima || {};
    const db = stats.db || {};
    const top = Array.isArray(stats.top_aziende_valutazioni) ? stats.top_aziende_valutazioni : [];
    const alerts = buildAlerts(stats);
    const totVal = Number(c.valutazioni_totali) || 0;
    const valProf = Number(c.valutazioni_profilo) || 0;
    const valFase = Number(c.valutazioni_fase) || 0;
    const presenti = Number(c.valutazioni_presenti) || 0;

    const donutSegs = [
      { label: 'Livello profilo', value: valProf, color: '#3498db' },
      { label: 'Per fase', value: valFase, color: '#2ecc71' }
    ].filter(x => x.value > 0);

    const genAt = stats.generato_il
      ? new Date(stats.generato_il).toLocaleString('it-IT')
      : '—';
    const metaLine = meta?.elapsedMs != null
      ? `Aggiornato ${genAt} · query ${meta.elapsedMs} ms · ~${meta.payloadKb || '?'} KB`
      : `Aggiornato ${genAt}`;

    container.innerHTML = `
      <p style="font-size:11px;color:#666;margin:0 0 16px;">${esc(metaLine)} · Egress billing: dashboard Supabase</p>
      <div class="mon-grid">
        ${kpi('Aziende', fmtNum(c.aziende))}
        ${kpi('Associazioni', fmtNum(c.associazioni), fmtNum(c.profili_attivi) + ' profili')}
        ${kpi('Valutazioni', fmtNum(totVal), fmtPct(presenti, totVal) + ' Presenti')}
        ${kpi('Fasi definite', fmtNum(c.profilo_fasi), 'media ' + (s.fasi_media_per_profilo ?? 0) + '/profilo')}
        ${kpi('Rischi attivi', fmtNum(c.rischi_attivi))}
        ${kpi('Utenti attivi', fmtNum(c.utenti_attivi))}
      </div>
      <div class="mon-cols">
        <div class="card"><div class="card-body">
          <h3 style="margin:0 0 12px;font-size:14px;">Valutazioni: profilo vs fase</h3>
          <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
            ${donutSegs.length ? donut(donutSegs, fmtNum(totVal), 'righe totali') : '<p style="color:#888;font-size:12px;">Nessuna valutazione.</p>'}
            <div style="flex:1;min-width:140px;font-size:11px;color:#aaa;">
              <div>Livello profilo: <strong style="color:#ccc;">${fmtNum(valProf)}</strong></div>
              <div>Per fase: <strong style="color:#ccc;">${fmtNum(valFase)}</strong></div>
              <div style="margin-top:8px;">Fattore fasi: <strong style="color:#ccc;">${s.fattore_espansione_fasi ?? 0}×</strong> (righe fase / profilo)</div>
              <div>Stima teorica: <strong style="color:#ccc;">${fmtNum(s.righe_teoriche)}</strong> · Δ ${fmtNum(s.delta_righe)}</div>
            </div>
          </div>
        </div></div>
        <div class="card"><div class="card-body">
          <h3 style="margin:0 0 12px;font-size:14px;">Top aziende per volume valutazioni</h3>
          ${top.length ? hBar(top, top[0]?.n) : '<p style="color:#888;font-size:12px;">Nessun dato.</p>'}
        </div></div>
      </div>
      <div class="mon-cols" style="margin-top:16px;">
        <div class="card"><div class="card-body">
          <h3 style="margin:0 0 12px;font-size:14px;">Spazio database Postgres</h3>
          ${progressBar('Database totale', db.database_bytes || 0, DB_QUOTA_PRO, 'Quota inclusa piano Pro ~8 GB')}
          ${progressBar('Tabella valutazioni_rischio', db.valutazioni_bytes || 0, db.database_bytes || 1, fmtPct(db.valutazioni_bytes, db.database_bytes) + ' del DB')}
        </div></div>
        <div class="card"><div class="card-body">
          <h3 style="margin:0 0 12px;font-size:14px;">Avvisi</h3>
          ${alerts.map(al => `<div class="mon-alert ${al.level}">${esc(al.text)}</div>`).join('')}
        </div></div>
      </div>
    `;
  }

  window.MONITORAGGIO_DASH = { render, fmtNum, fmtBytes };
})();
