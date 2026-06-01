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
- `Biennale` (colonna periodicità, solo profilo **IMPIEGATO VDT**)

Usare etichette come in `rischio-accertamento-matrice.js` (`wordLabel`).

### 4. Nome profilo per nota Art. 176

La nota **Art. 176** (apice su «Biennale») scatta **solo** se il profilo si chiama esattamente **`IMPIEGATO VDT`** (maiuscole/minuscole normalizzate) **e** c’è periodicità **Biennale** su almeno un accertamento.

---

## Regole apici (implementate in codice)

| Caso | Condizione | Dove compare l’apice |
|------|------------|----------------------|
| **A – Art. 176** | Profilo = `IMPIEGATO VDT` + periodicità **Biennale** | Su testo `Biennale` (col. periodicità) |
| **B – Ematochimici** | Presenza accertamento «Esami ematochimici» | Su quell’accertamento (col. accertamenti) |
| **C – Antitetanica** | Presenza «Antitetanica» + periodicità **Biennale** e/o **Quinquennale** (non solo annuale) | Su «Antitetanica» (col. accertamenti) |

**Nuova pagina:** nel modale, flag «Inizia nuova pagina prima di questo gruppo» → salto pagina + apici B/C ripetuti con **nuovo numero** e stesso testo nota (come nel modello pag. 2).

---

## Wizard

```json
{
  "appendice_c_gruppi": {
    "uuid-profilo": {
      "rischi_ids": ["VDT", "RUMORE"],
      "periodicita": {
        "ESAMI_EMATOCHIMICI": ["biennale"],
        "ANTITETANICA": ["quinquennale"]
      },
      "page_break_before": false
    }
  }
}
```

---

## Bucket

`modelli/APPENDICE_C_SORVEGLIANZA.docx` (dopo aver applicato le modifiche sopra al file locale).
