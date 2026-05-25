# VADEMECUM_ANTIRAPINA — Mappa tag Word

Template bucket: `modelli/VADEMECUM_ANTIRAPINA.docx`

## Intestazione / piè di pagina

| Tag | Dove | Fonte |
|-----|------|--------|
| `{%LOGO}` | Header | Logo azienda (graffe `%`, non `{{`) |
| `{{SEDE_OPERATIVA}}` | Header | Sede scelta in generazione |
| `{{DATA_REVISIONE}}` | Footer (opzionale) | Wizard — default data odierna |

---

## Titolo e intro

| Tag | Paragrafo |
|-----|-----------|
| `{{TITOLO}}` | COMPORTAMENTI CONSIGLIATI IN CASO DI FURTO O RAPINA |
| `{{TESTO_INTRO}}` | Unico paragrafo introduttivo (rischi bassi, incolumità) |

**Fisso nel Word:**

- *«A tale scopo, è importante attenersi alle seguenti raccomandazioni:»*

---

## Elenco durante la rapina (7 voci)

Sul **primo** punto elenco, cancellare gli altri 6 punti fissi del modello:

```
{{#VOCI_DURANTE_RAPINA}}{{TESTO}}{{/VOCI_DURANTE_RAPINA}}
```

Include calma, ordini rapinatori, telefono, ostaggio, fuga, scenario furto prima dell’apertura.

---

## Sezione «Cosa fare dopo la rapina»

**Fisso nel Word** (paragrafo normale o titolo elenco, senza tag):

- *«Cosa fare dopo la rapina»*

Poi sul **primo** punto del secondo blocco, cancellare gli altri 3 punti fissi:

```
{{#VOCI_DOPO_RAPINA}}{{TESTO}}{{/VOCI_DOPO_RAPINA}}
```

---

## Differenze rispetto a VADEMECUM_AGGRESSIONI

| | Antirapina | Aggressioni |
|---|------------|-------------|
| Sottotitolo destinatario | No | Sì |
| Intro | 1 paragrafo `{{TESTO_INTRO}}` | 2 paragrafi |
| Ponte tra elenchi | *Cosa fare dopo la rapina* | *Successivamente:* |
| Loop 1 | `VOCI_DURANTE_RAPINA` (7) | `VOCI_RACCOMANDAZIONI` (5) |
| Loop 2 | `VOCI_DOPO_RAPINA` (4) | `VOCI_DOPO_EVENTO` (4) |
