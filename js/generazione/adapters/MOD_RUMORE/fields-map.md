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

## §10 — Tabella rilevazioni rumore (postazioni)

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

## §8+ (da guidare)

Indice modello: Strumentazione (9), Esposizione per gruppo (11), Misure tutela (12)…

Placeholder: `*inizio campo da costruire multiplo per gruppo omogeneo*` (§11).

---

## Rilevamenti (futuro)

Tipi catalogo: `Rumore — LEX,8h` (80 dB(A)), `Rumore — picco Ppeak` (112 Pa).
