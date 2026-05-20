# MOD_STRESS_LC — Fields Map

## Catalogo

| | |
|--|--|
| Codice DB | `MOD_STRESS_LC` (`supabase/seed.sql`, ordine 90) |
| Allegato correlato | `ALLEGATO_QUESTIONARIO_STRESS` |
| Bucket `modelli` | `MOD_STRESS_LC.docx` |

## Campi documento (intestazione / premessa)

| Tag Word | Origine |
|----------|---------|
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Anagrafica |
| `{{MODULO_NUMERO}}` | Operatore in anteprima |
| `{{DATA_EMISSIONE}}` | Data generazione |
| `{{LUOGO}}` | Da sede (firma) |
| `{{TESTO_DIREZIONE_PROPRIETARIO}}` | Operatore in anteprima (default: `della società`) |
| `{%LOGO}` | Logo azienda (post-render) |

## §6.1.1 — Comitato di valutazione (anagrafica)

| Tag Word | Colonna anagrafica | Note |
|----------|-------------------|------|
| `{{DATORE_LAVORO}}` | `datore_lavoro` | Sostituisce il nome dopo «Datore di Lavoro:» |
| `{{RSPP}}` | `rspp` | Dopo «Responsabile del Servizio di Prevenzione e Protezione:» |
| `{{RLS}}` | `rls` | Dopo «Rappresentante dei lavoratori per la sicurezza:» |
| `{{MEDICO_COMPETENTE}}` | `medico_competente` | Dopo «Medico Competente:» (può essere vuoto) |

## §6.1.2 — Individuazione gruppi omogenei (compilazione operatore)

**Titolo sezione in anteprima Compila:** «§6.1.2 — Modalità di individuazione dei gruppi omogenei».

| Scelta operatore | Contenuto nel Word |
|------------------|-------------------|
| **Elenco mansioni** | Intro in `{{SEZIONE_612…}}` → titolo fisso → elenco in cella blu |
| **Analisi senza distinzione** | Intro + testo centrale in `{{SEZIONE_612…}}`; titolo e cella **rimossi** dal post-processo |

| Tag Word | Uso |
|----------|-----|
| `{{SEZIONE_612_GRUPPI_OMOGENEI}}` | **Elenco:** solo intro. **Generale:** intro + testo centrale (textarea operatore). |
| `{{GRUPPI_OMOGENEI_TESTO}}` | Solo nella cella blu (modalità elenco). In generale resta vuoto e il blocco viene eliminato da `stress-docx-gruppi-612.js`. |

**Layout unico nel modello** (stesso `.docx` per entrambe le scelte):

```
{{SEZIONE_612_GRUPPI_OMOGENEI}}
Gruppi omogenei afferenti all'Unità Produttiva
{{GRUPPI_OMOGENEI_TESTO}}    ← nella cella blu
```

Post-generazione (`stress-docx-gruppi-612.js`): se scegli «senza distinzione», vengono cancellati dal XML solo il paragrafo «Gruppi omogenei afferenti…» e la tabella/cella sotto; il corpo completo resta in `{{SEZIONE_612_GRUPPI_OMOGENEI}}`.

- Elenco: un profilo/mansione per riga (`\n`); ordine alfabetico; precompilato dai profili associati all’azienda.
- Cella tabella elenco: allineamento orizzontale e verticale **centrato** (formattazione cella Word).

## Inserimento manuale nel `.docx`

### Tabella COMITATO (6.1.1)

Ogni tag (`{{RSPP}}`, `{{RLS}}`, …) deve stare in **un unico blocco di testo** in Word: non applicare grassetto/colore solo su parte del tag, non premere Invio dentro le graffe. Se in console compaiono `split-run` o `{{` / `}}` orfani, riscrivere il tag (incolla da Blocco note) o ricarica il template riparato.

Nelle celle valore (a destra delle etichette), al posto dei nomi fissi:

```
Datore di Lavoro:                          →  {{DATORE_LAVORO}}
Responsabile del Servizio … Protezione:  →  {{RSPP}}
Rappresentante dei lavoratori …:         →  {{RLS}}
Medico Competente:                       →  {{MEDICO_COMPETENTE}}
```

