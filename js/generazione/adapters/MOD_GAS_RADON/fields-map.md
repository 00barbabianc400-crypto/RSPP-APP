# MOD_GAS_RADON — Mappa tag Word

**Modello da caricare:** `MOD_GAS_RADON.docx` nel bucket Supabase `moduli`.

**Catalogo:** già presente in `documenti_catalogo` (ordine 220 — Monitoraggio gas radon).

**Rilevamenti:** tipo catalogo **Gas Radon** (`Bq/m³`, limite 300) → precompilazione tabella misure.

---

## Tag previsti (scaffold — allineare al tuo .docx)

### Copertina / intestazione

| Tag | Fonte |
|-----|--------|
| `{%LOGO}` | Logo azienda (un run Word) |
| `{{MODULO_NUMERO}}` | Wizard (2 cifre, es. 22) |
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Anagrafica / sede scelta in generazione |
| `{{DATA_EMISSIONE}}` | Data generazione |
| `{{LUOGO}}` | Derivato da sede (prima virgola) |

### §1 — Premessa

| Tag | Fonte |
|-----|--------|
| `{{PERIODO_RILEVAMENTO}}` | Wizard — periodo in cui è stato svolto il rilievo (testo libero) |

Frase nel modello:

```
Nel periodo tra {{PERIODO_RILEVAMENTO}} negli ambienti di lavoro della {{RAGIONE_SOCIALE}} con sede in {{SEDE_OPERATIVA}} …
```

Default wizard (modificabile): `gennaio 2018 e dicembre 2019`.

### §7 — Risultati delle rilevazioni

| Tag | Fonte |
|-----|--------|
| `{{LABORATORIO_DOSIMETRIA}}` | Wizard — denominazione laboratorio (testo libero) |

Frase nel modello (testo ENEA rimosso):

```
Le letture dei sensori … sono state effettuate dal {{LABORATORIO_DOSIMETRIA}}
il quale è conforme ai requisiti minimi…
```

Default wizard: `laboratorio di dosimetria della LB SERVIZI S.r.l.`

### Tabella risultati §7 (loop)

Fonte: **Rilevamenti → Gas Radon** (un record sessione, `dettaglio_radon.locali[]`).

Nella **prima riga dati** della tabella nel Word:

```
{{#RIGHE_RADON}}{{LOCALE}} | {{RILEVATORE}} | {{PERIODO_1}} | {{PERIODO_2}} | {{PERIODO_3}} | {{MEDIA_ANNUALE}}{{/RIGHE_RADON}}
```

| Campo loop | Significato |
|------------|-------------|
| `LOCALE` | Locale di misura |
| `RILEVATORE` | Codici rilevatore / dosimetri |
| `PERIODO_1` … `PERIODO_3` | Valori Bq/m³ per periodo |
| `MEDIA_ANNUALE` | Media annuale (calcolata in inserimento o da DB) |

### §8 — Conclusioni

| Tag | Fonte |
|-----|--------|
| `{{PERIODO_RILEVAMENTO}}` | Wizard §1 (stesso valore in intro conclusioni) |
| `{{PIANO_RILEVAMENTO}}` | Rilevamenti Gas Radon (`dettaglio_radon.piano`) — modificabile in wizard |
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Anagrafica / sede scelta in generazione |
| `{{TESTO_CONCLUSIONI_INTRO}}` | Auto (periodo, piano, ragione sociale, sede) — modificabile |
| `{{TESTO_CONCLUSIONI_ESITO}}` | Auto da media annuale tabella (&lt; 300 su tutti i punti = conforme; ≥ 300 = superamento + intervento + misure correttive) — modificabile |
| `{{TESTO_CONCLUSIONI}}` | Opzionale: `INTRO` + `\n\n` + `ESITO` in un solo blocco |
| `{{LUOGO}}` | Anagrafica / derivato da sede |
| `{{DATA_EMISSIONE}}` | Data generazione (inserire nel Word; modificabile in anagrafica se previsto) |

**Intro (inline nel paragrafo §8):**

```
La misura delle concentrazioni di Gas Radon è stata condotta nel periodo {{PERIODO_RILEVAMENTO}} presso il piano {{PIANO_RILEVAMENTO}} della {{RAGIONE_SOCIALE}} con sede in {{SEDE_OPERATIVA}}. L'analisi dei dati ottenuti in termini di concentrazione media annuale di gas Radon (Bq/m³) evidenzia i seguenti risultati:
```

Oppure un solo paragrafo: `{{TESTO_CONCLUSIONI_INTRO}}`

**Corpo esito (dinamico):** `{{TESTO_CONCLUSIONI_ESITO}}`

**Firma (a fine documento):**

```
{{LUOGO}} lì {{DATA_EMISSIONE}}
```

Logica runtime (ultima colonna tabella §7, `MEDIA_ANNUALE`):

- Tutti i punti con media &lt; **300 Bq/m³** → testo conforme (nessuna azione ulteriore; ripetizione ogni 8 anni).
- Almeno un punto ≥ **300 Bq/m³** → testo superamento (locali in eccesso), paragrafo intervento azienda (wizard), blocco misure correttive D.Lgs. 101/20.

### Altri

| Tag | Fonte |
|-----|--------|
| `{{NOTE_WIZARD}}` | Note interne (se inserito nel modello) |
