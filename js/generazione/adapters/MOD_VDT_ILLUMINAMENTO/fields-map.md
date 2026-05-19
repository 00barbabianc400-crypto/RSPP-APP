# MOD_VDT_ILLUMINAMENTO — Fields Map

## 1. Logica di selezione template

```
La sezione 3 MISURA è identica in entrambi i template.
La sezione 2 ILLUMINAMENTO cambia in base al flag VDT.
```

| Condizione | Template da usare | Nome file |
|------------|-------------------|-----------|
| Lavoratori VDT **≥ 20 h/sett.** | Versione VDT | `Modulo Illuminamento VDT 2022.docx` |
| Nessun VDT o VDT **< 20 h/sett.** | Versione NON VDT | `Modulo Illuminamento attività NON VDT 2022.docx` |

La scelta avviene nel wizard di Generazione (checkbox `has_vdt_sistematico`).

---

## 2. Placeholder `{{...}}` inseriti nel DOCX

### 2.1 Campi automatici da DB (tabella `aziende`)

| Placeholder | Campo DB | Note |
|-------------|----------|------|
| `{{RAGIONE_SOCIALE}}` | `aziende.ragione_sociale` | Usato in premessa, corpo, conclusioni, footer |
| `{{SEDE_OPERATIVA}}` | `aziende.sede_operativa` | Indirizzo sede; usato in premessa, conclusioni, footer |
| `{%LOGO}` | Storage `loghi/{azienda_id}.png/jpg` → ArrayBuffer (ImageModule) | Paragrafo dedicato nel footer COMMITTENTE — **non** `{{LOGO}}` testuale |
| `LOGO_PREVIEW_URL` | Signed URL (solo anteprima HTML) | Non va nel template Word |
| `{{LUOGO}}` | `aziende.sede_operativa` (città estratta) o default `"Roma"` | Riga firma: `{{LUOGO}} lì {{DATA_EMISSIONE}}` |

### 2.2 Campi automatici da sistema

| Placeholder | Origine | Note |
|-------------|---------|------|
| `{{MODULO_NUMERO}}` | `documenti_catalogo.ordine` o numero progressivo run | Titolo documento: `MODULO {{MODULO_NUMERO}}` |
| `{{DATA_EMISSIONE}}` | Data generazione run (`new Date()`) | Formato: `DD/MM/YYYY` |

### 2.3 Campi da input wizard (obbligatori)

| Placeholder | Tipo | Descrizione | Default |
|-------------|------|-------------|---------|
| `{{DESCRIZIONE_CICLO_LAVORO}}` | Testo libero | Descrizione dell'attività (es. "attività del tipo "ufficio" che si esplica attraverso l'utilizzo di apparecchiature per l'elaborazione dati (videoterminali)") | Vedi §2.4 dropdown |
| `{{STRUMENTO_LUXMETRO}}` | Testo / config studio | Modello luxmetro usato per la misura | `"Delta Ohm modello HD2302.0 / Testo modello 540"` |
| `{{DESCRIZIONE_LOCALI}}` | Testo libero | Caratteristiche generali degli uffici (dimensioni, finestre, oscuramento, lampade) | Testo boilerplate da config |

### 2.4 Campi da dropdown UNI EN 12464-1:2021 (sezione 3.2.2)

L'utente seleziona l'attività dalla tabella UNI. I seguenti placeholder vengono compilati in automatico dalla riga selezionata.

| Placeholder | Descrizione |
|-------------|-------------|
| `{{UNI_TABELLA_RIF}}` | Numero tabella e riferimento UNI (es. `"Tab.34 - Uffici"`) |
| `{{UNI_ATTIVITA}}` | Descrizione attività (es. `"Scrittura, dattilografia, lettura, elaborazione dati"`) |
| `{{UNI_EM_REQ}}` | Illuminamento mantenuto richiesto in lx (es. `500`) |
| `{{UNI_EM_MOD}}` | Illuminamento mantenuto modificato in lx (es. `1000`) |
| `{{UNI_UO}}` | Uniformità (es. `0,60`) |
| `{{UNI_RA}}` | Resa cromatica (es. `80`) |
| `{{UNI_RUGL}}` | Indice abbagliamento (es. `19`) |

### 2.5 Tabella misure postazioni (sezione 3.5.2 — Table 9 nel DOCX)

Ogni riga della tabella è una **postazione misurata**. I dati provengono da:
- Fonte A: `rilevamenti_ambientali` filtrati per `azienda_id` + tipo illuminamento
- Fonte B: inserimento manuale nel wizard (n righe libere)

Struttura di ogni riga:

| Campo | Fonte | Note |
|-------|-------|------|
| `postazione` | Input wizard | Es. "Ufficio 1 – Postazione A" |
| `n_finestre` | Input wizard | Numero finestre presenti |
| `oscuramento` | Input wizard | Sì/No, tipo (tende, veneziane…) |
| `lux_piano_lavoro` | `rilevamenti_ambientali.valore_misurato` o input | Misurato sul piano di lavoro |
| `lux_centro_ambiente` | `rilevamenti_ambientali.valore_misurato` o input | Misurato al centro ambiente |
| `annotazioni` | Input wizard | Note di non conformità |

---

## 3. Differenze testo VDT vs NON VDT

### 3.1 Titolo sezione 2

| Posizione | VDT | NON VDT |
|-----------|-----|---------|
| Heading cap. 2 | `ILLUMINAMENTO E VIDEOTERMINALI` | `ILLUMINAMENTO` |
| Titolo modulo (pag. 1) | `Analisi delle postazioni munite di videoterminale e dei livelli di illuminamento` | identico |

### 3.2 Sezione 1 PREMESSA

| VDT | NON VDT |
|-----|---------|
| `"…indagini sull'ergonomia delle postazioni **al videoterminale** e sui livelli…"` | `"…indagini sull'ergonomia delle postazioni di lavoro (**comprensive anche di videoterminali**) e sui livelli…"` |
| Nessuna nota su assenza VDT | **Aggiunge** al termine: *"Dall'analisi del ciclo produttivo della società {{RAGIONE_SOCIALE}} si è rilevata l'assenza di gruppi omogenei di lavoratori classificabili come videoterminalisti, in quanto se pur presenti sistemi informatici nella struttura, essi vengono utilizzati in modo sistematico o abituale per **meno di 20 ore/settimana**."* |

### 3.3 Sezione 2.1 Introduzione

| VDT | NON VDT |
|-----|---------|
| Testo su definizione videoterminalista D.Lgs. 81/08, 20h/sett, visite mediche biennali | Sostituito con testo su obblighi generali illuminamento D.Lgs. 81/08 (Allegato IV), senza riferimento VDT |

### 3.4 Sezione 2.3 Principi ergonomici VDT

| VDT | NON VDT |
|-----|---------|
| Sezione presente normalmente | **Aggiunge** paragrafo introduttivo: *"Dall'analisi del ciclo produttivo... assenza di videoterminalisti... meno di 20 ore/settimana. Tuttavia, al fine di rendere la postazione di lavoro ergonomicamente idonea, si farà riferimento a quanto di seguito riportato…"* |

### 3.5 Sezione 2.4

| VDT | NON VDT |
|-----|---------|
| `"Igiene del lavoro **al videoterminale**"` | `"Igiene del lavoro"` |
| Nessuna nota finale | **Aggiunge** al termine: *"Si ricorda come dall'analisi del ciclo produttivo della società {{RAGIONE_SOCIALE}} si è rilevata l'assenza di gruppi omogenei di lavoratori…"* |

### 3.6 Sezione 3.5.2

| VDT | NON VDT |
|-----|---------|
| `"Risultati delle misure per le postazioni **videoterminali**"` | `"Risultati delle misure per le postazioni **DI LAVORO**"` |

### 3.7 Tabella non conformità (sez. 3.5.2 — lista bullets)

| VDT (aggiunge) | NON VDT |
|----------------|---------|
| `"rapporti tra i livelli di illuminamento non ottimali (lux tastiera/lux ambiente<);"` | `"rapporti tra i livelli di illuminamento non ottimali;"` |
| `"presenza di riflessi **sullo schermo**;"` | `"presenza di riflessi **sullo schermo/postazione**;"` |

### 3.8 Sezione 4 CONCLUSIONI

| VDT | NON VDT |
|-----|---------|
| `"Dall'analisi condotta sulle **postazioni al VDT** della sede di {{SEDE_OPERATIVA}} della {{RAGIONE_SOCIALE}} è emerso che…"` | `"Dall'analisi condotta sulle **postazioni di lavoro** della sede di {{SEDE_OPERATIVA}} della {{RAGIONE_SOCIALE}}., si può quindi affermare che…"` |
| Paragrafo su computer portatili, monitor, RSPP | Idem ma **aggiunge** parentesi: `"(si ricorda l'assenza di gruppi omogenei di lavoratori classificabili come videoterminalisti)"` |
| `"…riportate nel Registro di manutenzione…"` | `"…Responsabile per la postazione…**i posti di lavoro**"` (no riferimento VDT) |

### 3.9 Strumento di misura (sez. 3.4)

| VDT | NON VDT |
|-----|---------|
| `"lampade al neon **/ LED** e lampade da tavolo"` | `"lampade al neon e lampade da tavolo"` (senza `/ LED`) |

---

## 4. Dropdown UNI EN 12464-1:2021 — Selezione attività

Catalogo completo in **`uni-options.js`** (331 voci, tabelle 9–61).

- Sorgente: `js/generazione/docx/MOD_VDT_ILLUMINAMENTO/UNI_EN_12464-1_2021_Tabelle_9-61_IT.txt`
- Rigenerare dopo modifiche al TXT: `python scripts/parse_uni_tables.py`