### §6.1.2 — blocco unico (entrambe le modalità)

```
{{SEZIONE_612_GRUPPI_OMOGENEI}}
Gruppi omogenei afferenti all'Unità Produttiva
{{GRUPPI_OMOGENEI_TESTO}}
```

Cella blu: centratura orizzontale/verticale; mansioni in **grassetto nero** (formattazione cella Word).

## §6.1.3 — Cronoprogramma (operatore)

Colonne **Fase** e **Attività** restano testo fisso nel Word; solo **Data attuazione** è compilabile.

| Tag Word | Fase | Attività | Default |
|----------|------|----------|---------|
| `{{CRONO_DATA_01}}` | FASE PROPEDEUTICA | Costituzione Gruppo di lavoro | *(vuoto — obbligatorio in compilazione)* |
| `{{CRONO_DATA_02}}` | | Sviluppo strategia comunicativa e di coinvolgimento | *(vuoto)* |
| `{{CRONO_DATA_03}}` | | Sensibilizzazione ed informazione | *(vuoto)* |
| `{{CRONO_DATA_04}}` | | Piano di valutazione del Rischio | *(vuoto)* |
| `{{CRONO_DATA_05}}` | | Individuazione gruppi omogenei | *(vuoto)* |
| `{{CRONO_DATA_06}}` | FASE PRELIMINARE | Lista di controllo ed analisi risultati | *(vuoto)* |
| `{{CRONO_DATA_07}}` | | Piano di monitoraggio | *(vuoto)* |
| `{{CRONO_DATA_08}}` | | Verifica efficacia interventi correttivi | *(vuoto)* |
| `{{CRONO_DATA_09}}` | FASE APPROFONDITA | Somministrazione Questionario / Focus group | Non applicabile |
| `{{CRONO_DATA_10}}` | | Analisi dei risultati | Non applicabile |
| `{{CRONO_DATA_11}}` | FASE PIANIFICAZIONE INTERVENTI | Pianificazione interventi correttivi | *(vuoto)* |
| `{{CRONO_DATA_12}}` | | Verifica efficacia interventi correttivi | *(vuoto)* |

Valore libero (anno, data completa, «Non applicabile», ecc.). Righe 01–08 e 11–12 partono vuote; 09–10 con default «Non applicabile». Tutte obbligatorie prima di generare il Word.

## §6.2 — Valutazione preliminare (questionario Excel)

L’operatore carica il file Excel (`.xlsx` / `.xlsm`; nome libero). Il sistema legge:

| Foglio | Marcatori attivi | Fallback punteggio | Etichetta | Testo esito |
|--------|------------------|--------------------|-----------|-------------|
| **RISULTATI** | `E18`, `E20`, `E22` = `X` | `E15` (fasce −4…58 / 59…90 / 91…216) | `D18` / `D20` / `D22` | `F18` / `F20` / `F22` |
| **INTEGRATIVA** | `C27`, `C29`, `C31` = `X` | `M16` o `C24` % (0…28 / 28…85 / 86…100) | `B27` / `B29` / `B31` | `D27` / `D29` / `D31` |

### Tag Word — tabella «questionario comitato» (2 colonne)

| Colonna sinistra (sfondo colore livello + testo grassetto nero) | Colonna destra (testo esito, allineato a sinistra) |
|-----------------------------------------------|------------------------|
| `{{RISULTATI_LIVELLO_RISCHIO}}` | `{{RISULTATI_TESTO_ESITO}}` |

Sostituisci la riga tipo `RISCHIO BASSO[FM1.1]` + paragrafo a destra. Rimuovi `[FM1.1]` / note a piè di pagina se non servono.

**Layout (4 celle):** nelle due tabelle §6.2, **tutte e 4 le celle** (livello + testo esito × 2) con allineamento **sinistro** e verticale **alto** nel DOCX generato.

**Colori celle livello** (solo le **due celle sinistre**, non il colore del carattere):

| Livello | Sfondo cella | Testo |
|---------|--------------|-------|
| BASSO | verde `#00B050` | grassetto nero |
| MEDIO | arancio `#FFC000` | grassetto nero |
| ALTO | rosso `#C00000` | grassetto nero |

