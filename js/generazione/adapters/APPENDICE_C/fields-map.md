# APPENDICE_C_SORVEGLIANZA — Field map + note a piè di pagina

## Modifiche da fare nel file Word (template)

### 1. Firma e intestazione (già impostate)

- `{{LUOGO}}, {{DATA_EMISSIONE}}`
- `{{MEDICO_COMPETENTE}}` al posto del nome medico di esempio
- `{%LOGO%}`, `{{RAGIONE_SOCIALE}}`, `{{SEDE_OPERATIVA}}`, `Emissione del {{DATA_EMISSIONE}}`

### 2. Tabella protocollo — sostituire righe statiche

Eliminare tutte le righe di esempio (IMPIEGATO VDT, TECNICO …) e le **note a piè di pagina già incollate** nel modello (apici 1–5): verranno create in automatico alla generazione.

Lasciare la riga intestazione, poi **una sola riga** con loop:

| Colonna | Tag |
|---------|-----|
| A | `{{GRUPPO_NOME}}` |
| B | `{{RISCHI_TESTO}}` |
| C | `{{ACCERTAMENTI_TESTO}}` |
| D | `{{PERIODICITA_TESTO}}` |

```
{{#GRUPPI}}
{{GRUPPO_NOME}}	{{RISCHI_TESTO}}	{{ACCERTAMENTI_TESTO}}	{{PERIODICITA_TESTO}}
{{/GRUPPI}}
```

(I tag su una riga di tabella; Word/Docxtemplater duplica la riga per ogni profilo.)

### 3. Testi da rispettare in colonna C e D

Per gli apici automatici il sistema cerca testo **esatto**:

- `Esami ematochimici` (colonna accertamenti)
- `Antitetanica` (inizio etichetta antitetanica)
- `Biennale` (colonna periodicità, deduplicata per gruppo — vedi sotto)

**Colonna periodicità (`{{PERIODICITA_TESTO}}`):** valori **unici** (Annuale / Biennale / Quinquennale) per tutto il gruppo, uno per riga, non ripetuti per ogni accertamento.

**Allineamento:** in generazione tutte le celle della tabella protocollo sono forzate **a sinistra** (`appendice-c-docx-format.js`).

**Note a piè di pagina:** disattivate in generazione automatica (le aggiungi manualmente nel modello Word se serve).

Usare etichette come in `rischio-accertamento-matrice.js` (`wordLabel`).

**Nuova pagina:** automatica dal **2° gruppo omogeneo** con sorveglianza Sì (nessuna scelta manuale nel wizard).

---

## Wizard

Dati iniziali da `profilo.protocollo_sanitario_config` (anagrafica profilo). Se mancano rischi/periodicità, sequenza modali automatica gruppo per gruppo.

```json
{
  "appendice_c_gruppi": {
    "uuid-profilo": {
      "rischi_ids": ["VDT", "RUMORE"],
      "periodicita": {
        "ESAMI_EMATOCHIMICI": ["biennale"],
        "ANTITETANICA": ["quinquennale"]
      }
    }
  }
}
```

`page_break_before` è calcolato in generazione (non salvato dal wizard).

---

## Bucket

`modelli/APPENDICE_C_SORVEGLIANZA.docx` (dopo aver applicato le modifiche sopra al file locale).
