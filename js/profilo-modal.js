/**
 * Modale profilo: fasi strutturate, protocollo sanitario (matrice).
 */
(function () {
  'use strict';

  const MAT = () => window.RISCHIO_ACCERTAMENTO_MATRICE;

  let draft = {
    fasi: [],
    protocollo: { rischi_ids: [], periodicita: {} },
  };
  let faseEditIndex = null;
  let isDuplicateFlow = false;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function attrEsc(s) {
    return esc(s).replace(/'/g, '&#39;');
  }

  function cloneJson(o) {
    try {
      return JSON.parse(JSON.stringify(o));
    } catch (e) {
      return o;
    }
  }

  function getAziendaById(id) {
    return (window.STATE?.data?.aziende || []).find((a) => a.id === id) || null;
  }

  function sediListaAzienda(aziendaId) {
    const az = getAziendaById(aziendaId);
    if (!az) return [];
    const f = az.fields || {};
    const list = [];
    const princ = String(f.SedeOperativa || az.sede_operativa || '').trim();
    if (princ) list.push(princ);
    const extra = f.SediOperative || az.sedi_operative || [];
    (Array.isArray(extra) ? extra : []).forEach((s) => {
      const t = String(s || '').trim();
      if (t && !list.includes(t)) list.push(t);
    });
    return list;
  }

  function loadFasiForProfilo(profiloId) {
    const pid = String(profiloId || '');
    const rows = window.STATE?.data?.profiloFasiDettaglio?.[pid] || [];
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome || '',
      misure_specifiche: r.misure_specifiche || '',
      dpi_specifici: r.dpi_specifici || '',
    }));
  }

  function initDraftFromFields(f) {
    draft.protocollo = MAT()?.normalizeProtocolloProfilo?.(f.ProtocolloSanitarioConfig)
      || { rischi_ids: [], periodicita: {} };
    draft.fasi = [];
    faseEditIndex = null;
  }

  function faseSummaryChips(fase) {
    const parts = [];
    if (fase.misure_specifiche) parts.push('misure');
    if (fase.dpi_specifici) parts.push('DPI');
    return parts.length ? parts.join(' · ') : '—';
  }

  function renderFasiList() {
    const host = document.getElementById('profiloFasiCards');
    if (!host) return;
    if (!draft.fasi.length) {
      host.innerHTML = '<p class="hint-str">Nessuna fase. Aggiungi almeno una fase di lavoro.</p>';
      return;
    }
    host.innerHTML = draft.fasi
      .map(
        (f, i) => ''
          + '<div class="profilo-fase-card">'
          + '<div class="profilo-fase-card-head">'
          + '<strong>' + esc(f.nome || 'Fase senza nome') + '</strong>'
          + '<span class="hint-str">' + esc(faseSummaryChips(f)) + '</span>'
          + '</div>'
          + '<div class="profilo-fase-card-actions">'
          + '<button type="button" class="btn" onclick="ProfiloModal.editFase(' + i + ')">Configura</button>'
          + '<button type="button" class="icon-btn danger" title="Rimuovi" onclick="ProfiloModal.removeFase('
          + i + ')">🗑</button>'
          + '</div></div>'
      )
      .join('');
  }

  function renderProtocolloPanel() {
    const wrap = document.getElementById('profiloProtocolloPanel');
    const sel = document.getElementById('profiloProtocolloSorSan');
    if (!wrap || !sel) return;
    const previsto = sel.value === 'true';
    wrap.style.display = previsto ? '' : 'none';
    if (!previsto) return;

    const mat = MAT();
    if (!mat) {
      wrap.innerHTML = '<p class="hint-str">Matrice sanitario non caricata.</p>';
      return;
    }

    const cfg = mat.normalizeProtocolloProfilo(draft.protocollo);
    draft.protocollo = cfg;

    let html = '<div class="profilo-protocollo-box">';
    html += '<p class="hint-str" style="margin:0 0 12px;">Rischi lavorativi (matrice) → accertamenti e periodicità.</p>';
    html += '<div class="profilo-protocollo-label">Rischi lavorativi</div>';
    html += '<div class="profilo-matrice-rischi">';
    mat.RISCHI_LAVORATIVI.forEach((r) => {
      const on = cfg.rischi_ids.includes(r.id);
      html += ''
        + '<label class="profilo-token">'
        + '<input type="checkbox" data-rischio-id="' + attrEsc(r.id) + '"'
        + (on ? ' checked' : '')
        + ' onchange="ProfiloModal.toggleProtocolloRischio(this)">'
        + '<span>' + esc(r.nome) + '</span>'
        + '</label>';
    });
    html += '</div>';

    const accs = mat.accertamentiForRischi(cfg.rischi_ids);
    html += '<div id="profiloProtocolloAccertamenti" style="margin-top:16px;">';
    if (!accs.length) {
      html += '<p class="hint-str" style="margin:0;">Seleziona almeno un rischio lavorativo.</p>';
    } else {
      html += '<div class="profilo-protocollo-label">Accertamenti · periodicità</div>';
      accs.forEach((acc) => {
        const selIds = mat.mergePeriodicitaIds(cfg.periodicita, acc.id);
        html += '<div class="profilo-acc-row"><div class="profilo-acc-name">' + esc(acc.nome) + '</div><div class="profilo-per-chips">';
        mat.PERIODICITA_OPTS.forEach((p) => {
          const on = selIds.includes(p.id);
          html += ''
            + '<label class="profilo-token profilo-token-sm">'
            + '<input type="checkbox" data-acc-id="' + attrEsc(acc.id) + '" data-per-id="' + attrEsc(p.id) + '"'
            + (on ? ' checked' : '')
            + ' onchange="ProfiloModal.toggleProtocolloPeriodicita(this)">'
            + '<span>' + esc(p.label) + '</span>'
            + '</label>';
        });
        html += '</div></div>';
      });
    }
    html += '</div></div>';
    wrap.innerHTML = html;
  }

  function renderFaseSubModal() {
    const fase = faseEditIndex != null ? draft.fasi[faseEditIndex] : null;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'profiloFaseModal';
    modal.innerHTML = ''
      + '<div class="modal" style="max-width:720px;" onclick="event.stopPropagation()">'
      + '<div class="modal-header">'
      + '<div class="modal-title">' + (faseEditIndex != null ? 'Configura fase' : 'Nuova fase') + '</div>'
      + '<button type="button" class="icon-btn" onclick="ProfiloModal.closeFaseModal()">✕</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<div class="form-field full"><label>Descrizione fase di lavoro <span class="required">*</span></label>'
      + '<textarea id="faseNomeInput" rows="3">' + esc(fase?.nome || '') + '</textarea></div>'
      + '<div class="form-field full"><label>Misure specifiche per la fase</label>'
      + '<textarea id="faseMisureInput" rows="4">' + esc(fase?.misure_specifiche || '') + '</textarea></div>'
      + '<div class="form-field full"><label>DPI specifici per la fase</label>'
      + '<textarea id="faseDpiInput" rows="3">' + esc(fase?.dpi_specifici || '') + '</textarea></div>'
      + '</div>'
      + '<div class="modal-footer">'
      + '<button type="button" class="btn" onclick="ProfiloModal.closeFaseModal()">Annulla</button>'
      + '<button type="button" class="btn btn-primary" onclick="ProfiloModal.saveFaseModal()">Applica</button>'
      + '</div></div>';
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    modal.onclick = () => ProfiloModal.closeFaseModal();
  }

  function findProfiloInState(profiloId) {
    const id = String(profiloId || '');
    return (window.STATE?.data?.profili || []).find((p) => String(p.id) === id) || null;
  }

  function buildFieldsForDuplicate(sourceId) {
    const item = findProfiloInState(sourceId);
    if (!item) return null;
    const f = item.fields || {};
    const aziendaId =
      f.AziendaProprietariaId
      || (typeof window.getAziendaIdForProfiloDuplicate === 'function'
        ? window.getAziendaIdForProfiloDuplicate()
        : null)
      || '';
    const nome =
      typeof window.makeDuplicateNomeProfilo === 'function'
        ? window.makeDuplicateNomeProfilo(
            f.NomeProfilo,
            'Custom',
            aziendaId,
            window.STATE?.data?.profili
          )
        : String(f.NomeProfilo || 'Profilo').trim() + ' - Copia';
    return {
      ...f,
      NomeProfilo: nome,
      TipoProfilo: 'Custom',
      AziendaProprietariaId: aziendaId,
      Attivo: true,
    };
  }

  function loadFasiDraftFromSource(sourceId) {
    const pid = String(sourceId || '');
    const rows = window.STATE?.data?.profiloFasiDettaglio?.[pid] || [];
    if (rows.length) {
      return rows.map((r) => ({
        id: null,
        nome: r.nome || '',
        misure_specifiche: r.misure_specifiche || '',
        dpi_specifici: r.dpi_specifici || '',
      }));
    }
    const item = findProfiloInState(sourceId);
    const fasi = item?.fields?.FasiLavoro || [];
    return fasi.map((nome) => ({
      id: null,
      nome: String(nome || '').trim(),
      misure_specifiche: '',
      dpi_specifici: '',
    })).filter((x) => x.nome);
  }

  function openDuplicateFrom(sourceId) {
    if (!window.canMutateData?.()) {
      window.showToast?.('Profilo in sola lettura', 'warning');
      return;
    }
    const prefill = buildFieldsForDuplicate(sourceId);
    if (!prefill) {
      window.showToast?.('Profilo sorgente non trovato', 'warning');
      return;
    }
    open(null, { prefillFields: prefill, copyFasiFromId: sourceId });
    window.showToast?.(
      'Duplicazione: profilo Custom — imposta Azienda proprietaria e salva',
      'info'
    );
  }

  function open(itemId = null, options = {}) {
    isDuplicateFlow = !!options.copyFasiFromId;
    if (!window.canMutateData?.()) {
      window.showToast?.('Profilo in sola lettura', 'warning');
      return;
    }
    const isEdit = itemId != null && !options.prefillFields;
    const item = isEdit ? findProfiloInState(itemId) : null;
    const f = options.prefillFields || (item ? item.fields : {});

    if (isEdit && !item) {
      window.showToast?.('Profilo non trovato in memoria — ricarica la pagina Profili', 'warning');
      return;
    }

    initDraftFromFields(f);
    if (isEdit) {
      draft.fasi = loadFasiForProfilo(itemId);
      if (!draft.fasi.length && (f.FasiLavoro || []).length) {
        draft.fasi = (f.FasiLavoro || []).map((nome) => ({
          id: null,
          nome,
          misure_specifiche: '',
          dpi_specifici: '',
        }));
      }
    } else if (options.copyFasiFromId) {
      draft.fasi = loadFasiDraftFromSource(options.copyFasiFromId);
    }

    const aziendeOptions = (window.STATE?.data?.aziende || [])
      .map(
        (a) => '<option value="' + a.id + '"'
          + (f.AziendaProprietariaId === a.id ? ' selected' : '')
          + '>' + esc(a.fields?.RagioneSociale || '') + '</option>'
      )
      .join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'profiloModal';
    modal.innerHTML = ''
      + '<div class="modal" style="max-width:880px;" onclick="event.stopPropagation()">'
      + '<div class="modal-header">'
      + '<div class="modal-title">' + (isEdit ? 'Modifica Profilo' : (options.copyFasiFromId ? 'Duplica Profilo (Custom)' : 'Nuovo Profilo')) + '</div>'
      + '<button type="button" class="icon-btn" onclick="window.closeModal(\'profiloModal\')">✕</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<form id="profiloForm" onsubmit="ProfiloModal.save(event, '
      + (itemId != null ? "'" + itemId + "'" : 'null') + ')">'
      + '<div class="form-grid">'
      + '<div class="form-field"><label>Nome Profilo <span class="required">*</span></label>'
      + '<input type="text" name="NomeProfilo" value="' + attrEsc(f.NomeProfilo || '') + '" required></div>'
      + '<div class="form-field"><label>Tipo Personale <span class="required">*</span></label>'
      + '<input type="text" name="TipoPersonale" value="' + attrEsc(f.TipoPersonale || '') + '" required></div>'
      + '<div class="form-field"><label>Tipo Profilo <span class="required">*</span></label>'
      + '<select name="TipoProfilo" required onchange="ProfiloModal.onTipoProfiloChange(this.value)"'
      + (isEdit && f.TipoProfilo === 'Standard' ? ' disabled' : '') + '>'
      + '<option value="Standard"' + (f.TipoProfilo === 'Standard' ? ' selected' : '') + '>Standard</option>'
      + '<option value="Custom"' + (f.TipoProfilo === 'Custom' ? ' selected' : '') + '>Custom</option>'
      + '</select>'
      + (isEdit && f.TipoProfilo === 'Standard' ? '<input type="hidden" name="TipoProfilo" value="Standard">' : '')
      + '</div>'
      + '<div class="form-field" id="aziendaProprietariaField" style="'
      + (f.TipoProfilo === 'Custom' ? '' : 'display:none;') + '">'
      + '<label>Azienda Proprietaria</label>'
      + '<select name="AziendaProprietariaId">'
      + '<option value="">— Nessuna —</option>' + aziendeOptions + '</select></div>'
      + '<div class="form-section full">Fasi di lavoro</div>'
      + '<div class="form-field full"><div id="profiloFasiCards"></div>'
      + '<button type="button" class="btn" style="margin-top:8px;" onclick="ProfiloModal.addFase()">+ Aggiungi fase</button></div>'
      + '<div class="form-section full">Sorveglianza sanitaria (profilo)</div>'
      + '<div class="form-field"><label>Protocollo Sorveglianza Sanitaria</label>'
      + '<select id="profiloProtocolloSorSan" name="ProtocolloSorSan" onchange="ProfiloModal.onProtocolloSorSanChange()">'
      + '<option value="">— Non impostato —</option>'
      + '<option value="true"' + (f.ProtocolloSorSan === true ? ' selected' : '') + '>Sì, previsto</option>'
      + '<option value="false"' + (f.ProtocolloSorSan === false ? ' selected' : '') + '>No</option>'
      + '</select></div>'
      + '<div class="form-field full" id="profiloProtocolloPanel"></div>'
      + '<div class="form-field full"><label>Descrizione Attività</label>'
      + '<textarea name="DescrizioneAttivita">' + esc(f.DescrizioneAttivita || '') + '</textarea></div>'
      + '<div class="form-field full"><label>Misure Generali</label>'
      + '<textarea name="MisureGenGenerali">' + esc(f.MisureGenGenerali || '') + '</textarea></div>'
      + '<div class="form-field full"><label>DPI Base</label>'
      + '<textarea name="DPIBase">' + esc(f.DPIBase || '') + '</textarea></div>'
      + '<div class="form-field full"><label>DPI Collettivi</label>'
      + '<textarea name="DPICollettivi">' + esc(f.DPICollettivi || '') + '</textarea></div>'
      + '<div class="form-field"><label>Attivo</label>'
      + '<select name="Attivo">'
      + '<option value="true"' + (f.Attivo !== false ? ' selected' : '') + '>Sì</option>'
      + '<option value="false"' + (f.Attivo === false ? ' selected' : '') + '>No</option>'
      + '</select></div>'
      + '</div></form></div>'
      + '<div class="modal-footer">'
      + (isEdit && f.TipoProfilo !== 'Standard'
        ? '<button type="button" class="btn btn-danger" onclick="window.deleteProfilo(\'' + itemId + '\')">Elimina</button>'
        : '')
      + '<button type="button" class="btn" onclick="window.closeModal(\'profiloModal\')">Annulla</button>'
      + '<button type="button" class="btn btn-primary" onclick="document.getElementById(\'profiloForm\').requestSubmit()">'
      + (isEdit ? 'Salva Modifiche' : 'Crea Profilo') + '</button></div></div>';

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    modal.onclick = () => window.closeModal('profiloModal');

    renderFasiList();
    renderProtocolloPanel();
  }

  async function save(event, itemId) {
    event.preventDefault();
    if (!window.canMutateData?.()) {
      window.showToast?.('Permessi insufficienti', 'warning');
      return;
    }
  if (!draft.fasi.length || !draft.fasi.some((x) => String(x.nome || '').trim())) {
      window.showToast?.('Aggiungi almeno una fase di lavoro con descrizione', 'warning');
      return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (value === '') continue;
      if (['ProtocolloSorSan', 'Attivo'].includes(key)) {
        data[key] = value === 'true';
      } else {
        data[key] = value;
      }
    }

    const mat = MAT();
    const protoSi = document.getElementById('profiloProtocolloSorSan')?.value === 'true';
    let protocolloConfig = { rischi_ids: [], periodicita: {} };
    if (protoSi && mat) {
      protocolloConfig = mat.normalizeProtocolloProfilo(draft.protocollo);
      if (!protocolloConfig.rischi_ids.length) {
        window.showToast?.('Con protocollo Sì, seleziona almeno un rischio lavorativo', 'warning');
        return;
      }
      const accs = mat.accertamentiForRischi(protocolloConfig.rischi_ids);
      for (const acc of accs) {
        if (!mat.mergePeriodicitaIds(protocolloConfig.periodicita, acc.id).length) {
          window.showToast?.('Periodicità mancante per: ' + acc.nome, 'warning');
          return;
        }
      }
    }

    data.FasiLavoro = draft.fasi.map((x) => String(x.nome || '').trim()).filter(Boolean);
    data.RischiMansione = [];
    const payload = window.profiloPayloadFromForm(data);
    payload.protocollo_sanitario_config = protoSi ? protocolloConfig : {};
    if (data.TipoProfilo === 'Custom') {
      payload.sedi_operative = sediListaAzienda(payload.azienda_proprietaria_id);
    } else {
      payload.sedi_operative = [];
    }

    if (payload.tipo_profilo === 'Custom' && !payload.azienda_proprietaria_id) {
      window.showToast?.('Per un profilo Custom seleziona Azienda Proprietaria', 'warning');
      return;
    }

    const fasiPayload = draft.fasi.map((x) => ({
      id: x.id || null,
      nome: String(x.nome || '').trim(),
      misure_specifiche: x.misure_specifiche || '',
      dpi_specifici: x.dpi_specifici || '',
      rischi_lavorativi_ids: [],
    }));

    // Confirm se è un duplicato e il nome richiama uno Standard
    if (!itemId && isDuplicateFlow) {
      isDuplicateFlow = false;
      const newName = (data.NomeProfilo || '').trim();
      const baseName = newName.replace(/ - Copia(\s*\(\d+\))?$/i, '').trim().toLowerCase();
      const standards = (window.STATE?.data?.profili || []).filter(
        (p) => p.fields?.TipoProfilo === 'Standard'
      );
      const matched = standards.find(
        (s) => newName.toLowerCase().includes((s.fields?.NomeProfilo || '').trim().toLowerCase())
          || baseName === (s.fields?.NomeProfilo || '').trim().toLowerCase()
      );
      if (matched) {
        const ok = window.confirm(
          'Il nome "' + newName + '" è derivato dal profilo Standard "' + (matched.fields?.NomeProfilo || '') + '".\n'
          + 'Stai creando un profilo Custom specifico per un\'azienda.\nConfermi il salvataggio?'
        );
        if (!ok) return;
      }
    } else {
      isDuplicateFlow = false;
    }

    try {
      let profiloIdSaved = itemId;
      if (itemId) {
        const existing = (window.STATE?.data?.profili || []).find((p) => p.id == itemId);
        if (existing?.fields?.TipoProfilo === 'Standard') {
          payload.tipo_profilo = 'Standard';
          payload.azienda_proprietaria_id = null;
          payload.sedi_operative = [];
        }
        const { error } = await window.supabaseClient
          .from(window.CONFIG.tables.profili)
          .update(payload)
          .eq('id', itemId);
        if (error) throw error;
        window.showToast?.('Profilo aggiornato', 'success');
      } else {
        const { data: inserted, error } = await window.supabaseClient
          .from(window.CONFIG.tables.profili)
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        profiloIdSaved = inserted?.id;
        window.showToast?.('Profilo creato', 'success');
      }

      if (profiloIdSaved) {
        const { error: strErr } = await window.supabaseClient.rpc('fn_salva_struttura_profilo', {
          p_profilo_id: profiloIdSaved,
          p_fasi: fasiPayload,
        });
        if (strErr) throw strErr;
        await window.reloadProfiloFasiDettaglio?.();
      }

      window.closeModal('profiloModal');
      await window.renderProfili?.();
    } catch (error) {
      console.error(error);
      window.showToast?.('Errore salvataggio: ' + error.message, 'error');
    }
  }

  window.ProfiloModal = {
    open,
    openDuplicateFrom,
    save,
    addFase() {
      faseEditIndex = null;
      renderFaseSubModal();
    },
    editFase(i) {
      faseEditIndex = i;
      renderFaseSubModal();
    },
    removeFase(i) {
      draft.fasi.splice(i, 1);
      renderFasiList();
    },
    closeFaseModal() {
      window.closeModal('profiloFaseModal');
    },
    saveFaseModal() {
      const nome = (document.getElementById('faseNomeInput')?.value || '').trim();
      if (!nome) {
        window.showToast?.('Indica la descrizione della fase', 'warning');
        return;
      }
      const row = {
        id: faseEditIndex != null ? draft.fasi[faseEditIndex]?.id || null : null,
        nome,
        misure_specifiche: document.getElementById('faseMisureInput')?.value || '',
        dpi_specifici: document.getElementById('faseDpiInput')?.value || '',
      };
      if (faseEditIndex != null) draft.fasi[faseEditIndex] = row;
      else draft.fasi.push(row);
      window.closeModal('profiloFaseModal');
      renderFasiList();
    },
    onTipoProfiloChange(val) {
      const field = document.getElementById('aziendaProprietariaField');
      if (field) field.style.display = val === 'Custom' ? '' : 'none';
    },
    onProtocolloSorSanChange() {
      renderProtocolloPanel();
    },
    toggleProtocolloRischio(inp) {
      const id = inp.getAttribute('data-rischio-id');
      const set = new Set(draft.protocollo.rischi_ids || []);
      if (inp.checked) set.add(id);
      else set.delete(id);
      draft.protocollo.rischi_ids = Array.from(set);
      const mat = MAT();
      if (mat) {
        const allowed = new Set(mat.accertamentiForRischi(draft.protocollo.rischi_ids).map((a) => a.id));
        Object.keys(draft.protocollo.periodicita || {}).forEach((aid) => {
          if (!allowed.has(aid)) delete draft.protocollo.periodicita[aid];
        });
      }
      renderProtocolloPanel();
    },
    toggleProtocolloPeriodicita(inp) {
      const accId = inp.getAttribute('data-acc-id');
      const perId = inp.getAttribute('data-per-id');
      if (!draft.protocollo.periodicita[accId]) draft.protocollo.periodicita[accId] = [];
      const set = new Set(draft.protocollo.periodicita[accId]);
      if (inp.checked) set.add(perId);
      else set.delete(perId);
      draft.protocollo.periodicita[accId] = Array.from(set);
    },
  };
})();