### Tag Word — tabella «lavoro da remoto / innovazione» (2 colonne)

| Colonna sinistra | Colonna destra |
|------------------|----------------|
| `{{INTEGRATIVA_LIVELLO_RISCHIO}}` | `{{INTEGRATIVA_TESTO_ESITO}}` |

Sostituisci la riga attiva (es. `RISCHIO BASSO` + testo «Implementazione adeguata…»). Nel modello Excel ci sono tre righe con `X` solo su quella selezionata: nel Word va **una sola riga** con i due tag (non le tre righe statiche).

`{{RAGIONE_SOCIALE}}` nel paragrafo introduttivo §6.1.2 resta come già definito.

## §6.3 — Valutazione approfondita

| Tag Word | Logica |
|----------|--------|
| `{{VALUTAZIONE_APPROFONDITA_TESTO}}` | Sostituisce **tutto** il testo del §6.3 (due paragrafi del modello) |

**Automatico** se questionario con rischio **BASSO** sia su foglio RISULTATI sia su INTEGRATIVA → testo standard:

> A seguito della Valutazione preliminare, la quale ha evidenziato un rischio NON RILEVANTE, la Direzione aziendale non ha ritenuto opportuno procedere con una valutazione approfondita.
>
> Dalla valutazione del rischio eseguita non emergono situazioni degne di approfondimento.

**Compilazione operatore** se almeno un rischio è **MEDIO** o **ALTO** → textarea obbligatoria in anteprima.

Nel Word: un solo placeholder al posto dei due paragrafi (i due a capo sono gestiti dal sistema con `\n\n`).

## Conclusioni

| Tag Word | Logica |
|----------|--------|
| `{{CONCLUSIONI_TESTO}}` | Sostituisce **entrambi** i paragrafi conclusivi del modello |

**Automatico** se questionario con rischio **BASSO** su RISULTATI e INTEGRATIVA → testo standard:

> In conclusione, l'analisi degli indicatori non evidenzia particolari condizioni organizzative che possono determinare la presenza di stress correlato a livelli rilevanti.
>
> In ogni caso data la rilevanza della problematica analizzata, la valutazione oggettiva dovrà essere ripetuta con cadenza biennale, e dovrà tener conto delle indicazioni che la prassi e la giurisprudenza forniranno a valle di questo primo approccio normativo alla problematica dello Stress Lavoro Correlato.

**Compilazione operatore** se almeno un rischio è **MEDIO** o **ALTO** → textarea obbligatoria in anteprima.

Nel Word: un solo placeholder al posto dei due paragrafi (a capo tra i due blocchi con `\n\n`).

## §6.4 — Pianificazione degli interventi (da Excel)

Stesso file questionario (`Questionario SLC CON RISULTATI agg. 2026.xlsx`). I testi dinamici del §6.4 derivano dai fogli **INDICATORI AZIENDALI**, **CONTENUTO**, **CONTESTO**.

### Struttura celle (mappatura lettura)

| Foglio | Sotto-area (titolo) | Testo indicatore | Valutazione operatore | Azioni di miglioramento (sotto-area) |
|--------|---------------------|------------------|----------------------|--------------------------------------|
| **INDICATORI AZIENDALI** | — | col. **D** | col. **F/H/J** (variazione), **S**=IDONEO, **T**=DA MIGLIORARE | col. **U** |
| **CONTENUTO** | col. **C** | col. **D** | col. **F**=SI, **H**=NO (+ punteggi J/K/L) | col. **N** (intestazione riga 5) |
| **CONTESTO** | col. **C** | col. **D** | col. **F**=SI, **G**=NO (+ punteggi I/J/K) | col. **M** (intestazione riga 5) |

### Regola di estrazione (implementata in `stress-questionario-xlsx.js`)

**Trigger unico:** sulla **stessa riga** dell’indicatore, colonna «Azioni di miglioramento» con **`X`** (nessun altro filtro).

| Foglio | Colonna azioni (riga 5) | Righe incluse |
|--------|-------------------------|---------------|
| INDICATORI AZIENDALI | **U** | Solo righe indicatore con **U** = `X` |
| CONTENUTO | **N** | Solo righe indicatore con **N** = `X` |
| CONTESTO | **M** | Solo righe indicatore con **M** = `X` |

