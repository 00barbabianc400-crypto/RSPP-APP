/**
 * MONITORAGGIO_DASH — admin, payload da fn_statistiche_monitoraggio (senza RPC extra).
 */
(function () {
  'use strict';

  const DB_QUOTA_PRO = 8 * 1024 * 1024 * 1024;
  let _lastStats = null;
  let _lastMeta = null;

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function chart() {
    return window.GEN_STORAGE_CHART || null;
  }

  function fmtNum(n) {
    return chart()?.fmtNum?.(n) ?? String(Number(n) || 0);
  }

  function fmtBytes(b) {
    return chart()?.fmt?.(b) ?? String(b);
  }

  function fmtPct(part, total) {
    return chart()?.pct?.(part, total) ?? '0%';
  }

  function kpi(label, value, sub, accent) {
    const border = accent ? `border-left:3px solid ${accent};` : '';
    return `<div class="mon-kpi" style="${border}">
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
    const totVal = Number(c.valutazioni_totali) || 0;
    const teorico = Number(s.righe_teoriche) || 0;
    const copertura = teorico ? (totVal / teorico) * 100 : 0;

    if (teorico > 0 && copertura < 85) {
      alerts.push({ level: 'warn', text: `Copertura valutazioni ${copertura.toFixed(0)}% (${fmtNum(totVal)}/${fmtNum(teorico)} attese).` });
    }
    if ((a.aziende_senza_profili || 0) > 0) {
      alerts.push({ level: 'info', text: `${a.aziende_senza_profili} aziende senza profili associati.` });
    }
    if ((a.profili_senza_associazioni || 0) > 0) {
      alerts.push({ level: 'info', text: `${a.profili_senza_associazioni} profili attivi non associati ad alcuna azienda.` });
    }
    const valFase = Number(c.valutazioni_fase) || 0;
    if (valFase > 0) {
      alerts.push({ level: 'warn', text: `${fmtNum(valFase)} valutazioni fase legacy (modello attuale: solo profilo).` });
    }
    const dbB = stats.db?.database_bytes || 0;
    if (dbB > DB_QUOTA_PRO * 0.85) {
      alerts.push({ level: 'warn', text: 'Database oltre l\'85% della quota Pro (~8 GB).' });
    }
    return alerts;
  }

  function injectStylesOnce() {
    if (document.getElementById('mon-dash-styles')) return;
    const el = document.createElement('style');
    el.id = 'mon-dash-styles';
    el.textContent = `
      .mon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px;margin-bottom:16px;}
      .mon-kpi{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px 12px;}
      .mon-kpi-val{font-size:24px;font-weight:700;color:#f0f6fc;line-height:1.1;font-variant-numeric:tabular-nums;}
      .mon-kpi-label{font-size:12px;color:#8b949e;margin-top:5px;font-weight:500;}
      .mon-kpi-sub{font-size:11px;color:#6e7681;margin-top:3px;}
      .mon-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      @media(max-width:960px){.mon-cols{grid-template-columns:1fr;}}
      .mon-alert-strip{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
      .mon-alert{padding:7px 12px;border-radius:6px;font-size:12px;font-weight:500;border:1px solid;}
      .mon-alert.info{border-color:#388bfd66;background:#388bfd18;color:#79c0ff;}
      .mon-alert.warn{border-color:#ffa65766;background:#ffa65718;color:#ffa657;}
      .mon-meta{font-size:12px;color:#6e7681;margin:0 0 14px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;}
      .mon-actions{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto;}
    `;
    document.head.appendChild(el);
  }

  function render(container, stats, meta) {
    if (!container || !stats) return;
    _lastStats = stats;
    _lastMeta = meta || {};
    injectStylesOnce();
    chart()?.injectChartStylesOnce?.();

    const c = stats.conteggi || {};
    const s = stats.stima || {};
    const db = stats.db || {};
    const top = Array.isArray(stats.top_aziende_valutazioni) ? stats.top_aziende_valutazioni : [];
    const alerts = buildAlerts(stats);
    const totVal = Number(c.valutazioni_totali) || 0;
    const presenti = Number(c.valutazioni_presenti) || 0;
    const altri = Math.max(0, totVal - presenti);
    const teorico = Number(s.righe_teoriche) || 0;
    const coperturaPct = teorico ? ((totVal / teorico) * 100).toFixed(0) + '%' : '—';

    const genAt = stats.generato_il
      ? new Date(stats.generato_il).toLocaleString('it-IT')
      : '—';
    const metaLine = meta?.elapsedMs != null
      ? `Aggiornato ${genAt} · ${meta.elapsedMs} ms · ~${meta.payloadKb || '?'} KB`
      : `Aggiornato ${genAt}`;

    const CH = chart();
    const compSegs = [
      { label: 'Presente', value: presenti, color: '#ffa657' },
      { label: 'Non applicabile / altro', value: altri, color: '#58a6ff' },
    ].filter((x) => x.value > 0);

    const topBar = top.length && CH
      ? CH.chartPanel(
          'Top aziende per valutazioni',
          'Volume lavoro DVR per cliente',
          CH.renderHBar(top.slice(0, 8), { maxVal: top[0]?.n })
        )
      : CH?.chartPanel('Top aziende per valutazioni', '', '<p style="font-size:13px;color:#8b949e;">Nessun dato.</p>') || '';

    const compInner = compSegs.length && CH
      ? `<div class="gen-chart-body">${CH.renderDonut(compSegs, fmtNum(totVal), 'valutazioni')}<div class="gen-chart-legend">${CH.renderLegend(compSegs)}</div></div>`
      : '<p style="font-size:13px;color:#8b949e;">Nessuna valutazione.</p>';

    const compPanel = CH
      ? CH.chartPanel(
          'Stato valutazioni',
          fmtPct(presenti, totVal) + ' Presenti · copertura catalogo ' + coperturaPct,
          compInner
        )
      : '';

    const dbPanel = CH
      ? CH.chartPanel(
          'Spazio database Postgres',
          'Quota piano Pro ~8 GB',
          CH.renderProgressBar('Database totale', db.database_bytes || 0, DB_QUOTA_PRO, 'Spazio cluster PostgreSQL')
            + CH.renderProgressBar(
              'Tabella valutazioni_rischio',
              db.valutazioni_bytes || 0,
              db.database_bytes || 1,
              fmtPct(db.valutazioni_bytes, db.database_bytes) + ' del database'
            )
        )
      : '';

    container.innerHTML = `
      <div class="mon-meta">
        <span>${esc(metaLine)}</span>
        <div class="mon-actions">
          <button type="button" class="btn" id="monExportXlsxBtn">Esporta Excel</button>
        </div>
      </div>
      <div class="mon-grid">
        ${kpi('Aziende', fmtNum(c.aziende), null, '#58a6ff')}
        ${kpi('Associazioni', fmtNum(c.associazioni), fmtNum(c.profili_attivi) + ' profili attivi', '#3fb950')}
        ${kpi('Valutazioni', fmtNum(totVal), fmtPct(presenti, totVal) + ' Presenti', '#ffa657')}
        ${kpi('Copertura', coperturaPct, fmtNum(totVal) + ' / ' + fmtNum(teorico) + ' attese', '#d2a8ff')}
        ${kpi('Rischi attivi', fmtNum(c.rischi_attivi), fmtNum(c.testi_dvr) + ' testi DVR', '#f78166')}
        ${kpi('Rilevamenti', fmtNum(c.rilevamenti), fmtNum(c.utenti_attivi) + ' utenti attivi', '#79c0ff')}
      </div>
      ${alerts.length ? `<div class="mon-alert-strip">${alerts.map((al) => `<span class="mon-alert ${al.level}">${esc(al.text)}</span>`).join('')}</div>` : ''}
      <div class="mon-cols">
        ${topBar}
        ${compPanel}
      </div>
      <div class="mon-cols" style="margin-top:16px;">
        ${dbPanel}
        <div id="monOutputStorageChart"></div>
      </div>
    `;

    document.getElementById('monExportXlsxBtn')?.addEventListener('click', () => {
      if (!window.GEN_OUTPUT_EXPORT?.exportMonitoraggioXlsx) return;
      window.GEN_OUTPUT_EXPORT.exportMonitoraggioXlsx(_lastStats, _lastMeta)
        .then(() => {
          if (typeof showToast === 'function') showToast('Export Excel completato', 'success');
        })
        .catch((err) => {
          console.error(err);
          if (typeof showToast === 'function') showToast('Export fallito: ' + err.message, 'error');
        });
    });

    const storageEl = document.getElementById('monOutputStorageChart');
    if (storageEl && meta?.client && meta?.cfg && CH?.renderOutputByAzienda) {
      CH.renderOutputByAzienda(storageEl, meta.client, meta.cfg, meta.nomiMap || {});
    }
  }

  window.MONITORAGGIO_DASH = {
    render,
    fmtNum,
    fmtBytes,
    getLastStats: () => _lastStats,
  };
})();