Il dropdown in anteprima è raggruppato per tabella (`optgroup`: Tab. 9, Tab. 10, … Tab. 61).

**Tabella più usata per uffici/VDT:** Tab. 34 — Uffici (rif. `34.2` = scrittura/elaborazione dati, 500/1000 lx).

Il generatore usa il `rif` come chiave per auto-compilare `{{UNI_EM_REQ}}`, `{{UNI_EM_MOD}}`, `{{UNI_UO}}`, `{{UNI_RA}}`, `{{UNI_RUGL}}`.

---

## 5. Mappa completa posizioni nel documento (VDT template)

| Placeholder | Paragrafo DOCX | Contesto |
|-------------|----------------|---------|
| `{{MODULO_NUMERO}}` | p.1 | `"MODULO {{MODULO_NUMERO}}"` |
| `{%LOGO}` | Table footer (riga COMMITTENTE) | Immagine logo (paragrafo a sé) |
| `{{RAGIONE_SOCIALE}}` | Table footer col 1 | Nome azienda breve |
| `{{SEDE_OPERATIVA}}` | Table footer col 1 | Via e città |
| `{{RAGIONE_SOCIALE}}` | p.49 PREMESSA | `"La {{RAGIONE_SOCIALE}} nell'ambito…"` |
| `{{SEDE_OPERATIVA}}` | p.49 PREMESSA | `"…presso la propria sede di {{SEDE_OPERATIVA}}."` |
| `{{DESCRIZIONE_CICLO_LAVORO}}` | sez. 3.2.2 | `"Il ciclo di lavoro comprende {{DESCRIZIONE_CICLO_LAVORO}}."` |
| `{{UNI_TABELLA_RIF}}` + `{{UNI_ATTIVITA}}` + `{{UNI_EM_REQ}}` + `{{UNI_EM_MOD}}` | sez. 3.2.2 (tabella UNI) | Riga selezionata da dropdown |
| `{{STRUMENTO_LUXMETRO}}` | sez. 3.4 | `"si è fatto uso del luxmetro analogico della {{STRUMENTO_LUXMETRO}}"` |
| `{{DESCRIZIONE_LOCALI}}` | sez. 3.5.1 | Testo caratteristiche generali locali |
| `{{RAGIONE_SOCIALE}}` | p.342 CONCLUSIONI | `"della {{RAGIONE_SOCIALE}} è emerso…"` |
| `{{SEDE_OPERATIVA}}` | p.342 CONCLUSIONI | `"della sede di {{SEDE_OPERATIVA}}"` |
| `{{LUOGO}}` | p.354 riga firma | `"{{LUOGO}} lì {{DATA_EMISSIONE}}"` |
| `{{DATA_EMISSIONE}}` | p.354 riga firma | data generazione |
| Tabella postazioni (9 righe) | sez. 3.5.2 Table 9 | fill a runtime per ogni postazione |

---

## 6. Configurazione fissa Studio Rivelli (non varia per azienda)

I seguenti valori sono di default Studio Rivelli e possono essere hardcoded o messi in config:

| Campo | Valore default |
|-------|---------------|
| Strumento luxmetro | `Delta Ohm modello HD2302.0 / Testo modello 540` |
| Luogo emissione | `Roma` |
| Tipo lampada (tabella) | `FL tubolare / LED` |

---

## 7. Schema dati per il wizard di generazione

```javascript
// Input atteso dalla sezione Generazione → openGeneraDocModal
{
  // Auto da DB
  azienda: {
    ragione_sociale: String,
    sede_operativa: String,
    logo_url: String,  // signed URL storage loghi
  },

  // Scelto dall'utente nel wizard
  has_vdt_sistematico: Boolean,     // → scelta template
  uni_rif: String,                  // es. "34.2"
  uni_attivita: String,             // es. "Scrittura, dattilografia..."
  uni_em_req: Number,               // 500
  uni_em_mod: Number,               // 1000
  uni_uo: String,                   // "0,60"
  uni_ra: Number,                   // 80
  uni_rugl: Number,                 // 19
  descrizione_ciclo_lavoro: String, // testo per paragrafo ciclo lavoro

  // Configurazione studio (da config o input)
  strumento_luxmetro: String,       // default "Delta Ohm..."
  descrizione_locali: String,       // testo libero caratteristiche locali

  // Tabella misure postazioni
  postazioni: [
    {
      nome: String,           // "Ufficio 1 – Post. A"
      n_finestre: Number,
      oscuramento: String,    // "Sì – tende verticali"
      lux_piano: Number,
      lux_ambiente: Number,
      annotazioni: String,    // "" se conforme
    }
  ],

  // Auto da sistema
  modulo_numero: String,    // da documenti_catalogo.ordine
  data_emissione: String,   // "19/05/2026"
  luogo: String,            // "Roma"
}
```
