# MOD_VIBRAZIONI — Mappa tag Word

| Campo | Valore |
|-------|--------|
| Codice DB | `MOD_VIBRAZIONI` |
| Bucket `modelli` | `MOD_VIBRAZIONI.docx` |

Riparazione tag: `python repair_docx_tags.py` (aggiorna `MOD_VIBRAZIONI.docx` in place).

---

## §4 — Mansioni (fonte verità esposizioni)

| Colonna | Tag |
|---------|-----|
| Gruppo | `{{#MANSIONI_GRUPPI}}{{NOME_GRUPPO}}` |
| HAV | `{{CELLA_HAV}}` |
| WBV | `{{CELLA_WBV}}{{/MANSIONI_GRUPPI}}` |

Valori: `X` o `NON ESPOSTO`.

---

## §5 — Catalogo macchine (Sorgenti di esposizione)

**§5.1 HAV:** `{{#MACCHINE_HAV}}{{ID}}` · `{{TIPOLOGIA}}` · `{{MODELLO}}` · `{{AW_SUM}}{{/MACCHINE_HAV}}`

**§5.2 WBV:** `{{#MACCHINE_WBV}}{{ID}}` · `{{TIPOLOGIA}}` · `{{MODELLO}}` · `{{AW_MAX}}{{/MACCHINE_WBV}}`

---

## §7 / §8 — Valutazione A(8) per gruppo (Excel incorporato)

Un blocco per ogni gruppo con **X** in §4 (HAV o WBV). L’Excel **non** si compila da software: Docxtemplater **duplica** il blocco (nome gruppo + stesso foglio modello); i valori in Excel li modifica il RSPP in Word.

### Struttura nel Word (da fare una volta)

1. Un prototipo: tabella 1 colonna + paragrafo con Excel sotto.
2. Tabella:

| Gruppo omogeneo |
|-----------------|
| `{{NOME_GRUPPO}}` |

3. Subito sotto: foglio Excel incorporato (quello attuale).
4. Avvolgi tutto nel loop:

**HAV (§7):**
```
{{#VALUTAZIONI_HAV}}
  [tabella + Excel]
{{/VALUTAZIONI_HAV}}
```

**WBV (§8):**
```
{{#VALUTAZIONI_WBV}}
  [tabella + Excel]
{{/VALUTAZIONI_WBV}}
```

5. Elimina i blocchi duplicati fissi (es. 3 HAV + 2 WBV): ne resta **uno per tipo** dentro il loop.

> Non usare `{{MODELLO}}` qui: è per le macchine in §5. Nelle valutazioni per gruppo usare solo `{{NOME_GRUPPO}}`.

---

## Adapter (dati inviati al template)

| Tag | Origine |
|-----|---------|
| `MANSIONI_GRUPPI` | Tutti i profili azienda + HAV/WBV |
| `VALUTAZIONI_HAV` | Solo gruppi con HAV = X |
| `VALUTAZIONI_WBV` | Solo gruppi con WBV = X |
| `MACCHINE_HAV` / `MACCHINE_WBV` | Wizard §5 |

---

## §9 — Conclusioni

### Paragrafo introduttivo (già presente)

`{{RAGIONE_SOCIALE}}` nel testo sul ciclo produttivo.

### Tabella riepilogo (stessi gruppi del §4)

**Intestazione fissa:**

| *(vuota o etichetta)* | Esposizione a vibrazioni HAV | Esposizione a vibrazioni WBV |
|------------------------|------------------------------|------------------------------|

**Una sola riga dati nel loop:**

| Colonna 1 | Colonna 2 | Colonna 3 |
|-----------|-----------|-----------|
| `{{#CONCLUSIONI_GRUPPI}}{{NOME_GRUPPO}}` | `{{TESTO_CONCLUSIONI_HAV}}` | `{{TESTO_CONCLUSIONI_WBV}}{{/CONCLUSIONI_GRUPPI}}` |

Elimina le righe fisse (Operaio Comune, Specializzato, …): le righe le genera Compila da §4.

**Testi automatici (non serve scriverli nel Word):**

- NON ESPOSTO (da §4)
- Fascia A: «Esposizione inferiore al valore di azione» + a capo «Addetti in Fascia A»
- Fascia B: «Superamento valore di azione» + a capo «Addetti in Fascia B»

### Nota sanitaria Fascia B (condizionale)

Avvolgi **solo** il paragrafo:

```
{{#MOSTRA_NOTA_FASCIA_B}}
Si precisa che gli addetti ricadenti in fascia B sono stati sottoposti ad un idoneo protocollo di sorveglianza sanitaria.
{{/MOSTRA_NOTA_FASCIA_B}}
```

Compare solo se almeno un gruppo ha Fascia A o B = **B** (HAV o WBV) in Compila §9.

---

Cache Compila: `20260522e`
