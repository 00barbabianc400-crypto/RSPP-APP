# Scheda Azienda — convenzioni copertina (xlsx)

Foglio: **`Scheda Azienda`**

| Cella | Contenuto |
|-------|------------|
| **D2** | **Intero** testo emissione (sovrascritto da codice): ` Emissione del DD/MM/YYYY` — nel modello puoi lasciare testo di esempio o vuoto, **non serve alcun campo/tag** |
| **E2** | Lasciare libera se prima conteneva la data: viene **azzerata** in generazione (evita resti) |
| **D4** | Area ancoraggio **logo**: cella riservata; l’immagine viene inserita lato codice (PNG/JPEG), non valore di cella |
| **A9** | **Gruppi omogenei**: elenco dei `nome_profilo` dei profili associati all’azienda (attivi), **una riga per profilo** con prefisso `•`, ordine alfabetico su nome |
| **C9** | **Fasi di lavoro**: per ogni profilo nella stessa riga ordine di A9, gli elementi di `profili.fasi_lavoro` (**text[]**) come `• fase1, • fase2, …`; se vuoto → `• —` e la generazione viene bloccata in validazione |
| **Riga 11** | Intestazioni di sezione (merge **A11:B11** e **C11:D11**) |
| **Riga 12** | Intestazioni colonne: Mansione, Tipologia, Sicurezza, Igiene — **celle separate, senza merge** |
| **Righe ≥ 13** (col. **A–D**) | Dati profilo: **nessun merge** (A, B, C, D indipendenti). Una riga per gruppo omogeneo (**A** = nome; **B** = fasi in virgola; **C** / **D** = rischi selezionati). Fonte: `valutazioni_rischio` + wizard selezione. **C** = `Rischi per la Sicurezza`; **D** = `Rischi per la Salute` o `Rischi Psicosociali e Trasversali` |

Codice catalogo: **`APPENDICE_B1_PROFILI`** · cartella sorgente: `js/generazione/adapters/APPENDICE_B_1/`

Template nel bucket di default: **`modelli/APPENDICE_B1_PROFILI.xlsx`** (o nome mappato in `modelliStorageByCodice`).
