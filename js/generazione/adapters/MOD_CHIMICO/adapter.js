/**
 * Adapter MOD_CHIMICO — Valutazione rischio agenti chimici.
 */
(function () {
  'use strict';

  const CODICE = 'MOD_CHIMICO';
  const NOME = 'Valutazione del rischio chimico';

  const PARAGRAFO_SORVEGLIANZA_SANITARIA =
    'I nominativi di tali figure sono stati comunicati al Medico Competente, che ha provveduto alla definizione '
    + 'del protocollo di sorveglianza sanitaria in applicazione della legge 29 dicembre 2000, n. 422, '
    + '"Disposizioni per l\'adempimento di obblighi derivanti dall\'appartenenza dell\'Italia alle Comunità '
    + 'europee - Legge comunitaria 2000".';

  const TESTO_CICLO_UNICO_DEFAULT =
    'La valutazione che segue è stata eseguita analizzando il ciclo di lavoro.';

  const TESTO_CICLO_MULTIPLI_DEFAULT =
    'La valutazione che segue è stata eseguita analizzando il ciclo di lavoro di ogni gruppo omogeneo in modo '
    + 'indipendente dall\'altro. Tuttavia, come verrà spiegato nelle conclusioni del presente modulo spesso i '
    + 'gruppi omogenei di cui sopra cooperano in alcune fasi di lavoro e, pertanto, le misure di prevenzione e '
    + 'protezione a tutela dei lavoratori sono applicate indistintamente a tutti i dipendenti.';

  function getDocxtemplaterCtor() {
    const d = window.Docxtemplater || window.docxtemplater || null;
    return d && d.default ? d.default : d;
  }

  function luogoDaSede(sede) {
    const s = sede || '';
    const m = s.match(/^([^,–—-]+)/);
    return m ? m[1].trim() : s.trim();
  }

  function templateValue(v) {
    if (v == null || v === undefined) return '';
    return String(v);
  }

  function formatModuloNumero(raw, fallback) {
    const s = raw != null && String(raw).trim() !== '' ? String(raw).trim() : String(fallback || '1');
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0) return '01';
    return String(n).padStart(2, '0');
  }

  function protocolloSorSanSi(v) {
    return v === true || v === 'true' || v === 1 || v === '1';
  }

  function normalizeProfiloAzienda(p) {
    const row = p || {};
    return {
      id: String(row.id || row.profilo_id || '').trim(),
      nome: String(row.nome || row.nome_profilo || '').trim(),
      descrizione_attivita: String(row.descrizione_attivita || '').trim(),
      protocollo_sor_san: row.protocollo_sor_san,
      attivo: row.attivo !== false,
    };
  }

  function normalizeProfiliAzienda(list) {
    const out = [];
    const seen = new Set();
    for (const item of list || []) {
      const p = normalizeProfiloAzienda(item);
      if (!p.id || !p.nome || p.attivo === false) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    out.sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
    return out;
  }

  function normalizeSostanzaRow(r) {
    return {
      sostanza: String(r?.sostanza || '').trim(),
      tipo: String(r?.tipo || '').trim(),
      cas: String(r?.cas || '').trim(),
      frasi_h: String(r?.frasi_h || '').trim(),
      impiego_prodotto: String(r?.impiego_prodotto || '').trim(),
    };
  }

  function normalizeSostanzeList(list) {
    return (list || []).map(normalizeSostanzaRow).filter((row) => {
      return row.sostanza || row.tipo || row.cas || row.frasi_h || row.impiego_prodotto;
    });
  }

  function defaultGruppiChimiciWizard(profiliAzienda) {
    return normalizeProfiliAzienda(profiliAzienda).map((p) => ({
      profilo_id: p.id,
      nome: p.nome,
      attivita: p.descrizione_attivita || '',
      selezionato: false,
      protocollo_sor_san: p.protocollo_sor_san,
      sostanze: [],
    }));
  }

  function mergeGruppiChimiciWizard(wizard, profiliAzienda) {
    const w = wizard || {};
    const catalog = normalizeProfiliAzienda(profiliAzienda || w._profili_azienda || []);
    const byId = new Map(catalog.map((p) => [p.id, p]));
    const incoming = Array.isArray(w.gruppi_chimici) ? w.gruppi_chimici : [];

    if (!incoming.length) {
      return defaultGruppiChimiciWizard(catalog);
    }

    const merged = [];
    const seen = new Set();
    for (const row of incoming) {
      const id = String(row.profilo_id || row.id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const base = byId.get(id);
      merged.push({
        profilo_id: id,
        nome: String(row.nome || base?.nome || '').trim(),
        attivita: row.attivita != null ? String(row.attivita).trim() : (base?.descrizione_attivita || ''),
        selezionato: row.selezionato === true,
        protocollo_sor_san: row.protocollo_sor_san != null ? row.protocollo_sor_san : base?.protocollo_sor_san,
        sostanze: normalizeSostanzeList(row.sostanze),
      });
    }
    for (const p of catalog) {
      if (seen.has(p.id)) continue;
      merged.push({
        profilo_id: p.id,
        nome: p.nome,
        attivita: p.descrizione_attivita || '',
        selezionato: false,
        protocollo_sor_san: p.protocollo_sor_san,
        sostanze: [],
      });
    }
    merged.sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
    return merged;
  }

  function gruppiSelezionatiForTemplate(wizardRows) {
    return normalizeGruppiChimici(
      (wizardRows || [])
        .filter((r) => r.selezionato === true)
        .map((r) => ({
          nome: r.nome,
          attivita: r.attivita,
          /** Tabella chiusura §7.1 — compilate a mano dopo generazione. */
          rischio_salute: '',
          rischio_sicurezza: '',
        }))
    );
  }

  function censimentoGruppiForTemplate(wizardRows) {
    return (wizardRows || [])
      .filter((r) => r.selezionato === true && String(r.nome || '').trim())
      .map((r) => ({
        gruppo_nome: String(r.nome || '').trim(),
        sostanze: normalizeSostanzeList(r.sostanze),
      }));
  }

  /** §7 — titolo esposizione + impiego per ogni sostanza censita (gruppo omogeneo). */
  function esitiGruppiForTemplate(wizardRows) {
    return (wizardRows || [])
      .filter((r) => r.selezionato === true && String(r.nome || '').trim())
      .map((r) => {
        const esposizioni = normalizeSostanzeList(r.sostanze)
          .filter((s) => s.sostanza)
          .map((s) => ({
            sostanza_nome: s.sostanza,
            impiego_prodotto: s.impiego_prodotto,
          }));
        return {
          gruppo_nome: String(r.nome || '').trim(),
          esposizioni,
        };
      });
  }

  function normalizeGruppoChimico(g) {
    return {
      nome: String(g?.nome || '').trim(),
      attivita: String(g?.attivita || '').trim(),
      rischio_salute: g?.rischio_salute != null ? String(g.rischio_salute).trim() : '',
      rischio_sicurezza: g?.rischio_sicurezza != null ? String(g.rischio_sicurezza).trim() : '',
    };
  }

  function normalizeGruppiChimici(list) {
    const out = [];
    const seen = new Set();
    for (const item of list || []) {
      const row = normalizeGruppoChimico(item);
      if (!row.nome) continue;
      const key = row.nome.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  function autoValutazioneCicloMode(numGruppi) {
    return numGruppi <= 1 ? 'unico' : 'multipli';
  }

  function resolveValutazioneCiclo(wizard, numGruppi) {
    const w = wizard || {};
    const auto = autoValutazioneCicloMode(numGruppi);
    const mode =
      w.valutazione_ciclo === 'unico' || w.valutazione_ciclo === 'multipli'
        ? w.valutazione_ciclo
        : auto;
    const testoUnico =
      w.testo_ciclo_unico != null && String(w.testo_ciclo_unico).trim()
        ? String(w.testo_ciclo_unico).trim()
        : TESTO_CICLO_UNICO_DEFAULT;
    const testoMulti =
      w.testo_ciclo_multipli != null && String(w.testo_ciclo_multipli).trim()
        ? String(w.testo_ciclo_multipli).trim()
        : TESTO_CICLO_MULTIPLI_DEFAULT;
    return {
      mode,
      auto,
      testo: mode === 'multipli' ? testoMulti : testoUnico,
      testo_unico: testoUnico,
      testo_multipli: testoMulti,
    };
  }

  function mostraParagrafoSorveglianza(wizardRows) {
    const selected = (wizardRows || []).filter((r) => r.selezionato === true);
    if (!selected.length) return false;
    return selected.some((r) => protocolloSorSanSi(r.protocollo_sor_san));
  }

  function sezione3TemplateFields(wizard, profiliAzienda) {
    const w = wizard || {};
    const wizardRows = mergeGruppiChimiciWizard(w, profiliAzienda);
    const gruppi = gruppiSelezionatiForTemplate(wizardRows);
    const censimento_gruppi = censimentoGruppiForTemplate(wizardRows);
    const esiti_gruppi = esitiGruppiForTemplate(wizardRows);
    const ciclo = resolveValutazioneCiclo(w, gruppi.length);
    const sorveglianza = mostraParagrafoSorveglianza(wizardRows);

    return {
      GRUPPI_CHIMICI_NOMI: gruppi.map((g) => g.nome).join('\n'),
      gruppi_chimici: gruppi,
      censimento_gruppi,
      esiti_gruppi,
      PARAGRAFO_SORVEGLIANZA_SANITARIA: sorveglianza ? PARAGRAFO_SORVEGLIANZA_SANITARIA : '',
      TESTO_VALUTAZIONE_CICLO: ciclo.testo,
      _gruppi_chimici_wizard: wizardRows,
      _gruppi_chimici: gruppi,
      _censimento_gruppi: censimento_gruppi,
      _esiti_gruppi: esiti_gruppi,
      _profili_azienda: normalizeProfiliAzienda(profiliAzienda || w._profili_azienda || []),
      _valutazione_ciclo: ciclo.mode,
      _valutazione_ciclo_auto: ciclo.auto,
      _mostra_sorveglianza: sorveglianza,
    };
  }

  function buildData(azienda, rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const dataEmissione = now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const profiliAzienda = normalizeProfiliAzienda(w.profili_azienda || []);

    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: formatModuloNumero(w.modulo_numero, '1'),
      DATA_EMISSIONE: dataEmissione,
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      LOGO_PREVIEW_URL: w.logo_url || '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : '',
      ...sezione3TemplateFields(w, profiliAzienda),
      _rilevamenti: rilevamenti || [],
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '01';
    const profiliAzienda = base._profili_azienda || w._profili_azienda || [];

    return {
      ...base,
      ...sezione3TemplateFields(w, profiliAzienda),
      _logo_buffer: base._logo_buffer || w.logo_buffer || null,
      _logo_path: base._logo_path || w.logo_path || '',
      LOGO_PREVIEW_URL: base.LOGO_PREVIEW_URL || w.logo_url || '',
      NOTE_WIZARD: w.note_wizard != null ? String(w.note_wizard) : base.NOTE_WIZARD || '',
      MODULO_NUMERO: modNum,
      testo_ciclo_unico:
        w.testo_ciclo_unico != null ? String(w.testo_ciclo_unico) : base._testo_ciclo_unico,
      testo_ciclo_multipli:
        w.testo_ciclo_multipli != null ? String(w.testo_ciclo_multipli) : base._testo_ciclo_multipli,
      valutazione_ciclo: w.valutazione_ciclo != null ? w.valutazione_ciclo : base._valutazione_ciclo,
      _testo_ciclo_unico: resolveValutazioneCiclo(w, (base._gruppi_chimici || []).length).testo_unico,
      _testo_ciclo_multipli: resolveValutazioneCiclo(w, (base._gruppi_chimici || []).length).testo_multipli,
      _chimico_wizard: { ...w },
    };
  }

  function validate(data) {
    const errors = [];
    if (!data.RAGIONE_SOCIALE) errors.push('Ragione Sociale mancante');
    if (!data.SEDE_OPERATIVA) errors.push('Sede Operativa mancante');
    if (!data.MODULO_NUMERO || !String(data.MODULO_NUMERO).trim()) {
      errors.push('Numero modulo mancante o non valido');
    }
    const gruppi = data._gruppi_chimici || data.gruppi_chimici || [];
    if (!gruppi.length) {
      errors.push('§3: selezionare almeno un gruppo omogeneo per il modulo chimico');
    }
    for (const g of gruppi) {
      if (!String(g.attivita || '').trim()) {
        errors.push('§3: descrizione attività mancante per «' + (g.nome || '?') + '»');
        break;
      }
    }
    if (!String(data.TESTO_VALUTAZIONE_CICLO || '').trim()) {
      errors.push('§3: testo valutazione ciclo di lavoro mancante');
    }
    return errors;
  }

  async function generateDocx(templateArrayBuffer, data) {
    const DocxtemplaterCtor = getDocxtemplaterCtor();
    if (!window.PizZip) throw new Error('PizZip non caricato');
    if (!DocxtemplaterCtor) throw new Error('Docxtemplater non caricato');

    const logoBuffer = data._logo_buffer || null;
    const logoPathHint = data._logo_path || '';
    if (logoBuffer && window.GEN_LOGO_DOCX?.isSvgBuffer(logoBuffer, logoPathHint)) {
      throw new Error('Il logo in formato SVG non è supportato nel Word. Carica PNG o JPEG in Loghi.');
    }

    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (k === 'LOGO_PREVIEW_URL') continue;
      if (
        (k === 'gruppi_chimici' || k === 'censimento_gruppi' || k === 'esiti_gruppi') &&
        Array.isArray(v)
      ) {
        templateData[k] = v;
        continue;
      }
      templateData[k] = templateValue(v);
    }

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const repair = window.GEN_DOCX_REPAIR;
    if (repair?.inspectDocxTemplate) {
      const issuesBefore = repair.inspectDocxTemplate(templateArrayBuffer);
      if (issuesBefore.length) {
        console.warn('[MOD_CHIMICO] Tag spezzati nel template:', issuesBefore.length, issuesBefore.slice(0, 5));
      }
    }

    let zip = new window.PizZip(templateArrayBuffer);
    if (repair?.repairDocxTemplateZip) {
      zip = repair.repairDocxTemplateZip(zip, []);
    }

    const docOpts = repair?.DOCXTEMPLATER_OPTIONS || { paragraphLoop: true, linebreaks: true };
    const doc = new DocxtemplaterCtor(zip, { ...docOpts });
    doc.setData(templateData);
    try {
      doc.render();
    } catch (err) {
      const msg = repair?.formatDocxtemplaterErrors
        ? repair.formatDocxtemplaterErrors(err)
        : (err.properties?.errors
          ? err.properties.errors.map((e) => e.message).join('; ')
          : err.message);
      throw new Error('Errore rendering template chimico: ' + msg);
    }

    const outZip = doc.getZip();
    if (logoBuffer && window.GEN_LOGO_DOCX?.injectLogoIntoDocxZip) {
      await window.GEN_LOGO_DOCX.injectLogoIntoDocxZip(outZip, logoBuffer, logoPathHint);
    }
    return outZip.generate({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  window.GEN_ADAPTERS = window.GEN_ADAPTERS || {};
  window.GEN_ADAPTERS[CODICE] = {
    codice: CODICE,
    nome: NOME,
    PARAGRAFO_SORVEGLIANZA_SANITARIA,
    TESTO_CICLO_UNICO_DEFAULT,
    TESTO_CICLO_MULTIPLI_DEFAULT,
    protocolloSorSanSi,
    normalizeProfiloAzienda,
    normalizeProfiliAzienda,
    normalizeSostanzaRow,
    normalizeSostanzeList,
    mergeGruppiChimiciWizard,
    gruppiSelezionatiForTemplate,
    censimentoGruppiForTemplate,
    esitiGruppiForTemplate,
    resolveValutazioneCiclo,
    autoValutazioneCicloMode,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
