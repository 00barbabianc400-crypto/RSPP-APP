# MOD_CHIMICO — Mappa tag Word

Modello: `MOD_CHIMICO.docx` nel bucket `modelli`.

## Copertina

| Tag | Fonte |
|-----|--------|
| `{%LOGO}` | Logo azienda (un run) |
| `{{MODULO_NUMERO}}` | Wizard |
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Anagrafica |
| `{{DATA_EMISSIONE}}` | Generazione |

## §3 — Classificazione dei lavoratori

### Paragrafi fissi nel modello (non tag)

- Didascalia: «Gruppi omogenei afferenti all'Unità Produttiva (potenzialmente esposti ad agenti chimici)»
- Paragrafo consulente esterno (D.Lgs. 81/08 art. 3)

### Paragrafo intro

Già nel modello:

```
Il personale della {{RAGIONE_SOCIALE}} è distribuito nelle differenti mansioni…
```

### Tabella 1 — Nomi gruppo (cella blu)

Sostituire il testo fisso del gruppo con:

```
{{GRUPPI_CHIMICI_NOMI}}
```

Un nome per riga (`\n`).

### Paragrafo sorveglianza sanitaria (condizionale)

Sostituire l’intero paragrafo «I nominativi di tali figure sono stati comunicati al Medico Competente…» con:

```
{{PARAGRAFO_SORVEGLIANZA_SANITARIA}}
```

- Se **almeno un** profilo selezionato ha `protocollo_sor_san = true` → testo completo legge 422/2000.
- Se tutti i selezionati hanno sorveglianza **No** → tag vuoto (lasciare solo questo paragrafo nel Word, senza testo fisso duplicato).

### Tabella 2 — GRUPPO OMOGENEO | ATTIVITÀ

Nella **riga dati** sotto l’intestazione (non nella riga titolo), inserire il loop Docxtemplater:

| Colonna 1 | Colonna 2 |
|-----------|-----------|
| `{{#gruppi_chimici}}{{nome}}{{/gruppi_chimici}}` | `{{#gruppi_chimici}}{{attivita}}{{/gruppi_chimici}}` |

Oppure, se preferisci un solo blocco riga:

```
{{#gruppi_chimici}}
{{nome}}    {{attivita}}
{{/gruppi_chimici}}
```

(Word: una riga modello tra `{#` e `{/`.)

### Valutazione ciclo di lavoro

**Rimuovere** i due paragrafi fissi («se unico grppo…» / «se più gruppi…») e mettere **un solo** paragrafo:

```
{{TESTO_VALUTAZIONE_CICLO}}
```

- 1 gruppo selezionato → testo «unico» (modificabile in Compila).
- 2+ gruppi → testo «multipli» (modificabile in Compila).

## Compilazione (preview)

- Checkbox per ogni profilo associato all’azienda (default: **non** selezionato).
- Descrizione attività modificabile per riga.
- Sorveglianza: solo indicatore da anagrafica profilo; il paragrafo Word dipende dalla selezione.
- Radio / auto ciclo lavoro + textarea testo.

## §6 — Censimento delle sostanze utilizzate

### Paragrafi intro + categorie pericolo

Lasciare **fissi** nel modello (nessun tag):

- Paragrafi introduttivi (il primo con `{{RAGIONE_SOCIALE}}` già presente)
- «Ad ogni buon conto… schede di sicurezza»
- «In particolare potranno essere presenti…»
- Elenco **CATEGORIA DI PERICOLO**: INFIAMMABILI, CORROSIVI, IRRITANTI, SENSIBILIZZANTI

### Tabella sostanze — un blocco per gruppo §3

Duplicare nel Word la **tabella modello** (titolo gruppo + intestazione + riga dati) e avvolgerla con il loop esterno.
Sostituire il titolo fisso «IMPIEGATO VDT» con il tag gruppo.

**Riga 0 — titolo gruppo** (prima cella, o cella unita):

```
{{#censimento_gruppi}}{{gruppo_nome}}
```

**Riga 1 — intestazione** (testo fisso, una sola volta per blocco):

| Sostanza | Tipo | CAS | Frasi H | Etichette e Pittogrammi |
|----------|------|-----|---------|-------------------------|

La quinta colonna resta **vuota** (pittogrammi gestiti a mano nel Word).

**Riga 2 — riga modello dati** (loop sostanze):

| Colonna 1 | Colonna 2 | Colonna 3 | Colonna 4 | Colonna 5 |
|-----------|-----------|-----------|-----------|-----------|
| `{{#sostanze}}{{sostanza}}` | `{{tipo}}` | `{{cas}}` | `{{frasi_h}}` | (vuota) |
| chiusura in ultima cella dati: `{{/sostanze}}{{/censimento_gruppi}}` | | | | |

Variante equivalente (chiusure in cella 4):

```
{{#sostanze}}
{{sostanza}}    {{tipo}}    {{cas}}    {{frasi_h}}{{/sostanze}}
{{/censimento_gruppi}}
```

(tutto nella stessa riga tabella, tra `{#sostanze}` e `{/sostanze}`.)

**Dati Compila:** per ogni profilo **selezionato** in §3, tabella con colonne Sostanza, Tipo, CAS, Frasi H (+ righe aggiungibili). Nessun campo pittogrammi in Compila.

**Array inviato a Docxtemplater:**

