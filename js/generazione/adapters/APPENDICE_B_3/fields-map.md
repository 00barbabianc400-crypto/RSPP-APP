# APPENDICE_B3_ALTRE_SEDI — Tag Word (copertina)

Codice catalogo: **`APPENDICE_B3_ALTRE_SEDI`**  
Template bucket: **`modelli/APPENDICE_B3_ALTRE_SEDI.docx`** (stesso documento di B.2)

Logica identica a **Appendice B.2**: sede, descrizione sito e processo dalla sede selezionata in generazione; data sopralluogo dal wizard.

| Tag | Origine |
|-----|---------|
| `{%LOGO}` | Logo azienda |
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Sede selezionata (`generazioneSedeSelect`) |
| `{{DATA_EMISSIONE}}` | Automatica |
| `{{DESCRIZIONE_SITO}}` | `descrizioni_sito_sedi[]` per indice sede |
| `{{DESCRIZIONE_PROCESSO_PRODUTTIVO}}` | `descrizioni_processo_sedi[]` per indice sede |
| `{{DATA_SOPRALLUOGO}}` | Wizard (obbligatoria) |
