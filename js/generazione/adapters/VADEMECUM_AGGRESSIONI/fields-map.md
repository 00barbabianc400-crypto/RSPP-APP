# VADEMECUM_AGGRESSIONI — Mappa tag Word

Template bucket: `modelli/VADEMECUM_AGGRESSIONI.docx`

## Intestazione / piè di pagina

| Tag | Dove | Fonte |
|-----|------|--------|
| `{%LOGO}` | Header (o corpo) — **graffe singole** `%` | Logo azienda (post-render) |
| `{{SEDE_OPERATIVA}}` | Header | Sede scelta in generazione (es. `Sede di {{SEDE_OPERATIVA}}`) |
| `{{DATA_REVISIONE}}` | Footer | Wizard (default: data odierna) |

`{{RAGIONE_SOCIALE}}` opzionale se serve in header/footer.

---

## Titolo

| Tag | Paragrafo modello |
|-----|-------------------|
| `{{TITOLO}}` | Riga 1 — maiuscolo |
| `{{SOTTOTITOLO_DESTINATARIO}}` | Riga 2 — es. *DA PARTE DI PERSONALE TERZO* |

---

## Introduzione

| Tag | Contenuto |
|-----|-----------|
| `{{TESTO_INTRO_P1}}` | Contesto aggressioni / priorità sicurezza |
| `{{TESTO_INTRO_P2}}` | Scopo della procedura |

**Fissi nel Word** (non taggare):

- *«A tale scopo, è importante attenersi alle seguenti raccomandazioni:»*
- *«Successivamente:»*

---

## Elenco raccomandazioni (primo bullet)

Sul **primo** punto elenco (stile `Paragrafoelenco`), cancellare gli altri punti fissi:

```
{{#VOCI_RACCOMANDAZIONI}}{{TESTO}}{{/VOCI_RACCOMANDAZIONI}}
```

---

## Elenco «Successivamente» (secondo bullet)

Sul **primo** punto dopo *Successivamente:*, cancellare gli altri punti fissi:

```
{{#VOCI_DOPO_EVENTO}}{{TESTO}}{{/VOCI_DOPO_EVENTO}}
```

> Stesso schema del modulo rumore/incendio: `#`, `TESTO` e `/` nello **stesso paragrafo** del pallino.

---

## Checklist inserimento Word

1. Header: `{%LOGO}` + `{{SEDE_OPERATIVA}}`
2. Footer: `Rev. del {{DATA_REVISIONE}}` (o solo `{{DATA_REVISIONE}}`)
3. Titolo + sottotitolo
4. Due paragrafi intro
5. Loop raccomandazioni (5 voci default in wizard)
6. Loop dopo evento (4 voci default)
7. Caricare `VADEMECUM_AGGRESSIONI.docx` nel bucket `modelli`
