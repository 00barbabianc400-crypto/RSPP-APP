# MOD_INCENDIO — Mappa tag Word

**Modello da caricare:** `MOD_INCENDIO.docx` nel bucket Supabase `moduli`.

**Catalogo:** già presente in `documenti_catalogo` (ordine 110 — Valutazione del rischio incendio).

**Adapter:** `js/generazione/adapters/MOD_INCENDIO/` — scaffold iniziale; sezioni da mappare insieme al modello Word.

---

## Tag previsti (scaffold — allineare al tuo .docx)

### Copertina / intestazione

| Tag | Fonte |
|-----|--------|
| `{%LOGO}` | Logo azienda (un run Word) |
| `{{MODULO_NUMERO}}` | Wizard (2 cifre) |
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Anagrafica / sede scelta in generazione |
| `{{DATA_EMISSIONE}}` | Data generazione |
| `{{LUOGO}}` | Derivato da sede (prima virgola) |

### §1 — Redazione (se presente nel modello)

| Tag | Fonte |
|-----|--------|
| `{{REDATTO_DA}}` | Wizard — default: Team della Studio Rivelli Consulting S.r.l. |

### §2.1 — Descrizione dell’attività e dei luoghi di lavoro

Sostituire i **3 paragrafi** del corpo (sotto heading §2.1) con un tag ciascuno (un solo run Word):

| Tag | Wizard |
|-----|--------|
| `{{TESTO_2_1_P1}}` | Testo paragrafo 1 — default con `{{RAGIONE_SOCIALE}}` |
| `{{TESTO_2_1_P2}}` | Testo paragrafo 2 — solo descrittivo sede/ambienti |
| `{{TESTO_2_1_P3}}` | Testo paragrafo 3 — default con `{{RAGIONE_SOCIALE}}` (oggetto sociale) |

In generazione `{{RAGIONE_SOCIALE}}` nei testi wizard viene sostituito con l’anagrafica prima del render Docxtemplater.

### §2.2 — Valutazione preliminare del rischio di incendio

**Tabella requisiti** (prima riga dati sotto intestazione; l’intestazione resta fissa):

```
{{#RIGHE_REQUISITI_BASSO_RISCHIO}}{{ELEMENTO}}{{MARK_SI}}{{MARK_NO}}{{/RIGHE_REQUISITI_BASSO_RISCHIO}}
```

| Tag | Contenuto |
|-----|-----------|
| `{{ELEMENTO}}` | Testo riga (modificabile in wizard) |
| `{{MARK_SI}}` | `X` se scelta SI, altrimenti vuoto |
| `{{MARK_NO}}` | `X` se scelta NO, altrimenti vuoto |

**Paragrafi sotto la tabella** (un tag per paragrafo):

| Tag | Default |
|-----|---------|
| `{{TESTO_2_2_NOTA_DPR}}` | Attività non ricade in contesto D.P.R. 151/2011 |
| `{{TESTO_2_2_CONCLUSIONE}}` | «Pertanto, i luoghi di lavoro… sono considerati a:» |

I due paragrafi introduttivi prima della tabella (§2.2) possono restare statici nel Word.

### §2.3.1 — Sorgenti di innesco

Titolo heading fisso. Sostituire i 2 paragrafi del corpo:

| Tag |
|-----|
| `{{TESTO_2_3_1_P1}}` |
| `{{TESTO_2_3_1_P2}}` |

### §2.3.2 — Materiali combustibili o infiammabili

Titolo heading fisso. Sostituire i 2 paragrafi del corpo:

| Tag |
|-----|
| `{{TESTO_2_3_2_P1}}` |
| `{{TESTO_2_3_2_P2}}` |

### §2.3.3 — Carico di incendio: CASO 1 (tabellare) vs CASO 2 (CLARAF)

Scelta unica in wizard. Nel Word usare **due blocchi condizionali** (delimitatori inizio/fine):

**CASO 1 — Metodo tabellare**

```
{{#CASO_CARICO_TABELLARE}}
CASO 1 ATTIVITA' VALUTABILE CON METODO TABELLARE
… premessa UNI appendice E / tabella S.2-10 (testo fisso nel modello) …
{{TESTO_CASO1_ASSIMILAZIONE}}
{{/CASO_CARICO_TABELLARE}}
```

| Tag | Wizard |
|-----|--------|
| `{{TESTO_CASO1_ASSIMILAZIONE}}` | Frase assimilazione destinazione d’uso (modificabile) |

**CASO 2 — CLARAF**

```
{{#CASO_CARICO_CLARAF}}
CASO 2 ATTIVITA' VALUTABILE CON CLARAF
{{TESTO_CASO2_INTRO}}
… tabelle / valori CLARAF eventualmente presenti nel modello (restano dentro lo stesso loop) …
{{/CASO_CARICO_CLARAF}}
```

| Tag | Wizard |
|-----|--------|
| `{{TESTO_CASO2_INTRO}}` | Default con `{{RAGIONE_SOCIALE}}` e `{{SEDE_OPERATIVA}}` — sostituiti in generazione |

Wizard: `metodo_carico_incendio` = `tabellare` | `claraf` → valorizza `CASO_CARICO_TABELLARE` / `CASO_CARICO_CLARAF` (booleani Docxtemplater).

