/**
 * Adapter MOD_MICROCLIMA — valutazione microclima (stub iniziale).
 * Registra window.GEN_ADAPTERS['MOD_MICROCLIMA']
 */
(function () {
  'use strict';

  /** Tipi catalogo «sessione tabellare»: una riga DB + JSON riquadri. */
  const MICRO_TABELLARE_NOMI_LOWER = new Set([
    'microclima — temperatura estiva',
    'microclima — temperatura invernale',
    'microclima — temperatura globo (tg)',
    'microclima — temperatura radiante (tr)',
  ]);

  function isTipoMicroclimaCatalogo(nomeTipo, rowOpt) {
    if (rowOpt && Array.isArray(rowOpt.dettaglio_microclima?.riquadri) && rowOpt.dettaglio_microclima.riquadri.length) {
      return true;
    }
    const n = String(nomeTipo || '').trim().toLowerCase();
    if (MICRO_TABELLARE_NOMI_LOWER.has(n)) return true;
    /* Compat: vecchi record creati come più INSERT su tipi supplementari */
    if (!n.includes('microclima')) return false;
    return (
      n.includes('temperatura estiva')
      || n.includes('temperatura invernale')
      || n.includes('temperatura globo')
      || n.includes('temperatura radiante')
      || n.includes('umidita')
      || n.includes('velocita')
      || /velocit[\s\u00e0.]+\s*aria/.test(n)
      || n.includes('microclima — met')
      || (n.includes('microclima') && /\bclo\b/.test(n))
      || n.includes('microclima — pmv')
      || n.includes('microclima — ppd')
    );
  }

  function filterRilevamentiMicroclima(rilevamenti) {
    return (rilevamenti || []).filter(r =>
      isTipoMicroclimaCatalogo(r.tipo_rilevamento?.nome_tipo, r)
    );
  }

  /** Riga interna (wizard / anteprima) — nomi campo minuscoli italiani sintetici. */
  function emptyRigaMicroclima() {
    return {
      postazione: '',
      data: '',
      ora: '',
      va: '',
      tg: '',
      t: '',
      tr: '',
      rh: '',
      met: '',
      clo: '',
      pmv: '',
      ppd: '',
    };
  }

  function normalizeWizardRiga(r) {
    const e = emptyRigaMicroclima();
    const o = r || {};
    Object.keys(e).forEach((k) => {
      e[k] = o[k] != null && o[k] !== undefined ? String(o[k]) : '';
    });
    return e;
  }

  /** Formatta misura con virgola decimale (it-IT) e unità opzionale. */
  function formatItalianoMisura(val, unitHint) {
    if (val == null || val === '') return '';
    const raw = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.').trim());
    if (!Number.isFinite(raw)) return String(val);
    const num = Number(raw.toPrecision(15));
    const s = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(num);
    const u = unitHint != null && String(unitHint).trim() !== '' ? String(unitHint).trim() : '';
    return u ? (s + '\u202f' + u) : s;
  }

  /** ISO / timestamptz → { dataDdMmYyyy, oraHhMm } timezone locale browser. */
  function splitDataOraItalian(ts) {
    if (!ts) return { dataDdMmYyyy: '', oraHhMm: '' };
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return { dataDdMmYyyy: '', oraHhMm: '' };
    const dataDdMmYyyy = d.toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const oraHhMm = d.toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return { dataDdMmYyyy, oraHhMm };
  }

  function misuraCellDaRiquadroJson(rq, key, unitHint) {
    const v = rq[key];
    if (v == null || v === '') return '';
    const raw = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (!Number.isFinite(raw)) return String(v);
    return formatItalianoMisura(raw, unitHint);
  }

  /** Un riquadro in `dettaglio_microclima.riquadri[]` → riga tabella wizard §2.7. */
  function riquadroJsonToWizardRow(rq) {
    const row = emptyRigaMicroclima();
    row.postazione = String(rq.zona || '').trim();
    const spl = splitDataOraItalian(rq.data_rilevamento);
    row.data = spl.dataDdMmYyyy;
    row.ora = spl.oraHhMm;
    row.va = misuraCellDaRiquadroJson(rq, 'va', 'm/s');
    row.tg = misuraCellDaRiquadroJson(rq, 'tg', '°C');
    row.t = misuraCellDaRiquadroJson(rq, 't', '°C');
    row.tr = misuraCellDaRiquadroJson(rq, 'tr', '°C');
    row.rh = misuraCellDaRiquadroJson(rq, 'rh', '%');
    row.met = misuraCellDaRiquadroJson(rq, 'met', 'met');
    row.clo = misuraCellDaRiquadroJson(rq, 'clo', 'clo');
    row.pmv = misuraCellDaRiquadroJson(rq, 'pmv', '');
    row.ppd = misuraCellDaRiquadroJson(rq, 'ppd', '%');
    return row;
  }

  /** Righe §2.7: da JSON tabellare + aggregazione legacy (vecchio multi-insert). */
  function suggestRigheDaRilevamenti(rilevamenti) {
    const fromJson = [];
    for (const r of rilevamenti || []) {
      const rqlist = r.dettaglio_microclima?.riquadri;
      if (!Array.isArray(rqlist) || !rqlist.length) continue;
      rqlist.forEach((rq) => fromJson.push(riquadroJsonToWizardRow(rq)));
    }

    const legacySource = filterRilevamentiMicroclima(rilevamenti || []).filter(
      (r) => !Array.isArray(r.dettaglio_microclima?.riquadri) || !r.dettaglio_microclima.riquadri.length
    );

    /** @type {Map<string,{ postazione:string, day:string, dataLabel:string, lista:typeof legacySource }>} */
    const groups = new Map();
    legacySource.forEach((r) => {
      const zona = (r.zona != null ? String(r.zona) : '').trim();
      const { dataDdMmYyyy } = splitDataOraItalian(r.data_rilevamento);
      const dayKeyRaw = dataDdMmYyyy.replace(/\//g, '-');
      const key = zona + '|' + dayKeyRaw;
      let g = groups.get(key);
      if (!g) {
        g = {
          postazione: zona,
          day: dayKeyRaw,
          dataLabel: dataDdMmYyyy,
          lista: [],
        };
        groups.set(key, g);
      }
      g.lista.push(r);
    });
    const fromLegacy = [];
    groups.forEach((g) => {
      const lista = [...g.lista].sort((a, b) => (
        String(a.data_rilevamento).localeCompare(String(b.data_rilevamento))
      ));
      const row = emptyRigaMicroclima();
      row.postazione = g.postazione;
      row.data = g.dataLabel;
      const firstTs = lista[0]?.data_rilevamento;
      row.ora = splitDataOraItalian(firstTs).oraHhMm;
      lista.forEach((ril) => {
        const tipo = String(ril.tipo_rilevamento?.nome_tipo || '').toLowerCase();
        const vu = formatItalianoMisura(ril.valore_misurato, ril.unita_misura || '');
        const vm = vu;
        if (tipo.includes('velocita') && tipo.includes('aria')) row.va = vm;
        else if (tipo.includes('umidita')) row.rh = vm;
        else if (tipo.includes('temperatura') && tipo.includes('globo')) row.tg = vm;
        else if (tipo.includes('temperatura') && tipo.includes('radiante')) row.tr = vm;
        else if (tipo.includes('temperatura') && tipo.includes('estiva')) {
          row.t = row.t ? (row.t + ' / Est.\u202f' + vm) : vm;
        } else if (tipo.includes('temperatura') && tipo.includes('invernale')) {
          row.t = row.t ? (row.t + ' / Inv.\u202f' + vm) : vm;
        } else if (tipo.includes('microclima') && tipo.includes('met') && !tipo.includes('umid')) {
          row.met = vm;
        } else if (tipo.includes('microclima') && /\bclo\b/.test(tipo)) {
          row.clo = vm;
        } else if (tipo.includes('microclima') && tipo.includes('pmv')) {
          row.pmv = vm;
        } else if (tipo.includes('microclima') && tipo.includes('ppd')) {
          row.ppd = vm;
        }
      });
      fromLegacy.push(row);
    });

    if (!fromJson.length && !fromLegacy.length) return [];

    const out = [...fromJson, ...fromLegacy];
    out.sort((a, b) => (String(a.postazione)).localeCompare(String(b.postazione), 'it')
      || String(a.data).localeCompare(String(b.data), 'it'));
    return out;
  }

  /**
   * Loop Docxtemplater — prima riga dati §2.7 Tabella 1.
   * Celle suggerite: {{#RIGHE_MICROCLIMA}} … {{RIGA_N}} … {{PPD}} … {{/RIGHE_MICROCLIMA}}.
   */
  function righeMicroclimaToTemplateRows(righe) {
    const arr = righe || [];
    return arr.map((raw, idx) => {
      const r = normalizeWizardRiga(raw);
      return {
        RIGA_N: String(idx + 1),
        POSTAZIONE: r.postazione.trim(),
        DATA_RIL: r.data.trim(),
        ORA_RIL: r.ora.trim(),
        VA: r.va.trim(),
        TG: r.tg.trim(),
        TAMB: r.t.trim(),
        TRAD: r.tr.trim(),
        RH: r.rh.trim(),
        MET: r.met.trim(),
        CLO: r.clo.trim(),
        PMV: r.pmv.trim(),
        PPD: r.ppd.trim(),
      };
    });
  }

  function rigaMicroclimaHaContenuto(r) {
    const n = normalizeWizardRiga(r);
    return !!(
      n.postazione.trim()
      || n.data.trim()
      || n.va.trim()
      || n.tg.trim()
      || n.t.trim()
      || n.tr.trim()
      || n.rh.trim()
      || n.met.trim()
      || n.clo.trim()
      || n.pmv.trim()
      || n.ppd.trim()
    );
  }

  /** Estrae il primo numero da cella tabella (virgola italiana, ignora simboli % ecc.). */
  function parseNumeroItaliano(cella) {
    if (cella == null || String(cella).trim() === '') return null;
    const s = String(cella).replace(/\s/g, ' ').replace(',', '.');
    const m = s.match(/-?\d+\.?\d*/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  /** Range ottimale modulare: −0,5 ≤ PMV ≤ +0,5 e PPD ≤ 10 (limiti inclusivi). */
  const PMV_OTTIM_MIN = -0.5;
  const PMV_OTTIM_MAX = 0.5;
  const PPD_OTTIM_MAX = 10;

  function pmvFuoriRangeOttimale(pmv) {
    if (pmv == null || !Number.isFinite(pmv)) return false;
    return pmv < PMV_OTTIM_MIN || pmv > PMV_OTTIM_MAX;
  }

  function ppdFuoriRangeOttimale(ppd) {
    if (ppd == null || !Number.isFinite(ppd)) return false;
    return ppd > PPD_OTTIM_MAX;
  }

  function rigaViolazioneBenessereOttimale(r) {
    const n = normalizeWizardRiga(r);
    if (!rigaMicroclimaHaContenuto(n)) return false;
    const pmv = parseNumeroItaliano(n.pmv);
    const ppd = parseNumeroItaliano(n.ppd);
    if (pmvFuoriRangeOttimale(pmv)) return true;
    if (ppdFuoriRangeOttimale(ppd)) return true;
    return false;
  }

  /** True se tutte le righe con dati rispettano il range ottimale (righe senza PMV/PPD numerici non determinano esito). */
  function conformitaBenessereOttimaleDaRighe(righe) {
    const rows = (righe || []).map(normalizeWizardRiga).filter(rigaMicroclimaHaContenuto);
    if (!rows.length) return true;
    return !rows.some(rigaViolazioneBenessereOttimale);
  }

  const INTRO_DISCOSTAMENTI_PAR =
    'Solo per alcuni casi puntuali si sono riscontrati lievi discostamenti dai valori ottimali di riferimento';

  const GIUSTIFICAZIONE_DEFAULT_SETTAGGIO =
    'dovuti al settaggio dell\u2019impianto di climatizzazione (es. ambiente non climatizzato in relazione '
    + 'alla percezione soggettiva dei lavoratori che preferiscono tenere spento l\u2019impianto di '
    + 'climatizzazione)';

  const GIUSTIFICAZIONE_DEFAULT_MANUTENZIONE =
    'dovuti ad un non perfetto funzionamento dell\u2019impianto di climatizzazione. Per tale ultimo '
    + 'aspetto la Direzione Aziendale ha gi\u00e0 previsto un approfondimento tecnico finalizzato alla '
    + 'programmazione di un intervento di manutenzione.';

  const DEFAULT_MICRO_TIPO_ATTIVITA = 'Uffici';

  /** Etichetta «tipo di attività» nel paragrafo premessa (es. Uffici); se vuota → default. */
  function tipoAttivitaPremessaFromWizard(wizard) {
    const raw = wizard && wizard.micro_tipo_attivita != null ? String(wizard.micro_tipo_attivita).trim() : '';
    return raw || DEFAULT_MICRO_TIPO_ATTIVITA;
  }

  /**
   * Profilo «ufficio / sedentario» per chiusura paragrafo impianto (punto finale vs suffisso ciclo).
   * Basato sul testo «tipo attività» compilato dall’operatore (non più su tabella UNI).
   */
  function isProfiloUfficioSedentarioUni(wizard) {
    const label = tipoAttivitaPremessaFromWizard(wizard || {}).toLowerCase();
    return label.includes('uffic') || label.includes('sedentar');
  }

  function testoGiustificazioneConclusioni(wizard) {
    const w = wizard || {};
    const modo = String(w.conclusioni_giustificazione || 'settaggio').toLowerCase();
    if (modo === 'personalizzato' || modo === 'altro') {
      const t = String(w.conclusioni_giustificazione_custom || '').trim();
      if (t) return t;
    }
    if (modo === 'manutenzione' || modo === 'manut') return GIUSTIFICAZIONE_DEFAULT_MANUTENZIONE;
    return GIUSTIFICAZIONE_DEFAULT_SETTAGGIO;
  }

  /** Frase centrale su conformità indici (pienamente / non pienamente) — limiti come in modulo. */
  function buildFraseValoriPmvConclusioni(conformeOttimale) {
    const base = 'I valori ottenuti in relazione a tali indici e riportati nella precedente '
      + 'tabella risultano ';
    const suff = conformeOttimale
      ? 'pienamente conformi in relazione al range di valori di riferimento che attestano il '
        + 'benessere termico (\u22120,5 \u2264 PMV \u2264 +0,5 e PPD \u2264 10%). '
      : 'non pienamente conformi in relazione al range di valori di riferimento che attestano il '
        + 'benessere termico (\u22120,5 \u2264 PMV \u2264 +0,5 e PPD \u2264 10%). ';
    return base + suff;
  }

  function buildParagrafoImpiantoConclusioni(wizard) {
    const base =
      'Andando a valutare nel dettaglio l\u2019impianto di climatizzazione, esso appare idoneo ed adeguato '
      + 'alle esigenze della sede, riuscendo a mantenere un\u2019umidit\u00e0 costante nel range dei '
      + 'valori di riferimento (40-60%) e valori di velocit\u00e0 dell\u2019aria adeguati (<0.2 m/s) in tutte '
      + 'le stanze esaminate';
    if (isProfiloUfficioSedentarioUni(wizard)) return base + '. ';
    return base + ' alle caratteristiche del ciclo di lavoro ed alle condizioni ambientali. ';
  }

  function buildCampiConclusioni(wizard, righeMicroclima) {
    const conforme = conformitaBenessereOttimaleDaRighe(righeMicroclima);
    const mostraDisc = !conforme;
    return {
      FRASE_VALORI_PMV_CONCLUSIONI: buildFraseValoriPmvConclusioni(conforme),
      MOSTRA_DISCOSTAMENTI:         mostraDisc,
      INTRO_DISCOSTAMENTI_PAR:      INTRO_DISCOSTAMENTI_PAR,
      TESTO_GIUSTIFICAZIONE_CONCLUSIONI: testoGiustificazioneConclusioni(wizard),
      PARAGRAFO_IMPIANTO_CONCLUSIONI: buildParagrafoImpiantoConclusioni(wizard),
    };
  }

  function luogoDaSede(sede) {
    const s = sede || '';
    const match = s.match(/,\s*([A-Z]{2})\s*$/);
    if (match) return match[1];
    const parts = s.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : 'Roma';
  }

  // ── Opzionale: catalogo UNI (altri moduli / compat); premessa microclima usa solo micro_tipo_attivita ──
  function getUniOptions() {
    return window.UNI_EN_12464_1_OPTIONS || [];
  }

  function titleCaseTitolo(s) {
    if (!s) return '';
    const t = String(s).trim();
    if (!t.length) return '';
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  function getUniTableGroups() {
    const opts = getUniOptions();
    const byNum = new Map();
    for (const o of opts) {
      const num = o.tabella_num;
      if (num == null || byNum.has(num)) continue;
      const label = titleCaseTitolo(o.tabella_titolo);
      const rows = opts.filter(r => r.tabella_num === num);
      byNum.set(num, {
        tabella_num: num,
        tabella: o.tabella,
        tabella_titolo: o.tabella_titolo,
        label,
        tabella_rif: formatUniTabellaRif(o.tabella, label),
        default_rif: pickDefaultRifForTable(rows),
      });
    }
    return Array.from(byNum.values()).sort((a, b) => a.tabella_num - b.tabella_num);
  }

  function formatUniTabellaRif(tabella, label) {
    return `${tabella} - ${label}`;
  }

  function pickDefaultRifForTable(rows) {
    const exact2 = rows.find(r => /^\d+\.2$/.test(String(r.rif)));
    if (exact2) return exact2.rif;
    const ends2 = rows.find(r => /\.2$/.test(String(r.rif)) && !/\.2\./.test(String(r.rif)));
    if (ends2) return ends2.rif;
    return rows[0]?.rif || '';
  }

  function resolveUniFromWizard(wizard) {
    const w = wizard || {};
    const opts = getUniOptions();
    let group = null;
    let row = null;

    if (w.uni_tabella_num != null && w.uni_tabella_num !== '') {
      const num = Number(w.uni_tabella_num);
      group = getUniTableGroups().find(g => g.tabella_num === num) || null;
      if (group) {
        row = opts.find(o => o.rif === group.default_rif)
          || opts.find(o => o.tabella_num === num);
      }
    } else if (w.uni_rif) {
      row = opts.find(o => o.rif === w.uni_rif) || null;
      if (row) {
        group = getUniTableGroups().find(g => g.tabella_num === row.tabella_num) || null;
      }
    }

    return { group, row };
  }

  function macroLabelFromWizard(wizard) {
    const { group } = resolveUniFromWizard(wizard || {});
    return group ? group.label : '';
  }

  /**
   * Paragrafo premessa «ciclo di lavoro»: testo fisso con tipo attività da `wizard.micro_tipo_attivita` (default «Uffici»).
   * Override testo intero: `wizard.descrizione_ciclo_lavoro`.
   */
  function buildPremessaCicloLavoro(wizard) {
    const w = wizard || {};
    const override = (w.descrizione_ciclo_lavoro && String(w.descrizione_ciclo_lavoro).trim())
      || (w.premessa_ciclo_lavoro && String(w.premessa_ciclo_lavoro).trim());
    if (override) return override;
    const label = tipoAttivitaPremessaFromWizard(w);
    return 'Il ciclo di lavoro considerato comprende unicamente attivit\u00e0 del tipo \u201c'
      + label
      + '\u201d che si esplica attraverso l\u2019utilizzo di apparecchiature per l\u2019elaborazione dati in ambienti climatizzati.';
  }

  /** CDN jsdelivr espone `window.docxtemplater`, non `Docxtemplater` */
  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  /** Rimuove tag OOXML tra caratteri di delimitatori spezzati ({ + XML + { → {{). */
  function reuniteSplitDelimiters(xml) {
    let out = xml;
    let prev;
    do {
      prev = out;
      out = out.replace(/\{(?:<[^>]+>)+\{/g, '{{');
      out = out.replace(/\}(?:<[^>]+>)+\}/g, '}}');
      out = out.replace(/\{(?:<[^>]+>)*%(?:<[^>]+>)*([A-Za-z0-9_]+)\}/g, '{%$1}');
      out = out.replace(/\{(?:<[^>]+>)*%/g, '{%');
      out = out.replace(/(?:<[^>]+>)*%\}/g, '%}');
    } while (out !== prev);
    return out;
  }

  function needsWtMerge(texts, joined) {
    if (texts.length < 2) return false;
    if (texts.some(isBrokenPlaceholderRun)) return true;
    const opens = (joined.match(/\{\{/g) || []).length;
    const complete = (joined.match(/\{\{[A-Z0-9_]+\}\}/g) || []).length;
    if (opens > complete) return true;
    const opensImg = (joined.match(/\{%/g) || []).length;
    const completeImg = (joined.match(/\{%[A-Za-z0-9_]+\}/g) || []).length;
    if (opensImg > completeImg) return true;
    return false;
  }

  function mergeWtInBlock(block) {
    const texts = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(block)) !== null) texts.push(m[1]);
    const joined = texts.join('');
    if (!needsWtMerge(texts, joined)) return block;
    let idx = 0;
    return block.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (_full, attrs) => {
      const a = attrs || '';
      if (idx === 0) {
        idx += 1;
        return '<w:t' + a + '>' + joined + '</w:t>';
      }
      idx += 1;
      return '<w:t' + a + '></w:t>';
    });
  }

  function consolidatePlaceholderBlocks(xml, tagName) {
    const re = new RegExp('<' + tagName + '[\\s\\S]*?<\\/' + tagName + '>', 'g');
    return xml.replace(re, (block) => mergeWtInBlock(block));
  }

  function consolidatePlaceholderParagraphs(xml) {
    let out = consolidatePlaceholderBlocks(xml, 'w:p');
    out = consolidatePlaceholderBlocks(out, 'w:tc');
    return out;
  }

  function mergeAdjacentSplitPlaceholderRuns(xml) {
    let out = xml;
    let prev;
    do {
      prev = out;
      out = out.replace(
        /(<w:t(?:\s[^>]*)?>)(\{\{[A-Z0-9_]*)(<\/w:t>)([\s\S]*?)(<w:t(?:\s[^>]*)?>)([A-Z0-9_]*\}\})(<\/w:t>)/g,
        (_, o, p1, c1, _mid, o2, p2, c2) => o + p1 + p2 + c1 + o2 + c2
      );
      out = out.replace(
        /(<w:t(?:\s[^>]*)?>)(\{%[A-Z0-9_]*)(<\/w:t>)([\s\S]*?)(<w:t(?:\s[^>]*)?>)([A-Z0-9_]*%\})(<\/w:t>)/g,
        (_, o, p1, c1, _mid, o2, p2, c2) => o + p1 + p2 + c1 + o2 + c2
      );
    } while (out !== prev);
    return out;
  }

  function isCompleteImagePlaceholderRun(t) {
    return /^\{%[A-Za-z0-9_]+\}$/.test(t);
  }

  function isBrokenPlaceholderRun(t) {
    if (isCompleteImagePlaceholderRun(t)) return false;
    if (t === '{' || t === '%' || /^LOGO\}$/.test(t)) return true;
    const hasOpen = /\{\{/.test(t) || /\{%/.test(t);
    const hasClose = /\}\}/.test(t);
    if (hasOpen && !hasClose) return true;
    if (hasClose && !hasOpen) return true;
    return false;
  }

  function findBrokenPlaceholderRunsInXml(xml, filePath) {
    const issues = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const t = m[1];
      if (!/\{\{|\{%|\}\}|%\}/.test(t)) continue;
      if (!isBrokenPlaceholderRun(t)) continue;
      const openOnly = (/\{\{/.test(t) || /\{%/.test(t)) && !/\}\}/.test(t) && !/%\}/.test(t);
      issues.push({ file: filePath, kind: openOnly ? 'open' : 'close', text: t });
    }
    ['w:p', 'w:tc'].forEach((tag) => {
      const blockRe = new RegExp('<' + tag + '[\\s\\S]*?<\\/' + tag + '>', 'g');
      let bm;
      while ((bm = blockRe.exec(xml)) !== null) {
        const block = bm[0];
        const texts = [];
        const tre = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let tm;
        while ((tm = tre.exec(block)) !== null) texts.push(tm[1]);
        const joined = texts.join('');
        if (needsWtMerge(texts, joined)) {
          issues.push({ file: filePath, kind: 'split-run', text: joined.slice(0, 60) });
        }
      }
    });
    return issues;
  }

  const DOCXTEMPLATER_OPTIONS = {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  };

  function tryCompileDocxtemplater(zip, modules) {
    const DocxtemplaterCtor = getDocxtemplaterCtor();
    try {
      new DocxtemplaterCtor(zip, {
        modules: modules || [],
        ...DOCXTEMPLATER_OPTIONS,
      });
      return null;
    } catch (err) {
      return err;
    }
  }

  function inspectDocxTemplate(arrayBuffer) {
    const zip = new window.PizZip(arrayBuffer);
    const issues = [];
    Object.keys(zip.files || {}).forEach((path) => {
      if (!/^word\/.*\.xml$/i.test(path)) return;
      const file = zip.file(path);
      if (!file || file.dir) return;
      try {
        issues.push(...findBrokenPlaceholderRunsInXml(file.asText(), path));
      } catch (_) { /* skip */ }
    });
    return issues;
  }

  /** Se Word ha mangiato `{{/RIGHE_MICROCLIMA}}`, Docxtemplater associa erroneamente `{{/MOSTRA_DISCOSTAMENTI}}`. */
  function injectMissingRigheMicroclimaClose(xml) {
    const open = '{{#RIGHE_MICROCLIMA}}';
    const close = '{{/RIGHE_MICROCLIMA}}';
    const mostraOpen = '{{#MOSTRA_DISCOSTAMENTI}}';
    const io = xml.indexOf(open);
    const im = xml.indexOf(mostraOpen);
    if (io < 0 || im < 0 || im <= io) return xml;
    const between = xml.slice(io + open.length, im);
    if (between.includes(close)) return xml;
    return xml.slice(0, im) + close + xml.slice(im);
  }

  function fixSplitPlaceholdersInXml(xml) {
    let out = reuniteSplitDelimiters(xml);
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = consolidatePlaceholderParagraphs(out);
    out = mergeAdjacentSplitPlaceholderRuns(out);
    out = injectMissingRigheMicroclimaClose(out);
    out = out.replace(/\{\{LOGO\}\}/g, '{%LOGO}');
    return out;
  }

  function assertValidWordXml(zip, label) {
    const path = 'word/document.xml';
    const file = zip.file(path);
    if (!file) return;
    const xml = file.asText();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const errNode = doc.getElementsByTagName('parsererror')[0];
    if (errNode) {
      const detail = (errNode.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      throw new Error(
        (label ? label + ': ' : '') +
          'XML Word non valido in document.xml' +
          (detail ? ' (' + detail + ')' : '')
      );
    }
  }

  function formatDocxtemplaterErrors(err) {
    const list = err.properties?.errors || (err.properties?.id ? [err] : []);
    const parts = list.map((e) => {
      const f = e.properties?.file || '';
      const tag = e.properties?.xtag || e.properties?.context || '';
      return (f ? f + ' — ' : '') + e.message + (tag ? ' [' + tag + ']' : '');
    });
    let msg = parts.length ? parts.join('; ') : err.message;
    if (list.some((e) => /duplicate_(open|close)_tag/.test(e.properties?.id || ''))) {
      msg += ' (tag Word spezzati nel .docx del bucket modelli)';
    }
    return msg;
  }

  function repairDocxTemplateZip(zip, modules) {
    let fixedCount = 0;
    const paths = Object.keys(zip.files || {}).filter((p) => /^word\/.*\.xml$/i.test(p));

    function repairAllXml() {
      let n = 0;
      paths.forEach((path) => {
        const file = zip.file(path);
        if (!file || file.dir) return;
        let xml;
        try {
          xml = file.asText();
        } catch (_) {
          return;
        }
        const fixed = fixSplitPlaceholdersInXml(xml);
        if (fixed !== xml) {
          zip.file(path, fixed);
          n += 1;
        }
      });
      return n;
    }

    const mods = modules || [];
    for (let pass = 0; pass < 5; pass += 1) {
      fixedCount += repairAllXml();
      const compileErr = tryCompileDocxtemplater(zip, mods);
      if (!compileErr) break;
      if (pass === 4) {
        console.warn('[MOD_MICROCLIMA] Template ancora non compilabile dopo 5 passaggi');
      }
    }

    console.info('[MOD_MICROCLIMA] Riparati', fixedCount, 'file XML (passaggi fino a compilazione)');
    return zip;
  }

  function buildData(azienda, rilevamenti, wizardInput) {
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const w = wizardInput || {};
    const filtered = filterRilevamentiMicroclima(rilevamenti);
    const moduloNum = (() => {
      const raw = w.modulo_numero != null && w.modulo_numero !== '' ? String(w.modulo_numero).trim() : '1';
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 0) return '01';
      return String(n).padStart(2, '0');
    })();

    const premessaCiclo = buildPremessaCicloLavoro(w);
    const uniMacro = tipoAttivitaPremessaFromWizard(w);

    /** Righe §2.7: da wizard se già salvate (esterni), altrimenti suggerimento da DB. */
    const fromDbRows = suggestRigheDaRilevamenti(rilevamenti);
    let rigInterne;
    if (Array.isArray(w.righe_microclima) && w.righe_microclima.length) {
      rigInterne = w.righe_microclima.map(normalizeWizardRiga);
    } else {
      rigInterne = fromDbRows.length ? fromDbRows.slice() : [emptyRigaMicroclima()];
    }

    const conclusioni = buildCampiConclusioni(w, rigInterne);

    return {
      RAGIONE_SOCIALE:          azienda?.ragione_sociale || '',
      SEDE_OPERATIVA:           azienda?.sede_operativa || '',
      LOGO_PREVIEW_URL:         w.logo_url || '',
      _logo_buffer:             w.logo_buffer || null,
      _logo_path:               w.logo_path || '',
      MODULO_NUMERO:            moduloNum,
      DATA_EMISSIONE:           dataEmissione,
      LUOGO:                    luogoDaSede(azienda?.sede_operativa),
      PREMESSA_CICLO_LAVORO:    premessaCiclo,
      UNI_ATTIVITA_MACRO:       uniMacro,
      NOTE_WIZARD:              w.note_wizard || '',
      RIGHE_MICROCLIMA:         righeMicroclimaToTemplateRows(rigInterne),
      ...conclusioni,
      _uni_tabella_num:         w.uni_tabella_num != null && w.uni_tabella_num !== '' ? Number(w.uni_tabella_num) : null,
      _descrizione_ciclo_override: w.descrizione_ciclo_lavoro && String(w.descrizione_ciclo_lavoro).trim()
        ? String(w.descrizione_ciclo_lavoro).trim()
        : null,
      _righe_microclima:       rigInterne,
      _rilevamenti_microclima: filtered,
      _conclusioni_giustificazione: w.conclusioni_giustificazione != null && String(w.conclusioni_giustificazione).trim()
        ? String(w.conclusioni_giustificazione).trim()
        : 'settaggio',
      _conclusioni_giustificazione_custom: w.conclusioni_giustificazione_custom != null
        ? String(w.conclusioni_giustificazione_custom)
        : '',
      _micro_tipo_attivita: w.micro_tipo_attivita != null && String(w.micro_tipo_attivita).trim()
        ? String(w.micro_tipo_attivita).trim()
        : null,
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const uniNum = w.uni_tabella_num != null && w.uni_tabella_num !== ''
      ? Number(w.uni_tabella_num)
      : base._uni_tabella_num;

    const modNum = (() => {
      if (w.modulo_numero != null && w.modulo_numero !== '') {
        const raw = String(w.modulo_numero).trim();
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 0) return String(n).padStart(2, '0');
      }
      return base.MODULO_NUMERO || '01';
    })();

    const mergedWiz = { ...w, uni_tabella_num: uniNum };
    const overrideSrc = w.descrizione_ciclo_lavoro !== undefined
      ? (String(w.descrizione_ciclo_lavoro || '').trim() || null)
      : base._descrizione_ciclo_override;
    const premessaCiclo = buildPremessaCicloLavoro({
      ...mergedWiz,
      descrizione_ciclo_lavoro: overrideSrc || '',
    });
    const uniMacro = tipoAttivitaPremessaFromWizard(mergedWiz);

    const rigbez = Array.isArray(w.righe_microclima)
      ? w.righe_microclima.map(normalizeWizardRiga)
      : (base._righe_microclima || [emptyRigaMicroclima()]);

    const conclusioni = buildCampiConclusioni(mergedWiz, rigbez);

    return {
      ...base,
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      NOTE_WIZARD: (w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD) || '',
      RIGHE_MICROCLIMA: righeMicroclimaToTemplateRows(rigbez),
      ...conclusioni,
      _uni_tabella_num: uniNum != null && !Number.isNaN(uniNum) ? uniNum : null,
      _descrizione_ciclo_override: w.descrizione_ciclo_lavoro !== undefined
        ? (String(w.descrizione_ciclo_lavoro || '').trim() || null)
        : base._descrizione_ciclo_override,
      MODULO_NUMERO: modNum,
      PREMESSA_CICLO_LAVORO: premessaCiclo,
      UNI_ATTIVITA_MACRO: uniMacro,
      _righe_microclima: rigbez,
      _conclusioni_giustificazione: w.conclusioni_giustificazione !== undefined
        ? (String(w.conclusioni_giustificazione || '').trim() || 'settaggio')
        : (base._conclusioni_giustificazione ?? 'settaggio'),
      _conclusioni_giustificazione_custom: w.conclusioni_giustificazione_custom !== undefined
        ? String(w.conclusioni_giustificazione_custom || '')
        : (base._conclusioni_giustificazione_custom ?? ''),
      _micro_tipo_attivita: w.micro_tipo_attivita !== undefined
        ? (String(w.micro_tipo_attivita || '').trim() || null)
        : base._micro_tipo_attivita,
    };
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.PREMESSA_CICLO_LAVORO || !String(data.PREMESSA_CICLO_LAVORO).trim()) {
      errors.push('Testo ciclo di lavoro (premessa) mancante');
    }
    const rg = data._righe_microclima;
    if (!Array.isArray(rg) || !rg.some(rigaMicroclimaHaContenuto)) {
      errors.push(
        'Tabella §2.7 risultati microclima: compilare almeno una riga (postazione o misure — aggiungi righe manualmente oppure registra rilevamenti «Microclima — …» con zona/data).'
      );
    }
    return errors;
  }

  async function generateDocx(templateArrayBuffer, data) {
    const DocxtemplaterCtor = getDocxtemplaterCtor();
    if (!window.PizZip)        throw new Error('PizZip non caricato');
    if (!DocxtemplaterCtor)    throw new Error('Docxtemplater non caricato');

    const logoBuffer = data._logo_buffer || null;
    const logoPathHint = data._logo_path || '';

    if (logoBuffer && window.GEN_LOGO_DOCX?.isSvgBuffer(logoBuffer, logoPathHint)) {
      throw new Error('Il logo in formato SVG non è supportato nel Word. Carica PNG o JPEG in Loghi.');
    }

    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (k === 'LOGO_PREVIEW_URL') continue;
      templateData[k] = v;
    }

    const issuesBefore = inspectDocxTemplate(templateArrayBuffer);
    if (issuesBefore.length) {
      console.warn('[MOD_MICROCLIMA] Tag spezzati nel template scaricato:', issuesBefore.length, issuesBefore.slice(0, 5));
    }

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const zip = repairDocxTemplateZip(new window.PizZip(templateArrayBuffer), []);
    if (!zip || typeof zip.file !== 'function') {
      throw new Error('Template Word non leggibile (PizZip)');
    }

    let doc;
    try {
      doc = new DocxtemplaterCtor(zip, { ...DOCXTEMPLATER_OPTIONS });
      doc.setData(templateData);
      doc.render();
    } catch (err) {
      throw new Error('Errore rendering template: ' + formatDocxtemplaterErrors(err));
    }

    const outZip = doc.getZip();
    if (!outZip || typeof outZip.generate !== 'function') {
      throw new Error('Errore rendering template: zip di output non disponibile');
    }
    if (logoBuffer && window.GEN_LOGO_DOCX?.injectLogoIntoDocxZip) {
      await window.GEN_LOGO_DOCX.injectLogoIntoDocxZip(outZip, logoBuffer, logoPathHint);
    }

    assertValidWordXml(outZip, 'Dopo generazione');

    return outZip.generate({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  window.GEN_ADAPTERS = window.GEN_ADAPTERS || {};
  window.GEN_ADAPTERS['MOD_MICROCLIMA'] = {
    codice: 'MOD_MICROCLIMA',
    nome: 'Analisi delle condizioni microclimatiche',
    getUniOptions,
    getUniTableGroups,
    macroLabelFromWizard,
    tipoAttivitaPremessaFromWizard,
    buildPremessaCicloLavoro,
    buildCampiConclusioni,
    conformitaBenessereOttimaleDaRighe,
    testoGiustificazioneConclusioni,
    isProfiloUfficioSedentarioUni,
    buildParagrafoImpiantoConclusioni,
    filterRilevamentiMicroclima,
    isTipoMicroclimaCatalogo,
    emptyRigaMicroclima,
    normalizeWizardRiga,
    suggestRigheDaRilevamenti,
    righeMicroclimaToTemplateRows,
    rigaMicroclimaHaContenuto,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    inspectDocxTemplate,
    repairDocxTemplateZip,
  };
})();