La colonna azioni è rilevata dall’intestazione «AZIONI DI MIGLIORAMENTO» (riga 5); se assente, si usano i fallback sopra.

**Trasformazione al negativo** (solo righe con **SI** o **NO** sulla stessa riga; escluse intestazioni di sotto-area):

- NO su «Presenza di…» → «Non è presente …» / «Assenti …»
- NO su «adeguato…» → «Non adeguato: …» (senza ripetere «adeguato»)
- NO su «diffusione…» → «Non è diffuso l'…»
- SI su «ci sono…» → «Sono presenti …»; SI su criticità → frase al positivo («È presente il lavoro a turni», ecc.)
- INDICATORI: **J** → «Aumento degli indici infortunistici» / ferie / procedimenti; **F** → «Diminuzione …»
- Escluse righe-titolo (es. «ambiente di lavoro ed attrezzature», «ruolo nell'ambito dell'organizzazione») senza SI/NO

**Formato output** in `{{PIANIFICAZIONE_INTERVENTI_ELENCO}}` (un paragrafo strutturato, a capo):

```
Area indicatori aziendali:
<riga 1>
<riga 2>

Area contenuto:
<riga 1>
...

Area Contesto:
<riga 1>
...
```

Intestazioni «Area …:» in **grassetto** nel DOCX (post-render). Prefisso `Per alcuni gruppi omogenei` su indicatori fisico/ergonomici (movimentazione, rumore, macchine, …).

> Nel file modello vuoto le X non sono compilate: l’elenco resta vuoto finché non si marca il questionario.

### Tag Word — §6.4

| Parte nel modello Word | Tag | Note |
|------------------------|-----|------|
| Paragrafo introduttivo fisso («A seguito della valutazione è prevista comunque…») | *(testo fisso nel Word)* | Non sostituire |
| **Elenco aspetti** (blocco lungo con `; `) | `{{PIANIFICAZIONE_INTERVENTI_ELENCO}}` | Generato da Excel (regola sopra) |
| Testo fisso «In particolare la Direzione si è attivata per:» | *(testo fisso nel Word)* | Non sostituire |
| **Elenco puntato misure** (tutti i `•` del modello, senza titoli di area) | `{{PIANIFICAZIONE_INTERVENTI_MISURE}}` | Catalogo in `pianificazione-misure.js`; compilazione in anteprima |
| Paragrafi finali fissi («Per alcuni elementi non è facile…» / «Per altri elementi invece…») | *(testo fisso nel Word)* | Non sostituire |

**Excel** — sostituisci il blocco aspetti critici (testo con `; `) con:

```
{{PIANIFICAZIONE_INTERVENTI_ELENCO}}
```

**Misure Direzione** — sostituisci **tutto** l’elenco puntato sotto «In particolare la Direzione si è attivata per:» (da primo `•` a ultimo `•`, senza lasciare righe vuote o sottotitoli) con **un solo** placeholder:

```
{{PIANIFICAZIONE_INTERVENTI_MISURE}}
```

Output: righe `•\tTesto` concatenate con un solo a capo (`\n`), senza doppi spazi tra voci. Rimuovi `[FM1.1]` e simili dal Word.

---

## File adapter (cartella `MOD_STRESS_LC`)

| File | Ruolo |
|------|--------|
| `adapter.js` | buildData, applyWizard, validate, generateDocx |
| `stress-questionario-xlsx.js` | Parser Excel (RISULTATI, INTEGRATIVA, §6.4) |
| `stress-docx-color.js` | Sfondo celle livello §6.2, allineamento 4 celle, grassetto aree §6.4 |
| `pianificazione-misure.js` | Catalogo misure §6.4 (elenco puntato Direzione) |
| `preview.html` | UI compilazione |
| `logo-docx.js` | Iniezione logo nel DOCX |
| `fields-map.md` | Mappa tag Word (questo file) |

Questionario Excel: file esterno caricato dall’operatore (non in repo). Template Word: `MOD_STRESS_LC.docx` nel bucket Supabase `modelli`.
