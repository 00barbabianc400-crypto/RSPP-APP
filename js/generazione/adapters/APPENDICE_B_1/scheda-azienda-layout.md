# Scheda Azienda — convenzioni copertina (xlsx)

Foglio: **`Scheda Azienda`**

| Cella | Contenuto |
|-------|------------|
| **D2** | **Intero** testo emissione (sovrascritto da codice): ` Emissione del DD/MM/YYYY` — nel modello puoi lasciare testo di esempio o vuoto, **non serve alcun campo/tag** |
| **E2** | Lasciare libera se prima conteneva la data: viene **azzerata** in generazione (evita resti) |
| **D4** | Area ancoraggio **logo**: cella riservata; l’immagine viene inserita lato codice (PNG/JPEG), non valore di cella |
| **A9** | **Gruppi omogenei**: elenco dei `nome_profilo` dei profili associati all’azienda (attivi), **una riga per profilo** con prefisso `•`, ordine alfabetico su nome |
| **C9** | **Fasi di lavoro**: per ogni profilo nella stessa riga ordine di A9, gli elementi di `profili.fasi_lavoro` (**text[]**) come `• fase1, • fase2, …`; se vuoto → `• —` e la generazione viene bloccata in validazione |
| **Righe ≥ 13** (col. **A–D**) | Tabella «Profili di rischio presenti in azienda» (intestazioni tipicamente righe 11–12 nel modello): una riga per ogni gruppo omogeneo (**A** = nome profilo; **B** = stesse fasi di `fasi_lavoro` ma in un’unica stringa separata da virgola; **C** / **D** = elenco nomi rischio da Valutazioni, separati da virgola). Fonte rischi: `valutazioni_rischio` per l’azienda con `rischio_associato = true`, join `catalogo_rischio`. **Colonna C** = rischi con `macro_categoria = 'Rischi per la Sicurezza'`. **Colonna D** = rischi con `macro_categoria` = `'Rischi per la Salute'` oppure `'Rischi Psicosociali e Trasversali'` (valori nel `seed.sql`). Nel wizard dell’anteprima ogni rischio è mostrato con checkbox **tutti selezionati** di default; l’operatore può escluderne alcuni dalla stampa sul foglio |

Codice catalogo: **`APPENDICE_B1_PROFILI`** · cartella sorgente: `js/generazione/adapters/APPENDICE_B_1/`

Template nel bucket di default: **`modelli/APPENDICE_B1_PROFILI.xlsx`** (o nome mappato in `modelliStorageByCodice`).
