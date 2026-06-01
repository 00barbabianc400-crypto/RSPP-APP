# APPENDICE_B2_MISURE — Tag Word (copertina)

Codice catalogo: **`APPENDICE_B2_MISURE`**  
Template bucket: **`modelli/APPENDICE_B2_MISURE.docx`** (base: `Appendice B-2 - 2024.docx`)

## Tabella COMMITTENTE (già presenti nel modello)

| Tag | Origine |
|-----|---------|
| `{%LOGO%}` | Logo azienda (iniezione codice) |
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Sede selezionata in generazione |
| `{{DATA_EMISSIONE}}` | Data emissione (gg/mm/aaaa, automatica) |

## Tabella «Sito» (seconda tabella) — celle valore colonna destra

Inserire in Word (una tag per cella, senza spezzare il testo):

| Riga etichetta | Tag da inserire nella cella valore |
|----------------|-------------------------------------|
| Sito: | `{{SEDE_OPERATIVA}}` *(già presente)* |
| Descrizione del sito: | `{{DESCRIZIONE_SITO}}` |
| Descrizione processo produttivo: | `{{DESCRIZIONE_PROCESSO_PRODUTTIVO}}` |
| Data sopralluogo | `{{DATA_SOPRALLUOGO}}` |

## Wizard

| Campo | Obbligatorio |
|-------|----------------|
| Data sopralluogo (`input type="date"`) | Sì |

## Anagrafica sedi (allineamento indici)

| Indice array | Sede | Campo DB |
|--------------|------|----------|
| 0 | `sede_operativa` | `descrizioni_sito_sedi[0]`, `descrizioni_processo_sedi[0]` |
| 1+ | `sedi_operative[n-1]` | `[n]` per entrambi gli array |