### §2.3.4 — Interazione inneschi-combustibili

Titolo heading fisso. Sostituire il paragrafo del corpo con:

| Tag |
|-----|
| `{{TESTO_2_3_4}}` |

Testo modificabile in wizard (default dal modello).

### §2.4 — Descrizione del contesto e dell’ambiente

Titolo heading fisso. Due paragrafi:

| Tag | Note |
|-----|------|
| `{{TESTO_2_4_P1}}` | Contesto edificio + accessibilità; può contenere `{{SEDE_OPERATIVA}}` |
| `{{TESTO_2_4_P2}}` | Locali, vie di esodo, superficie d’aerazione |

### §2.5 — Occupanti esposti / §2.5.1 Tipologia

Paragrafi introduttivi **fissi** nel Word. Per ciascun elenco puntato: sostituire il **primo punto** con il loop e **cancellare** gli altri punti fissi del modello.

**§2.5 — «Gli occupanti esposti al rischio d’incendio sono:»**

```
{{#VOCI_OCCUPANTI_ESPOSTI}}{{TESTO}}{{/VOCI_OCCUPANTI_ESPOSTI}}
```

| Campo loop | Note |
|------------|------|
| `{{TESTO}}` | Testo del punto; stile elenco del paragrafo modello |

**§2.5.1 — «I lavoratori presenti… sono:»**

```
{{#VOCI_TIPOLOGIA_OCCUPANTI}}{{TESTO}}{{/VOCI_TIPOLOGIA_OCCUPANTI}}
```

Wizard: checkbox **In doc**, testo modificabile, + Aggiungi / ✕ Rimuovi, ripristino voci standard.

### §2.9.5 — Attrezzature mobili di estinzione

Titolo heading fisso. Sostituire il paragrafo del corpo con:

| Tag |
|-----|
| `{{TESTO_2_9_5}}` |

Testo modificabile in wizard (default dal modello).

### §3.1 — Misure specifiche per persone con esigenze speciali

Titolo heading fisso. Due paragrafi:

| Tag | Contenuto default |
|-----|-------------------|
| `{{TESTO_3_1_P1}}` | Presenza occasionale occupanti con capacità motorie ridotte; esodo orizzontale verso luogo sicuro |
| `{{TESTO_3_1_P2}}` | Procedure per gestione persone con esigenze speciali |

### §3.2 — Caratteristiche del sistema di esodo

Intro + primi 5 punti elenco **fissi**. Ultimo punto elenco:

| Tag |
|-----|
| `{{TESTO_3_2_ULTIMO_PUNTO}}` |

### §3.3.1 — Affollamento

Intro par. 4.2.2 (densità 0,7) **fisso**. Tabella (prima riga dati):

```
{{#RIGHE_AFFOLLAMENTO_331}}{{EDIFICIO_AREA}}{{SUPERFICIE}}{{NUMERO_PERSONE}}{{/RIGHE_AFFOLLAMENTO_331}}
```

| Tag | Note |
|-----|------|
| `{{TESTO_3_3_1_P2}}` | Paragrafo dopo tabella |
| `{{TESTO_3_3_1_P3}}` | Dichiarazione 25 persone — run **grassetto + sottolineato** nel Word |

### §3.4 — Progettazione sistema di esodo

| Tag |
|-----|
| `{{TESTO_3_4_P1}}` |
| `{{TESTO_3_4_P2}}` |

### §3.4.2 — Larghezza vie di esodo

Intro **fisso**. Ultima frase:

| Tag |
|-----|
| `{{TESTO_3_4_2_CONCLUSIONE}}` |

### §3.5 / §3.6 / §3.7 / §3.8

Primo paragrafo di ciascuna sezione (resto fisso nel modello):

| Sezione | Tag |
|---------|-----|
| 3.5 Controllo incendio | `{{TESTO_3_5_P1}}` |
| 3.6 Rivelazione ed allarme | `{{TESTO_3_6_P1}}` |
| 3.7 Controllo fumi e calore | `{{TESTO_3_7_P1}}` |
| 3.8 Operatività antincendio | `{{TESTO_3_8_P1}}` |

### §4 — Gestione della sicurezza antincendio

Intro, primo elenco (7 punti) e paragrafo «In particolare…» **fissi**. Secondo elenco: ultimi **3** punti (sostituire i punti fissi corrispondenti):

| Tag |
|-----|
| `{{TESTO_4_LISTA2_P1}}` |
| `{{TESTO_4_LISTA2_P2}}` |
| `{{TESTO_4_LISTA2_P3}}` |

### §5 — Conclusioni

Due paragrafi introduttivi **fissi**. Elenco misure (primo punto modello, stile elenco):

```
{{#VOCI_CONCLUSIONI_MISURE}}{{TESTO}}{{/VOCI_CONCLUSIONI_MISURE}}
```

Wizard: checkbox **In doc**, testo modificabile, voci aggiuntive.

---

## Prossimi passi

1. Caricare `MOD_INCENDIO.docx` nel bucket `moduli`.
2. Analizzare il `.docx` (tag, loop, tabelle) e aggiornare questa mappa sezione per sezione.
3. Estendere `adapter.js` e `preview.html` come per MOD_RUMORE.
