/**
 * Adapter NOTA_ANTINCENDIO — Informativa antincendio per i lavoratori.
 * Scaffolding iniziale: dati documento + logo (sezioni da mappare sul Word).
 */
(function () {
  'use strict';

  const CODICE = 'NOTA_ANTINCENDIO';
  const NOME = 'Informativa antincendio per i lavoratori';

  const ALLEGATO_FIGURE = 'FIGURE ATTIVE NELLA GESTIONE DELLE EMERGENZE';
  const ALLEGATO_PROCEDURE = 'PROCEDURE DI GESTIONE DELLE EMERGENZE';

  const DEFAULT_LUOGO_CENTRO_COORDINAMENTO = 'RECEPTION';
  const DEFAULT_LUOGO_POSTO_CHIAMATA = 'RECEPTION';
  const DEFAULT_LUOGO_PUNTO_RACCOLTA = "AREA ANTISTANTE L'INGRESSO PRINCIPALE DELLA SEDE";

  function pianoEmergenzaSi(v) {
    if (v === false || v === 'no' || v === 0 || v === '0') return false;
    return true;
  }

  function allegatiForTemplate(pianoEmergenza) {
    const items = [{ TESTO: ALLEGATO_FIGURE }];
    if (pianoEmergenzaSi(pianoEmergenza)) {
      items.push({ TESTO: ALLEGATO_PROCEDURE });
    }
    return items;
  }

  function porteReiSi(v) {
    if (v === false || v === 'no' || v === 0 || v === '0') return false;
    return true;
  }

  function getMisurePrevenzioneCatalogo() {
    return window.NOTA_ANTINCENDIO_MISURE_PREVENZIONE?.MISURE_PREVENZIONE_CATALOGO || [];
  }

  function misurePrevenzioneForTemplate(porteRei) {
    const si = porteReiSi(porteRei);
    return getMisurePrevenzioneCatalogo()
      .filter((row) => !row.solo_se_porte_rei || si)
      .map((row) => ({ TESTO: row.testo }));
  }

  function getProtezioniAttiveCatalogo() {
    return window.NOTA_ANTINCENDIO_MISURE_PROTEZIONE?.PROTEZIONI_ATTIVE_CATALOGO || [];
  }

  function getProtezioniPassiveCatalogo() {
    return window.NOTA_ANTINCENDIO_MISURE_PROTEZIONE?.PROTEZIONI_PASSIVE_CATALOGO || [];
  }

  function mergeProtezioniListaWizard(wizard, tipo) {
    const catalog =
      tipo === 'attive' ? getProtezioniAttiveCatalogo() : getProtezioniPassiveCatalogo();
    const wKey = tipo === 'attive' ? 'protezioni_attive' : 'protezioni_passive';
    const incoming = Array.isArray(wizard?.[wKey]) ? wizard[wKey] : [];
    const byId = new Map(incoming.map((r) => [String(r.id || '').trim(), r]));

    const rows = catalog.map((def) => {
      const saved = byId.get(def.id);
      const testoSaved = saved?.testo != null ? String(saved.testo).trim() : '';
      return {
        id: def.id,
        testo: testoSaved || def.testo,
        selezionato:
          saved != null ? saved.selezionato === true : def.default_selezionato !== false,
        escluso_se_irai: !!def.escluso_se_irai,
        hint: def.hint || '',
        custom: false,
      };
    });

    for (const r of incoming) {
      const id = String(r.id || '').trim();
      if (!id.startsWith('custom_')) continue;
      if (rows.some((x) => x.id === id)) continue;
      rows.push({
        id,
        testo: r.testo != null ? String(r.testo).trim() : '',
        selezionato: r.selezionato !== false,
        custom: true,
      });
    }
    return rows;
  }

  function protezioniListaForTemplate(wizard, tipo) {
    const rows = mergeProtezioniListaWizard(wizard, tipo);
    const iraiOn =
      tipo === 'attive' && rows.some((r) => r.id === 'IRAI' && r.selezionato);
    return rows
      .filter((r) => {
        if (!r.selezionato || !String(r.testo || '').trim()) return false;
        if (iraiOn && r.escluso_se_irai) return false;
        return true;
      })
      .map((r) => ({ TESTO: r.testo }));
  }

  function protezioniAttiveForTemplate(wizard) {
    return protezioniListaForTemplate(wizard, 'attive');
  }

  function protezioniPassiveForTemplate(wizard) {
    return protezioniListaForTemplate(wizard, 'passive');
  }

  function wizardProtezioniPayload(wizard) {
    return {
      protezioni_attive: mergeProtezioniListaWizard(wizard, 'attive'),
      protezioni_passive: mergeProtezioniListaWizard(wizard, 'passive'),
    };
  }

  function getSorveglianzaCatalogo() {
    return window.NOTA_ANTINCENDIO_SORVEGLIANZA?.SORVEGLIANZA_VERIFICHE_CATALOGO || [];
  }

  function mergeSorveglianzaWizard(wizard) {
    const catalog = getSorveglianzaCatalogo();
    const incoming = Array.isArray(wizard?.sorveglianza_verifiche) ? wizard.sorveglianza_verifiche : [];
    const byId = new Map(incoming.map((r) => [String(r.id || '').trim(), r]));

    const rows = catalog.map((def) => {
      const saved = byId.get(def.id);
      const testoSaved = saved?.testo != null ? String(saved.testo).trim() : '';
      return {
        id: def.id,
        testo: testoSaved || def.testo,
        selezionato:
          saved != null ? saved.selezionato === true : def.default_selezionato !== false,
        custom: false,
      };
    });

    for (const r of incoming) {
      const id = String(r.id || '').trim();
      if (!id.startsWith('custom_')) continue;
      if (rows.some((x) => x.id === id)) continue;
      rows.push({
        id,
        testo: r.testo != null ? String(r.testo).trim() : '',
        selezionato: r.selezionato !== false,
        custom: true,
      });
    }
    return rows;
  }

  function sorveglianzaVerificheForTemplate(wizard) {
    return mergeSorveglianzaWizard(wizard)
      .filter((r) => r.selezionato && String(r.testo || '').trim())
      .map((r) => ({ TESTO: r.testo }));
  }

  function wizardSorveglianzaPayload(wizard) {
    return { sorveglianza_verifiche: mergeSorveglianzaWizard(wizard) };
  }

  function luogoCentroCoordinamentoForTemplate(wizard) {
    const raw = String(wizard?.luogo_centro_coordinamento || '').trim();
    return raw || DEFAULT_LUOGO_CENTRO_COORDINAMENTO;
  }

  function luogoPostoChiamataForTemplate(wizard) {
    const raw = String(wizard?.luogo_posto_chiamata || '').trim();
    return raw || DEFAULT_LUOGO_POSTO_CHIAMATA;
  }

  function luogoPuntoRaccoltaForTemplate(wizard) {
    const raw = String(wizard?.luogo_punto_raccolta || '').trim();
    return raw || DEFAULT_LUOGO_PUNTO_RACCOLTA;
  }

  function porteScorrevoliSi(v) {
    if (v === false || v === 'no' || v === 0 || v === '0') return false;
    return true;
  }

  function ascensoriSi(v) {
    if (v === false || v === 'no' || v === 0 || v === '0') return false;
    return true;
  }

  function comportamentiIncendioAForTemplate(wizard) {
    const porte = porteScorrevoliSi(wizard?.porte_scorrevoli);
    const catalog =
      window.NOTA_ANTINCENDIO_COMPORTAMENTI_INCENDIO?.COMPORTAMENTI_INCENDIO_A_CATALOGO || [];
    return catalog
      .filter((row) => !row.solo_se_porte_scorrevoli || porte)
      .map((row) => ({ TESTO: row.testo }));
  }

  function comportamentiIncendioBForTemplate(wizard) {
    const asc = ascensoriSi(wizard?.ascensori);
    const catalog =
      window.NOTA_ANTINCENDIO_COMPORTAMENTI_INCENDIO?.COMPORTAMENTI_INCENDIO_B_CATALOGO || [];
    return catalog
      .filter((row) => !row.solo_se_ascensori || asc)
      .map((row) => ({ TESTO: row.testo }));
  }

  function normalizeOggettoSospettoDestinatario(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'responsabile') return 'responsabile';
    if (s === 'posto_chiamata' || s === 'posto') return 'posto_chiamata';
    return '';
  }

  function destinatarioOggettoSospettoForTemplate(wizard) {
    switch (normalizeOggettoSospettoDestinatario(wizard?.oggetto_sospetto_destinatario)) {
      case 'posto_chiamata':
        return 'Posto di Chiamata';
      case 'responsabile':
        return 'Responsabile delle Emergenze';
      default:
        return '';
    }
  }

  /** Stesso switch §4.2 — formulazione «Allertare il …» (es. fuga di gas). */
  function destinatarioEmergenzaAllertaForTemplate(wizard) {
    switch (normalizeOggettoSospettoDestinatario(wizard?.oggetto_sospetto_destinatario)) {
      case 'posto_chiamata':
        return 'Posto di chiamata';
      case 'responsabile':
        return "Responsabile dell'emergenza";
      default:
        return '';
    }
  }

  const TESTO_ALLERTA_GAS_PREFISSO = 'Allertare il ';
  const TESTO_ALLERTA_GAS_SUFFISSO =
    " per l'eventuale chiamata agli enti di soccorso esterni.";

  function testoAllertaGasCompletoForTemplate(wizard) {
    const dest = destinatarioEmergenzaAllertaForTemplate(wizard);
    if (!dest) return '';
    return TESTO_ALLERTA_GAS_PREFISSO + dest + TESTO_ALLERTA_GAS_SUFFISSO;
  }

  function segnaleAllarmeSi(v) {
    if (v === false || v === 'no' || v === 0 || v === '0') return false;
    return true;
  }

  function bloccoTrafficoSi(v) {
    if (v === false || v === 'no' || v === 0 || v === '0') return false;
    return true;
  }

  function testoEvacuazioneSitoForTemplate(wizard) {
    if (segnaleAllarmeSi(wizard?.segnale_allarme_evacuazione)) {
      return 'Evacuazione del sito (attivazione segnale di allarme);';
    }
    return 'Evacuazione del sito;';
  }

  function testoPuntoRaccoltaGestioneForTemplate(wizard) {
    if (bloccoTrafficoSi(wizard?.blocco_traffico_punto_raccolta)) {
      return "Si reca al Punto di raccolta, organizzando un'area sicura (blocco del traffico) e:";
    }
    return "Si reca al Punto di raccolta, organizzando un'area sicura e:";
  }

  function procedureFlagsForTemplate(pianoEmergenza) {
    const inAllegato = pianoEmergenzaSi(pianoEmergenza);
    return {
      PROCEDURE_IN_ALLEGATO: inAllegato,
      PROCEDURE_INLINE: !inAllegato,
    };
  }

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

  function buildData(azienda, _rilevamenti, wizardInput) {
    const w = wizardInput || {};
    const now = new Date();
    const modNum = formatModuloNumero(w.modulo_numero, '240');

    const pianoSi = pianoEmergenzaSi(w.piano_emergenza);
    const porteSi = porteReiSi(w.porte_rei);
    const porteScorrevoli = porteScorrevoliSi(w.porte_scorrevoli);
    const ascensori = ascensoriSi(w.ascensori);
    const procFlags = procedureFlagsForTemplate(pianoSi);

    return {
      RAGIONE_SOCIALE: azienda?.ragione_sociale || '',
      SEDE_OPERATIVA: azienda?.sede_operativa || '',
      MODULO_NUMERO: modNum,
      DATA_EMISSIONE: now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      LUOGO: luogoDaSede(azienda?.sede_operativa),
      ALLEGATI: allegatiForTemplate(pianoSi),
      MISURE_PREVENZIONE: misurePrevenzioneForTemplate(porteSi),
      PROTEZIONI_ATTIVE: protezioniAttiveForTemplate(w),
      PROTEZIONI_PASSIVE: protezioniPassiveForTemplate(w),
      COMPORTAMENTI_INCENDIO_A: comportamentiIncendioAForTemplate(w),
      COMPORTAMENTI_INCENDIO_B: comportamentiIncendioBForTemplate(w),
      DESTINATARIO_OGGETTO_SOSPETTO: destinatarioOggettoSospettoForTemplate(w),
      DESTINATARIO_EMERGENZA_ALLERTA: destinatarioEmergenzaAllertaForTemplate(w),
      ...procFlags,
      TESTO_EVACUAZIONE_SITO: testoEvacuazioneSitoForTemplate(w),
      TESTO_PUNTO_RACCOLTA_GESTIONE: testoPuntoRaccoltaGestioneForTemplate(w),
      SORVEGLIANZA_VERIFICHE: sorveglianzaVerificheForTemplate(w),
      LUOGO_CENTRO_COORDINAMENTO: luogoCentroCoordinamentoForTemplate(w),
      LUOGO_POSTO_CHIAMATA: luogoPostoChiamataForTemplate(w),
      LUOGO_PUNTO_RACCOLTA: luogoPuntoRaccoltaForTemplate(w),
      LOGO_PREVIEW_URL: w.logo_url || '',
      _logo_buffer: w.logo_buffer || null,
      _logo_path: w.logo_path || '',
      _nota_antincendio_wizard: {
        modulo_numero: w.modulo_numero != null ? String(w.modulo_numero).trim() : modNum,
        piano_emergenza: pianoSi,
        porte_rei: porteSi,
        porte_scorrevoli: porteScorrevoli,
        ascensori,
        oggetto_sospetto_destinatario: normalizeOggettoSospettoDestinatario(
          w.oggetto_sospetto_destinatario
        ) || 'posto_chiamata',
        segnale_allarme_evacuazione: segnaleAllarmeSi(w.segnale_allarme_evacuazione),
        blocco_traffico_punto_raccolta: bloccoTrafficoSi(w.blocco_traffico_punto_raccolta),
        luogo_centro_coordinamento: luogoCentroCoordinamentoForTemplate(w),
        luogo_posto_chiamata: luogoPostoChiamataForTemplate(w),
        luogo_punto_raccolta: luogoPuntoRaccoltaForTemplate(w),
        ...wizardProtezioniPayload(w),
        ...wizardSorveglianzaPayload(w),
      },
    };
  }

  function applyWizard(base, wizard) {
    if (!base) return {};
    const w = wizard || {};
    const modNum =
      w.modulo_numero !== undefined
        ? formatModuloNumero(w.modulo_numero, '')
        : base.MODULO_NUMERO || '01';

    const pianoSi = pianoEmergenzaSi(w.piano_emergenza);
    const porteSi = porteReiSi(w.porte_rei);
    const porteScorrevoli = porteScorrevoliSi(w.porte_scorrevoli);
    const ascensori = ascensoriSi(w.ascensori);
    const procFlags = procedureFlagsForTemplate(pianoSi);

    return {
      ...base,
      MODULO_NUMERO: modNum,
      ALLEGATI: allegatiForTemplate(pianoSi),
      MISURE_PREVENZIONE: misurePrevenzioneForTemplate(porteSi),
      PROTEZIONI_ATTIVE: protezioniAttiveForTemplate(w),
      PROTEZIONI_PASSIVE: protezioniPassiveForTemplate(w),
      COMPORTAMENTI_INCENDIO_A: comportamentiIncendioAForTemplate(w),
      COMPORTAMENTI_INCENDIO_B: comportamentiIncendioBForTemplate(w),
      DESTINATARIO_OGGETTO_SOSPETTO: destinatarioOggettoSospettoForTemplate(w),
      DESTINATARIO_EMERGENZA_ALLERTA: destinatarioEmergenzaAllertaForTemplate(w),
      ...procFlags,
      TESTO_EVACUAZIONE_SITO: testoEvacuazioneSitoForTemplate(w),
      TESTO_PUNTO_RACCOLTA_GESTIONE: testoPuntoRaccoltaGestioneForTemplate(w),
      SORVEGLIANZA_VERIFICHE: sorveglianzaVerificheForTemplate(w),
      LUOGO_CENTRO_COORDINAMENTO: luogoCentroCoordinamentoForTemplate(w),
      LUOGO_POSTO_CHIAMATA: luogoPostoChiamataForTemplate(w),
      LUOGO_PUNTO_RACCOLTA: luogoPuntoRaccoltaForTemplate(w),
      _nota_antincendio_wizard: {
        ...base._nota_antincendio_wizard,
        modulo_numero: modNum,
        piano_emergenza: pianoSi,
        porte_rei: porteSi,
        porte_scorrevoli: porteScorrevoli,
        ascensori,
        oggetto_sospetto_destinatario: normalizeOggettoSospettoDestinatario(
          w.oggetto_sospetto_destinatario
        ) || 'posto_chiamata',
        segnale_allarme_evacuazione: segnaleAllarmeSi(w.segnale_allarme_evacuazione),
        blocco_traffico_punto_raccolta: bloccoTrafficoSi(w.blocco_traffico_punto_raccolta),
        luogo_centro_coordinamento: luogoCentroCoordinamentoForTemplate(w),
        luogo_posto_chiamata: luogoPostoChiamataForTemplate(w),
        luogo_punto_raccolta: luogoPuntoRaccoltaForTemplate(w),
        ...wizardProtezioniPayload(w),
        ...wizardSorveglianzaPayload(w),
      },
    };
  }

  function validate(data) {
    const errors = [];
    if (!String(data.RAGIONE_SOCIALE || '').trim()) errors.push('Ragione sociale mancante');
    if (!String(data.SEDE_OPERATIVA || '').trim()) {
      errors.push('Sede operativa mancante (scegli la sede in generazione)');
    }
    if (!data?._logo_buffer?.byteLength) {
      errors.push('Logo azienda mancante (carica PNG/JPEG in Loghi)');
    }
    if (!(data.PROTEZIONI_ATTIVE || []).length) {
      errors.push('Seleziona almeno una protezione attiva (§ 3.2)');
    }
    if (!(data.PROTEZIONI_PASSIVE || []).length) {
      errors.push('Seleziona almeno una protezione passiva (§ 3.2)');
    }
    if (
      !String(data.DESTINATARIO_OGGETTO_SOSPETTO || '').trim() ||
      !String(data.DESTINATARIO_EMERGENZA_ALLERTA || '').trim()
    ) {
      errors.push('§4.2 — seleziona Posto di chiamata o Responsabile delle emergenze');
    }
    if (!(data.SORVEGLIANZA_VERIFICHE || []).length) {
      errors.push('§9.1 — seleziona almeno una verifica di sorveglianza');
    }
    if (!String(data.LUOGO_CENTRO_COORDINAMENTO || '').trim()) {
      errors.push('§10 — indica il luogo del centro di coordinamento');
    }
    if (!String(data.LUOGO_POSTO_CHIAMATA || '').trim()) {
      errors.push('§10 — indica il luogo del posto di chiamata');
    }
    if (!String(data.LUOGO_PUNTO_RACCOLTA || '').trim()) {
      errors.push('§10 — indica il luogo del punto di raccolta');
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

    if (!templateArrayBuffer || !templateArrayBuffer.byteLength) {
      throw new Error('Template Word vuoto o non scaricato');
    }

    const templateData = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (k === 'LOGO_PREVIEW_URL') continue;
      if (
        (k === 'ALLEGATI' ||
          k === 'MISURE_PREVENZIONE' ||
          k === 'PROTEZIONI_ATTIVE' ||
          k === 'PROTEZIONI_PASSIVE' ||
          k === 'COMPORTAMENTI_INCENDIO_A' ||
          k === 'COMPORTAMENTI_INCENDIO_B' ||
          k === 'SORVEGLIANZA_VERIFICHE') &&
        Array.isArray(v)
      ) {
        templateData[k] = v.map((row) => ({ TESTO: templateValue(row.TESTO) }));
        continue;
      }
      if (k === 'PROCEDURE_IN_ALLEGATO' || k === 'PROCEDURE_INLINE') {
        templateData[k] = !!v;
        continue;
      }
      templateData[k] = templateValue(v);
    }

    const repair = window.GEN_DOCX_REPAIR;
    let zip = new window.PizZip(templateArrayBuffer);
    if (repair?.repairDocxTemplateZip) {
      zip = repair.repairDocxTemplateZip(zip);
    }

    const docOpts = repair?.DOCXTEMPLATER_OPTIONS || { paragraphLoop: true, linebreaks: true };
    const doc = new DocxtemplaterCtor(zip, { ...docOpts });
    doc.setData(templateData);
    try {
      doc.render();
    } catch (err) {
      const msg = repair?.formatDocxtemplaterErrors
        ? repair.formatDocxtemplaterErrors(err)
        : err.message;
      throw new Error('Errore rendering nota antincendio: ' + msg);
    }

    const outZip = doc.getZip();
    if (repair?.expandVademecumListLoopsInZip) {
      repair.expandVademecumListLoopsInZip(outZip, {
        loops: [
          { texts: (templateData.ALLEGATI || []).map((r) => r.TESTO) },
          { texts: (templateData.MISURE_PREVENZIONE || []).map((r) => r.TESTO) },
          { texts: (templateData.PROTEZIONI_ATTIVE || []).map((r) => r.TESTO) },
          { texts: (templateData.PROTEZIONI_PASSIVE || []).map((r) => r.TESTO) },
          { texts: (templateData.COMPORTAMENTI_INCENDIO_A || []).map((r) => r.TESTO) },
          { texts: (templateData.COMPORTAMENTI_INCENDIO_B || []).map((r) => r.TESTO) },
          { texts: (templateData.SORVEGLIANZA_VERIFICHE || []).map((r) => r.TESTO) },
        ],
      });
    }
    if (logoBuffer && window.GEN_LOGO_DOCX?.injectLogoIntoDocxZip) {
      await window.GEN_LOGO_DOCX.injectLogoIntoDocxZip(outZip, logoBuffer, logoPathHint);
    }
    return outZip.generate({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  window.GEN_ADAPTERS = window.GEN_ADAPTERS || {};
  window.GEN_ADAPTERS[CODICE] = {
    codice: CODICE,
    nome: NOME,
    ALLEGATO_FIGURE,
    ALLEGATO_PROCEDURE,
    pianoEmergenzaSi,
    allegatiForTemplate,
    porteReiSi,
    getMisurePrevenzioneCatalogo,
    misurePrevenzioneForTemplate,
    getProtezioniAttiveCatalogo,
    getProtezioniPassiveCatalogo,
    mergeProtezioniListaWizard,
    protezioniAttiveForTemplate,
    protezioniPassiveForTemplate,
    porteScorrevoliSi,
    ascensoriSi,
    comportamentiIncendioAForTemplate,
    comportamentiIncendioBForTemplate,
    normalizeOggettoSospettoDestinatario,
    destinatarioOggettoSospettoForTemplate,
    destinatarioEmergenzaAllertaForTemplate,
    testoAllertaGasCompletoForTemplate,
    segnaleAllarmeSi,
    bloccoTrafficoSi,
    testoEvacuazioneSitoForTemplate,
    testoPuntoRaccoltaGestioneForTemplate,
    procedureFlagsForTemplate,
    DEFAULT_LUOGO_CENTRO_COORDINAMENTO,
    DEFAULT_LUOGO_POSTO_CHIAMATA,
    DEFAULT_LUOGO_PUNTO_RACCOLTA,
    getSorveglianzaCatalogo,
    mergeSorveglianzaWizard,
    sorveglianzaVerificheForTemplate,
    luogoCentroCoordinamentoForTemplate,
    luogoPostoChiamataForTemplate,
    luogoPuntoRaccoltaForTemplate,
    buildData,
    applyWizard,
    validate,
    generateDocx,
    repairDocxTemplateZip: (zip) => window.GEN_DOCX_REPAIR?.repairDocxTemplateZip?.(zip) || zip,
    inspectDocxTemplate: (buf) => window.GEN_DOCX_REPAIR?.inspectDocxTemplate?.(buf) || [],
  };
})();
