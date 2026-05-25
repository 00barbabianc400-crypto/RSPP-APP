# MOD_RUMORE — Mappa tag Word (§1–§6)

| Campo | Valore |
|-------|--------|
| Codice DB | `MOD_RUMORE` |
| Bucket `modelli` | `MOD_RUMORE.docx` (copia di `Modulo XXXXXXXX- rischio rumore.docx`) |
| Ordine catalogo | 120 |

Analisi modello: MCP Word + estrazione tag da `word/document.xml`.

---

## Copertina (tabella committente / emissione)

| Tag | Fonte |
|-----|--------|
| `{%LOGO}` | Logo azienda (un run Word) |
| `{{MODULO_NUMERO}}` | Wizard / ordine catalogo (2 cifre) |
| `{{RAGIONE_SOCIALE}}` | Anagrafica + sede scelta in generazione |
| `{{SEDE_OPERATIVA}}` | Idem |
| `{{DATA_EMISSIONE}}` | Data generazione documento |

---

## §1 — Premessa

| Tag | Fonte |
|-----|--------|
| `{{RAGIONE_SOCIALE}}` | Già nel testo premessa |
| `{{SEDE_OPERATIVA}}` | Già nel testo premessa |
| `{{REDATTO_DA}}` | Wizard — sostituire la frase «Team della Studio Rivelli Consulting S.r.l.» |

Default wizard: `Team della Studio Rivelli Consulting S.r.l.`

---

## §2 — Dati anagrafici della Società

Nel file attuale la §2 compare **solo in indice**; inserire nel corpo del Word i tag sotto (adapter già li valorizza da `aziende`):

| Tag | Colonna DB |
|-----|------------|
| `{{PARTITA_IVA}}` | `partita_iva` |
| `{{CODICE_FISCALE}}` | `codice_fiscale` |
| `{{SEDE_LEGALE}}` | `sede_legale` |
| `{{OGGETTO_SOCIALE}}` | `oggetto_sociale` |
| `{{ISCRIZIONE_CCIAA}}` | `iscrizione_cciaa` |
| `{{CODICE_ATECO}}` | `codice_ateco` |
| `{{MACROSETTORE_RISCHIO}}` | `macrosettore_rischio` |
| `{{DATORE_LAVORO}}` | `datore_lavoro` |
| `{{DATA_NOMINA_DDL}}` | `data_nomina_ddl` (formato it-IT) |
| `{{RSPP}}` | `rspp` |
| `{{DATA_NOMINA_RSPP}}` | `data_nomina_rspp` |
| `{{MEDICO_COMPETENTE}}` | `medico_competente` |
| `{{RLS}}` | `rls` |
| `{{NUM_DIPENDENTI}}` | `num_dipendenti` |
| `{{DESCRIZIONE_SITO}}` | `descrizione_sito` |

---

## §3 — Definizione e campo di applicazione

Testo **statico** nel modello (nessun tag). Sottosezioni 3.1–3.4 normative.

---

## §4 — Analisi preliminare

| Tag | Fonte |
|-----|--------|
| `{{TESTO_ANALISI_PRELIMINARE}}` | Wizard — paragrafo dopo schema obblighi (default da testo modello) |

---

## §5 — Metodo adottato

Testo statico + eventuale tabella/immagine nel modello.

---

## §6 — Modalità di misura (6.1–6.5)

Testo statico nel modello (Taratura, Misurazioni, Tempo, Criteri, Errori).

---

## §7 — Descrizione dell’attività della Società

| Tag | Fonte |
|-----|--------|
| `{{RAGIONE_SOCIALE}}` | Anagrafica (già nel paragrafo §7) |

Testo fisso: rimando al DVR principale.

---

## §7.1 — Gruppi omogenei individuati

Sostituire `*Lista gruppi omogenei*` nella **cella blu** (tabella) con:

| Tag | Fonte |
|-----|--------|
| `{{LISTA_GRUPPI_OMOGENEI}}` | Wizard: profili azienda selezionati, **una riga per nome** (`\n` → a capo Word, cella centrata nel modello) |

Default wizard: tutti i profili associati all’azienda **selezionati**.

Array opzionale per loop futuri: `{{#GRUPPI_OMOGENEI}}{{NOME_GRUPPO}}{{/GRUPPI_OMOGENEI}}`

---

## §10 — Esposizione al rumore per gruppo omogeneo

### §10.1 — Valutazione giornaliera LEX,8h

Fonte: **stessi gruppi selezionati in §7.1** (wizard generazione).

Sostituire `*Una riga per ogni gruppo omogeneo*` nella prima riga dati:

```
{{#VALUTAZIONE_LEX_GRUPPI}}{{NUMERO}}{{GRUPPO_OMOGENO}}{{NOTE_GRUPPO}}{{/VALUTAZIONE_LEX_GRUPPI}}
```

| Tag loop | Colonna modello |
|----------|-----------------|
| `{{NUMERO}}` | N° (1, 2, 3…) |
| `{{GRUPPO_OMOGENO}}` | Gruppo omogeneo |
| `{{NOTE_GRUPPO}}` | Note (wizard, opzionale per riga) |

