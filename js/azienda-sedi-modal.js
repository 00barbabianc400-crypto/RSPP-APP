/**
 * Sedi operative azienda: lista card + sotto-modale (indirizzo + descrizione processo).
 * Persistenza: sede_operativa, sedi_operative[], descrizioni_processo_sedi[] allineati.
 */
(function () {
  'use strict';

  /** @type {{ sedi: Array<{ principale: boolean, indirizzo: string, descrizione_processo: string }> }} */
  let draft = { sedi: [] };
  let editIndex = null;

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

  function splitDescrizioni(fields) {
    const extra = fields?.SediOperative ?? fields?.sedi_operative ?? [];
    const arr = Array.isArray(fields?.DescrizioniProcessoSedi)
      ? fields.DescrizioniProcessoSedi
      : (Array.isArray(fields?.descrizioni_processo_sedi) ? fields.descrizioni_processo_sedi : []);
    return {
      principale: String(arr[0] || '').trim(),
      extra: (Array.isArray(extra) ? extra : []).map((_, i) => String(arr[i + 1] || '').trim()),
    };
  }

  function loadFromFields(f) {
    const fields = f || {};
    const desc = splitDescrizioni(fields);
    const sedi = [];
    sedi.push({
      principale: true,
      indirizzo: String(fields.SedeOperativa ?? fields.sede_operativa ?? '').trim(),
      descrizione_processo: desc.principale,
    });
    const extra = fields.SediOperative ?? fields.sedi_operative ?? [];
    (Array.isArray(extra) ? extra : []).forEach((addr, i) => {
      const t = String(addr || '').trim();
      if (!t) return;
      sedi.push({
        principale: false,
        indirizzo: t,
        descrizione_processo: desc.extra[i] || '',
      });
    });
    draft.sedi = sedi;
    editIndex = null;
  }

  function initEmpty() {
    draft.sedi = [{ principale: true, indirizzo: '', descrizione_processo: '' }];
    editIndex = null;
  }

  function sedeSummaryChips(sede) {
    const parts = [];
    if (sede.descrizione_processo) parts.push('processo');
    return parts.length ? parts.join(' · ') : '—';
  }

  function renderList() {
    const host = document.getElementById('aziendaSediCards');
    if (!host) return;
    if (!draft.sedi.length) {
      host.innerHTML = '<p class="hint-str">Nessuna sede. Configura la sede principale.</p>';
      return;
    }
    host.innerHTML = draft.sedi
      .map((s, i) => {
        const title = s.indirizzo
          ? esc(window.shortLabelSede?.(s.indirizzo) || s.indirizzo)
          : (s.principale ? 'Sede principale (da compilare)' : 'Nuova sede (da compilare)');
        const badge = s.principale
          ? '<span class="badge info" style="margin-right:6px;">Principale</span>'
          : '';
        const removeBtn = s.principale
          ? ''
          : '<button type="button" class="icon-btn danger" title="Rimuovi" onclick="AziendaSedi.removeSede('
            + i + ')">🗑</button>';
        return ''
          + '<div class="profilo-fase-card">'
          + '<div class="profilo-fase-card-head">'
          + badge + '<strong>' + title + '</strong>'
          + '<span class="hint-str">' + esc(sedeSummaryChips(s)) + '</span>'
          + '</div>'
          + '<div class="profilo-fase-card-actions">'
          + '<button type="button" class="btn" onclick="AziendaSedi.editSede(' + i + ')">Configura</button>'
          + removeBtn
          + '</div></div>';
      })
      .join('');
  }

  function renderSubModal() {
    const sede = editIndex != null ? draft.sedi[editIndex] : null;
    const isPrincipale = sede?.principale === true;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'aziendaSedeModal';
    modal.innerHTML = ''
      + '<div class="modal" style="max-width:720px;" onclick="event.stopPropagation()">'
      + '<div class="modal-header">'
      + '<div class="modal-title">'
      + (isPrincipale ? 'Sede operativa principale' : (editIndex != null ? 'Sede operativa' : 'Nuova sede'))
      + '</div>'
      + '<button type="button" class="icon-btn" onclick="AziendaSedi.closeSubModal()">✕</button>'
      + '</div>'
      + '<div class="modal-body">'
      + (isPrincipale
        ? '<p class="hint-str" style="margin:0 0 12px;">Obbligatoria per l\'anagrafica e per la generazione documenti (default).</p>'
        : '<p class="hint-str" style="margin:0 0 12px;">Sede aggiuntiva: in generazione potrai scegliere quale sede usare.</p>')
      + '<div class="form-field full"><label>Indirizzo sede <span class="required">*</span></label>'
      + '<textarea id="aziendaSedeIndirizzoInput" rows="2" placeholder="Via, CAP, città (prov.)">'
      + esc(sede?.indirizzo || '') + '</textarea></div>'
      + '<div class="form-field full"><label>Descrizione del processo produttivo</label>'
      + '<textarea id="aziendaSedeProcessoInput" rows="4" placeholder="Attività e processi svolti in questa sede">'
      + esc(sede?.descrizione_processo || '') + '</textarea></div>'
      + '</div>'
      + '<div class="modal-footer">'
      + '<button type="button" class="btn" onclick="AziendaSedi.closeSubModal()">Annulla</button>'
      + '<button type="button" class="btn btn-primary" onclick="AziendaSedi.saveSubModal()">Applica</button>'
      + '</div></div>';
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    modal.onclick = () => AziendaSedi.closeSubModal();
    document.getElementById('aziendaSedeIndirizzoInput')?.focus();
  }

  function normalizeDraftForSave() {
    const principale = draft.sedi.find((s) => s.principale) || draft.sedi[0];
    const addrPrinc = String(principale?.indirizzo || '').trim();
    const extras = [];
    draft.sedi.forEach((s) => {
      if (s.principale) return;
      const t = String(s.indirizzo || '').trim();
      if (t && t !== addrPrinc && !extras.some((e) => e.indirizzo === t)) {
        extras.push({ indirizzo: t, descrizione_processo: String(s.descrizione_processo || '').trim() });
      }
    });
    return { principale, addrPrinc, extras };
  }

  function payloadFromDraft() {
    const { principale, addrPrinc, extras } = normalizeDraftForSave();
    const descrizioni = [
      String(principale?.descrizione_processo || '').trim(),
      ...extras.map((e) => e.descrizione_processo),
    ];
    return {
      sede_operativa: addrPrinc,
      sedi_operative: extras.map((e) => e.indirizzo),
      descrizioni_processo_sedi: descrizioni,
    };
  }

  function validate() {
    const { addrPrinc } = normalizeDraftForSave();
    if (!addrPrinc) {
      return 'Configura la sede operativa principale (indirizzo obbligatorio).';
    }
    return null;
  }

  window.AziendaSedi = {
    initFromFields(f) {
      const hasData = String(f?.SedeOperativa ?? f?.sede_operativa ?? '').trim()
        || (Array.isArray(f?.SediOperative) && f.SediOperative.length)
        || (Array.isArray(f?.sedi_operative) && f.sedi_operative.length);
      if (hasData) loadFromFields(f);
      else initEmpty();
    },
    initEmpty,
    renderList,
    validate,
    payloadFromDraft,
    addSede() {
      editIndex = null;
      renderSubModal();
    },
    editSede(i) {
      editIndex = i;
      renderSubModal();
    },
    removeSede(i) {
      const s = draft.sedi[i];
      if (!s || s.principale) {
        window.showToast?.('La sede principale non può essere rimossa', 'warning');
        return;
      }
      draft.sedi.splice(i, 1);
      renderList();
    },
    closeSubModal() {
      window.closeModal?.('aziendaSedeModal');
    },
    saveSubModal() {
      const indirizzo = (document.getElementById('aziendaSedeIndirizzoInput')?.value || '').trim();
      if (!indirizzo) {
        window.showToast?.('Indica l\'indirizzo della sede', 'warning');
        return;
      }
      const descrizione_processo = document.getElementById('aziendaSedeProcessoInput')?.value || '';
      const row = {
        principale: editIndex != null ? !!draft.sedi[editIndex]?.principale : false,
        indirizzo,
        descrizione_processo,
      };
      if (editIndex != null) draft.sedi[editIndex] = row;
      else draft.sedi.push(row);
      window.closeModal('aziendaSedeModal');
      renderList();
    },
  };
})();
