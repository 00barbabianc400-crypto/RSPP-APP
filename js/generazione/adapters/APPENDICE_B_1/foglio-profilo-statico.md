# Appendice B.1 — Foglio-profilo (per gruppo omogeneo): parti statiche e righe DB

Fonte layout verificata con MCP sul file **`APPENDICE B-1 PROFILI DI RISCHIO 2023.xlsx`**, foglio tipo `IMPIEGATO VIDEOTERMINALISTA` (anagrafiche profilo in `public.profili`, modale Catalogo Profili in `index.html`).

---

## Riga titolo profilo

| Cella | Contenuto |
|-------|-----------|
| **A2** | Testo fisso **`Profilo di Rischio:`** (nell’excel esistente anche accento/normalizzazione: da uniformare alla grafica DVR se serve). |
| **D2** | **Nome del gruppo omogeneo** = `nome_profilo` del profilo associato. |

---

## Sezione inferiore (etichette colonna **A**, valori colonna **C**)

Dopo **la tabella delle fasi di lavoro** (una riga dati per ogni elemento di `fasi_lavoro`), compaiono **quattro righe** con etichette sempre in **colonna A** e testo “di dettaglio” in **colonna C** (nel modello le celle C sono tipicamente unite orizzontalmente con il resto della riga).

Testi esatti delle etichette in **A** (dal modello):

1. **`Misure di Prevenzione e Protezione Generali`**
2. **`Dispositivi di Protezione Individuale in dotazione`**  
   _(nel modale: “DPI Base”)_
3. **`Dispositivi di Protezione Collettivi`**
4. **`Protocollo di sorveglianza sanitaria`**

### Origine dati colonna **C** (automatica da DB)

| Riga etichetta | Campo DB `profili` | Modale (`index.html`) |
|----------------|---------------------|-------------------------|
| Misure … Generali | `misure_gen_generali` | Misure Generali (`MisureGenGenerali`) |
| DPI … in dotazione | `dpi_base` | DPI Base |
| DPI Collettivi | `dpi_collettivi` | DPI Collettivi |
| Protocollo … | `protocollo_sor_san` (boolean) | Protocollo Sorveglianza Sanitaria (Sì/No) |

**Regole testo per il protocollo** (valori “statici” di frase, non liberi):

- `protocollo_sor_san === false` → in **C** del foglio: **`Non previsto`** (come da tua specifica; il modello esempio per il DPI usava talvolta *“Non previsti”* al plurale — tenere coerenza con il redazionale scelto).
- `protocollo_sor_san === true` → **`Si rimanda al protocollo sanitario istituito dal Medico Competente`** (come nel modello MCP).
- `null` / non impostato → da decidere in generazione (es. vuoto, “—”, o trattare come No); oggi il modale ha opzione “— Non impostato —”.

I tre campi testo vanno scritti **così come salvati** (trim); se vuoti → celle vuote o placeholder da definire.

---

## Perché **non** c’è un intervallo di riga fisso (es. sempre 9–12)

Struttura del foglio-profilo:

- **Riga 6**: nomi rischi (A:AO).
- **Riga 7**: recap livelli.
- **Riga 8**: intestazioni tabella fasi (A descrizione, C misure specifiche, D DPI specifici).
- **Righe 9 … (8 + N)**: **N** righe dati fase (`N` = numero fasi da `profilo_fasi`).
- **Prima riga blocco statico** = **`9 + N`** (es. *N = 2* → righe fase 9–10, statico da riga 11).

Blocco statico (4 righe):

- `R0 = 9 + N` → Misure generali  
- `R0 + 1` → DPI in dotazione  
- `R0 + 2` → DPC  
- `R0 + 3` → Protocollo  

Colonne fase: **A** (+ merge A:B) descrizione, **C** misure specifiche, **D** DPI specifici (`misure_specifiche`, `dpi_specifici` da DB).

---

## Note implementative successive

- Duplicazione foglio per ogni profilo: stesso layout, **D2** e **N** da profilo, blocco statico ancorato a **`R0 = 7 + N`**.
- La query `openGeneraDocPreview` per `APPENDICE_B1_PROFILI` deve esporre `misure_gen_generali`, `dpi_base`, `dpi_collettivi` (oltre a `protocollo_sor_san` e `fasi_lavoro` già presenti).