---

### §10.2 — Valutazione del rischio rumore per profili di rischio

Fonte: **stessi gruppi selezionati in §7.1**.

Per **ogni** gruppo, nel Word ripeti questo blocco (in ordine):

1. **Cella blu** — nome gruppo  
2. **Paragrafo** — testo tempi medi  
3. **Spazio** — una riga vuota  

Sostituire l’asterisco / blocco modello con un loop che contiene **tutto** il blocco (non mettere il paragrafo fisso dopo il loop).

```
{{#VALUTAZIONE_RUMORE_PROFILI}}{{GRUPPO_OMOGENO_CELLA}}{{PARAGRAFO_TEMPI_MEDI}}{{SPAZIO_RIGA}}{{/VALUTAZIONE_RUMORE_PROFILI}}
```

**Struttura consigliata nel .docx** (tra `{#` e `{/}`):

| Elemento | Tag / contenuto |
|----------|-----------------|
| Riga tabella (cella blu) | `{{GRUPPO_OMOGENO_CELLA}}` |
| Paragrafo normale sotto | `{{PARAGRAFO_TEMPI_MEDI}}` |
| Paragrafo vuoto (una riga) | paragrafo vuoto + opz. `{{SPAZIO_RIGA}}` |

| Tag | Contenuto |
|-----|-----------|
| `{{GRUPPO_OMOGENO_CELLA}}` | Nome gruppo omogeneo |
| `{{PARAGRAFO_TEMPI_MEDI}}` | Testo default sotto (modificabile in Compila) |
| `{{SPAZIO_RIGA}}` | A capo / riga vuota prima del gruppo successivo |

Default `PARAGRAFO_TEMPI_MEDI`: «Nella tabella seguente sono riportati i tempi medi di esposizione giornaliera del gruppo omogeneo considerato per tutte le fonti di rumore censite nell’ambito del ciclo di lavoro svolto.»

---

## Tabella postazioni di misura (rilevamenti)

Fonte: **Rilevamenti → Rumore** (sessione tabellare, `dettaglio_rumore.postazioni[]`).

Nella **prima riga dati** del Word (sotto intestazione), inserire il loop:

```
{{#MISURE_RUMORE}}{{POSTAZIONE}}{{PEAK_DB_C}}{{LEQ_DB_A}}{{NOTE_POSTAZIONE}}{{/MISURE_RUMORE}}
```

| Tag loop | Colonna modello | DB / modale |
|----------|-----------------|-------------|
| `{{POSTAZIONE}}` | Postazione di misura | `postazione` |
| `{{PEAK_DB_C}}` | Peak in dB(C) | `peak_db_c` (formato it-IT, 1 decimale) |
| `{{LEQ_DB_A}}` | Leq in dB(A) | `leq_db_a` |
| `{{NOTE_POSTAZIONE}}` | Note ed eventuali | `note` (per riga) |

Esempio riga: `Autocarro Opel MOVANO` · `105,0` · `79,0` · (vuoto).

---

## §13 — Osservazioni e raccomandazioni

### Paragrafo iniziale (sorveglianza sanitaria)

`{{RAGIONE_SOCIALE}}` — già nel testo.

Sostituire `(**Campo di testo necessario per i gruppi omogenei da mettere**)` con:

```
{{GRUPPI_SORVEGLIANZA_SANITARIA}}
```

Default wizard: elenco gruppi selezionati in §7.1 (es. `Gruppo A, Gruppo B e Gruppo C`). Modificabile in Compila.

Il resto del paragrafo («Il Medico Competente…») resta **fisso** nel modello.

### Elenco misure «o …»

Sostituire **tutti** i punti dell’elenco con **un solo paragrafo modello** nel loop (il «o» + tab restano nel Word prima del tag):

```
{{#MISURE_PREVENZIONE_RUMORE}}{{TESTO_MISURA}}{{/MISURE_PREVENZIONE_RUMORE}}
```

(Paragrafo modello con stile elenco «o» — non anteporre «o» al tag.)

| Tag | Contenuto |
|-----|-----------|
| `{{#MISURE_PREVENZIONE_RUMORE}}` | Apre loop (prima del primo «o») |
| `{{TESTO_MISURA}}` | Testo del punto (solo quelli selezionati in wizard) |
| `{{/MISURE_PREVENZIONE_RUMORE}}` | Chiude loop (dopo l’ultimo paragrafo modello) |

In Compila: 11 punti con checkbox; quelli deselezionati **non** compaiono nel Word (i restanti «scalano»).

Intestazione fissa prima dell’elenco (nel modello):

«Sono attuate le seguenti Misure di Prevenzione e Protezione in relazione al rischio rumore:»

---

## §8+ (da guidare)

Indice modello: Strumentazione (9), Esposizione per gruppo (11), Misure tutela (12)…

Placeholder: `*inizio campo da costruire multiplo per gruppo omogeneo*` (§11).

---

## Rilevamenti (futuro)

Tipi catalogo: `Rumore — LEX,8h` (80 dB(A)), `Rumore — picco Ppeak` (112 Pa).
