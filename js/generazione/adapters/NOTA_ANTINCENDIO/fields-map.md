# NOTA_ANTINCENDIO — Mappa campi Word

**Catalogo:** `NOTA_ANTINCENDIO` — *Informativa antincendio per i lavoratori* (ordine 240)  
**Template bucket:** `modelli/NOTA_ANTINCENDIO.docx`

---

## Stato attuale (scaffolding)

| Tag | Origine | Note |
|-----|---------|------|
| `{%LOGO%}` | Loghi azienda | Header o prima pagina — sostituire segnaposto `LOGO` |
| `{{RAGIONE_SOCIALE}}` | Anagrafica | |
| `{{SEDE_OPERATIVA}}` | Sede scelta in generazione | |
| `{{MODULO_NUMERO}}` | Wizard | Formattato 2 cifre (default 240) |
| `{{DATA_EMISSIONE}}` | Automatica | Data generazione |
| `{{LUOGO}}` | Da sede operativa | Prima parte prima della virgola |

### Allegati (copertina)

| Tag | Origine | Note |
|-----|---------|------|
| `{{#ALLEGATI}}{{TESTO}}{{/ALLEGATI}}` | Wizard | Solo sul **primo** bullet sotto «ALLEGATI:»; secondo bullet fisso rimosso dal modello |
| (wizard) `piano_emergenza` | Sì/No | Se **Sì**: FIGURE ATTIVE + PROCEDURE DI GESTIONE DELLE EMERGENZE; se **No**: solo FIGURE ATTIVE |

### 3.1 Misure di prevenzione

| Tag | Origine | Note |
|-----|---------|------|
| `{{#MISURE_PREVENZIONE}}{{TESTO}}{{/MISURE_PREVENZIONE}}` | Catalogo + wizard | Solo sul **primo** bullet dopo l’intro; altri punti fissi rimossi dal modello |
| (wizard) `porte_rei` | Sì/No | Se **No** si omette il punto sulle porte tagliafuoco (Porte REI); numerazione ricalcolata in generazione |

### 3.2 Misure di protezione

| Tag | Origine | Note |
|-----|---------|------|
| `{{#PROTEZIONI_ATTIVE}}{{TESTO}}{{/PROTEZIONI_ATTIVE}}` | Wizard (checkbox + testo) | Primo bullet sotto «PROTEZIONI ATTIVE» |
| `{{#PROTEZIONI_PASSIVE}}{{TESTO}}{{/PROTEZIONI_PASSIVE}}` | Wizard (checkbox + testo) | Primo bullet sotto «PROTEZIONI PASSIVE» |
| (wizard) `protezioni_attive` / `protezioni_passive` | Array `{ id, testo, selezionato }` + righe `custom_*` | Se **IRAI** selezionato: non compaiono rilevazione e allarme |

### 4.1 Comportamenti in emergenza incendio

| Tag | Origine | Note |
|-----|---------|------|
| `{{#COMPORTAMENTI_INCENDIO_A}}{{TESTO}}{{/COMPORTAMENTI_INCENDIO_A}}` | Catalogo + wizard | Primo bullet prima di «In caso di evacuazione occorre:» |
| `{{#COMPORTAMENTI_INCENDIO_B}}{{TESTO}}{{/COMPORTAMENTI_INCENDIO_B}}` | Catalogo + wizard | Primo bullet dopo l’intro evacuazione |
| (wizard) `porte_scorrevoli` | Sì/No | Se **No** si omette il punto sulle porte scorrevoli |
| (wizard) `ascensori` | Sì/No | Se **No** si omette «È vietato l’utilizzo degli ascensori» |

### 4.2 — Rinvenimento oggetto sospetto (primo sottoparagrafo)

| Tag | Origine | Note |
|-----|---------|------|
| `{{DESTINATARIO_OGGETTO_SOSPETTO}}` | Wizard | «Posto di Chiamata» oppure «Responsabile delle Emergenze» — al posto di «Posto di Chiamata, ovvero al Responsabile…» |
| (wizard) `oggetto_sospetto_destinatario` | `posto_chiamata` \| `responsabile` | Stessa scelta anche per fuga di gas e altri §4.2 |