```json
"censimento_gruppi": [
  {
    "gruppo_nome": "IMPIEGATO VDT",
    "sostanze": [
      { "sostanza": "ANIOSGEL 85 NPC", "tipo": "L", "cas": "67-63-0\n64-17-5", "frasi_h": "H225, H319" }
    ]
  }
]
```

Gruppi senza righe sostanza → tabella con solo titolo e intestazione (nessuna riga dati).

## §7 — ESITI DELLA VALUTAZIONE DEI RISCHI

### Cosa resta fisso / manuale

- **H1** «ESITI DELLA VALUTAZIONE DEI RISCHI» e i **due paragrafi introduttivi** (testo fisso nel modello).
- **Tabelle indici, R, classificazioni** (da «Proprietà» / «Indicatore di Disponibilità» fino a «Classificazione del rischio sicurezza»): **non** generate dall’app — l’operatore copia-incolla da Excel nel DOCX dopo la generazione.
- **§7.1** «Calcolo del rischio cumulativo…» e tabella cumulativo: **non modificare** (lasciare come nel modello).

### Blocco generato dall’app (gruppo → prodotti §6)

Struttura nel modello attuale: **Tabella 17** = 2 righe titolo/sottotitolo (+ opzionale **riga 3 vuota** come separatore tra un prodotto e il successivo).

**1. Paragrafo «Analisi…»** — sostituire il paragrafo fisso `Analisi sostanze pericolose per: IMPIEGATO VDT` con un blocco ripetuto per gruppo:

```
{{#esiti_gruppi}}
Analisi sostanze pericolose per: {{gruppo_nome}}

{{#esposizioni}}
```

(subito sotto, la **tabella modello** 2+1 righe)

**2. Tabella esposizione (ripete per ogni prodotto del gruppo)**

| Riga | Contenuto cella (tipicamente unita) |
|------|-------------------------------------|
| R1 | `Esposizione alla sostanza: {{sostanza_nome}}` |
| R2 | `Prodotto usato per: ({{impiego_prodotto}})` |
| R3 | *(vuota — separatore tra un prodotto e il successivo)* |

Tag loop (esempio chiusure in R2):

```
{{#esposizioni}}
Esposizione alla sostanza: {{sostanza_nome}}
Prodotto usato per: ({{impiego_prodotto}})
{{/esposizioni}}
{{/esiti_gruppi}}
```

Se usi **tabella** Word invece di paragrafi, apri `{#esposizioni}` in R1 e chiudi `{/esposizioni}` in R2 o R3; il blocco `{#esiti_gruppi}…{/esiti_gruppi}` deve includere **paragrafo Analisi + tabella** ripetuti per ogni gruppo omogeneo selezionato in §3.

**3. Dopo `{/esiti_gruppi}`** lascia nel modello lo spazio/tabella vuota dove incollare i dati Excel per quel gruppo/prodotto.

### Compila

- Nome prodotto = colonna **Sostanza** (§6).
- **Impiego prodotto (§7)** = testo tra parentesi nel sottotitolo Word.

### Array Docxtemplater

```json
"esiti_gruppi": [
  {
    "gruppo_nome": "IMPIEGATO VDT",
    "esposizioni": [
      {
        "sostanza_nome": "BACTISAN SPRAY 2000",
        "impiego_prodotto": "pulizia superfici e strumenti"
      }
    ]
  }
]
```

Solo prodotti con **Sostanza** compilata in §6. Gruppi senza prodotti → solo paragrafo «Analisi…».

## §7.1 — Chiusura classificazione gruppi (fine sezione)

### Paragrafo fisso (nessun tag)

```
Ciò considerato, ai sensi dell'art. 224 comma 2 del D.Lgs. 81/08 si può ritenere che per i seguenti
gruppi omogenei di lavoratori il rischio chimico viene classificato
```

(par. ~544 nel modello)

### Tabella 19 — una riga per gruppo §3

**Riga 1** intestazione (fissa):

| GRUPPO OMOGENEO | RISCHIO PER LA SALUTE | RISCHIO PER LA SICUREZZA |

**Riga 2 modello** — loop sullo stesso array `gruppi_chimici` usato in §3:

| Colonna 1 | Colonna 2 | Colonna 3 |
|-----------|-----------|-----------|
| `{{#gruppi_chimici}}{{nome}}` | `{{rischio_salute}}` | `{{rischio_sicurezza}}{{/gruppi_chimici}}` |

- `{nome}` → profili selezionati in Compila.
- `{rischio_salute}` e `{rischio_sicurezza}` → **sempre vuoti** in generazione; l’operatore compila a mano dopo Excel/valutazione.

Variante (celle separate):

```
{{#gruppi_chimici}}
{{nome}}    {{rischio_salute}}    {{rischio_sicurezza}}
{{/gruppi_chimici}}
```

Subito dopo la tabella: paragrafo **Conclusioni** (fisso, non tag).

## Regole tag

- **Doppia graffa ovunque** (`{{nome}}`, `{{#loop}}`, `{{/loop}}`), come negli altri moduli. Eccezione logo: `{%LOGO}` (una graffa + `%`).
- Tag in un unico run; incollare da Blocco note se Word spezza le graffe.
- In generazione l’app converte automaticamente `{#tag}` → `{{#tag}}` e unisce run spezzati, ma è meglio usare già `{{` nel modello.