### 4.2 — Fuga di gas (ultimo punto elenco)

| Tag | Origine | Note |
|-----|---------|------|
| `{{DESTINATARIO_EMERGENZA_ALLERTA}}` | Wizard (stesso switch) | Nell’ultimo bullet: «Allertare il … per l’eventuale chiamata…» — al posto di «Posto di chiamata/Responsabile dell’emergenza» |

### 6 — Procedure incendio

| Tag | Origine | Note |
|-----|---------|------|
| `{{#PROCEDURE_IN_ALLEGATO}}…{{/PROCEDURE_IN_ALLEGATO}}` | Wizard `piano_emergenza` | Se **Sì** (procedure in allegato): solo la frase «Le procedure… sono ripotate in allegato…» |
| `{{#PROCEDURE_INLINE}}…{{/PROCEDURE_INLINE}}` | Inverso di `piano_emergenza` | Se **No**: fasi incendio 1–3, gestione particolare incendio, flusso emergenza sanitaria, **§6.1** norme elementari (fino a prima della seconda «GESTIONE…» sanitaria / cap. 8). `{{/PROCEDURE_INLINE}}` va **dopo** la 6.1 |
| `{{TESTO_EVACUAZIONE_SITO}}` | Wizard `segnale_allarme_evacuazione` | Nel diagramma GESTIONE: con allarme «Evacuazione del sito (attivazione segnale di allarme);», altrimenti «Evacuazione del sito;» |
| `{{TESTO_PUNTO_RACCOLTA_GESTIONE}}` | Wizard `blocco_traffico_punto_raccolta` | Con blocco traffico testo completo con «(blocco del traffico)», altrimenti senza parentesi |

### 9.1 — Sorveglianza in esercizio

| Tag | Origine | Note |
|-----|---------|------|
| `{{#SORVEGLIANZA_VERIFICHE}}{{TESTO}}{{/SORVEGLIANZA_VERIFICHE}}` | Wizard (checkbox + testo) | Primo bullet dopo «In particolare… dovranno verificare:»; tutti attivi di default |
| (wizard) `sorveglianza_verifiche` | Array `{ id, testo, selezionato }` + `custom_*` | Paragrafo «In occasione di interventi…» resta fisso nel Word |

### 10 — Aree operative

| Tag | Origine | Note |
|-----|---------|------|
| `{{LUOGO_CENTRO_COORDINAMENTO}}` | Wizard | Cella gialla al posto di `RECEPTION` (centro) |
| `{{LUOGO_POSTO_CHIAMATA}}` | Wizard | Cella gialla al posto di `RECEPTION` (posto di chiamata) |
| `{{LUOGO_PUNTO_RACCOLTA}}` | Wizard | Cella gialla accanto a «PUNTO DI RACCOLTA» (un solo luogo) |

---

## Sezioni da mappare (prossima sessione)

Da definire sul file Word reale. Possibili aree:

1. **Premessa** — riferimenti D.Lgs. 81/08, obblighi informativa
2. **Organizzazione** — addetti antincendio, ruoli (eventuale collegamento anagrafica `addetto_antincendio`)
3. **Allarme ed evacuazione** — procedure, punti raccolta, vie di esodo
4. **Mezzi di prevenzione** — estintori, idranti, segnaletica
5. **Comportamenti** — divieti, cosa fare in caso di incendio
6. **Esercitazioni** — riferimento periodicità se previsto nel modello

Per ogni sezione: indicare testo fisso vs tag modificabili vs elenchi con loop Docxtemplater.

---

## File adapter

| File | Ruolo |
|------|--------|
| `adapter.js` | Build dati, validazione, render DOCX |
| `logo-docx.js` | Iniezione logo |
| `preview.html` | Wizard compilazione |
