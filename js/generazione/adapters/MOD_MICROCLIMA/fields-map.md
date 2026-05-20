# MOD_MICROCLIMA — Fields Map



## Catalogo e file modello



| | |

|--|--|

| Codice DB | `MOD_MICROCLIMA` (`supabase/seed.sql`) |

| Bucket `modelli` | `MOD_MICROCLIMA.docx` |



Inserimento tag nel Word desktop: `scripts/insert_mod_microclima_placeholders.py`  

(copia il file in `*_patched.docx`, backup `.bak-micro`).



## Placeholder documento (copertina / premessa / header)



| Tag | Origine |

|-----|---------|

| `{{MODULO_NUMERO}}` | `documenti_catalogo.ordine` → `buildData` / wizard (2 cifre, es. `70`) |

| `{{RAGIONE_SOCIALE}}` | Anagrafica |

| `{{DATA_EMISSIONE}}` | Data generazione (`DD/MM/YYYY`) |

| `{{SEDE_OPERATIVA}}` | Anagrafica — premessa («sede ubicata in …») |

| `{{PREMESSA_CICLO_LAVORO}}` | Testo intero ultimo paragrafo premessa: default da **macro UNI** (etichetta tabella, es. «Uffici») con formula fissa ufficio/VDT leggero; override opzionale `wizard.descrizione_ciclo_lavoro` |

| `{{LUOGO}}` | Derivato dall’anagrafica (sigla provincia da fine `sede_operativa`; fallback `Roma`) — utile firma/footer se inserito nel Word |



## Intestazioni e piè di pagina (Word)



Nell’header/footer del modello spesso compaiono sequenze **`XXXXXXXXXXXXXXX`** senza tag. Lo script `insert_mod_microclima_placeholders.py` le sostituisce **in alternanza** con `{{RAGIONE_SOCIALE}}` e `{{SEDE_OPERATIVA}}` (stesso ordine delle occorrenze nel file XML). Altri placeholder testuali nel corpo (`VIA XXXXXXXXXXXX`, ecc.) sono gestiti nello stesso script.



Campi interni (non nel template): `_uni_tabella_num`, `_descrizione_ciclo_override`, `_righe_microclima`, `_rilevamenti_microclima`, `_conclusioni_giustificazione`, `_conclusioni_giustificazione_custom`, `_logo_buffer`, `_logo_path`, `LOGO_PREVIEW_URL`.



## § 2.7 Tabella 1 · Risultati rilevazioni microclimatiche



Loop Docxtemplater sulla **prima riga dati** della tabella (come `POSTAZIONI` in illuminamento):



```text

{{#RIGHE_MICROCLIMA}}{{RIGA_N}}{{POSTAZIONE}}{{DATA_RIL}}{{ORA_RIL}}{{VA}}{{TG}}{{TAMB}}{{TRAD}}{{RH}}{{MET}}{{CLO}}{{PMV}}{{PPD}}{{/RIGHE_MICROCLIMA}}

```



| Colonna modulo | Chiave DOCX |

|----------------|-------------|

| N° | `RIGA_N` |

| POSTAZIONE | `POSTAZIONE` |

| DATA | `DATA_RIL` |

| ORA | `ORA_RIL` |

| VA | `VA` |

| TG (°C) | `TG` |

| T (°C) | `TAMB` |

| TR (°C) | `TRAD` |

| RH (U%) | `RH` |

| MET | `MET` |

| CLO | `CLO` |

| PMV | `PMV` |

| PPD | `PPD` |



- Dati compilazione iframe: proprietà **`righe_microclima`** (array di oggetti con chiavi minuscolo `postazione`, `data`, `ora`, `va`, …) oppure suggerimento da Supabase quando `wizardInput.righe_microclima` assente (`buildData`).  

- **`_rilevamenti_microclima`**: solo tipi catalogo **`Microclima — temperatura estiva`**, **`… invernale`**, **`… umidita relativa`**, **`… velocita aria`**. Raggruppamento automatico **zona + stesso giorno** → VA, RH, combinazione temperature in **`TAMB`**.  



> **Nota modello sul Desktop**: se sul file originale esistono ancora celle vuote nella tabella, inserisci manualmente i tag sulla **riga modello** (evitare divisione `{{ }}` fra più `<w:r>`). L’adapter lato browser ripara comunque alcuni placeholder spezzati (`repairDocxTemplateZip`).  



## § 3 Conclusioni (testo dinamico — da `adapter.js` + patch Word)



Dopo `insert_mod_microclima_placeholders.py` il §3 usa tag Docxtemplater (non un unico blocco libero):



| Tag | Origine |

|-----|---------|

| `{{FRASE_VALORI_PMV_CONCLUSIONI}}` | **«pienamente conformi»** se ogni riga tabella §2.7 con dati ha **−0,5 < PMV < +0,5** e **PPD < 10** (numeri parsati dalla tabella; PPD in tabella come intero già in punti percento); altrimenti **«non pienamente conformi»**. |

| `{{#MOSTRA_DISCOSTAMENTI}}` … `{{/MOSTRA_DISCOSTAMENTI}}` | Sezione visibile solo se almeno una riga viola il range ottimale sopra. Contiene `{{INTRO_DISCOSTAMENTI_PAR}}` (fissa) e `{{TESTO_GIUSTIFICAZIONE_CONCLUSIONI}}`. |

| `{{INTRO_DISCOSTAMENTI_PAR}}` | Testo fisso: «Solo per alcuni casi puntuali… lievi discostamenti…». |

| `{{TESTO_GIUSTIFICAZIONE_CONCLUSIONI}}` | Scelta in anteprima: settaggio vs manutenzione (testi predefiniti) oppure **personalizzato** (textarea). |

| `{{PARAGRAFO_IMPIANTO_CONCLUSIONI}}` | Paragrafo «Andando a valutare…»: termina con **solo il punto** dopo «…stanze esaminate.» se la macro UNI è **Uffici** / **attività sedentarie** (etichetta tabella con «uffic» o «sedentar»); altrimenti aggiunge «… alle caratteristiche del ciclo di lavoro ed alle condizioni ambientali.». |



## Placeholder testuali «ampi» ancora auspicabili nel Word



(non coperti dallo script attuale; da aggiungere manualmente se serve)



| Possibile uso | Tag suggerito |

|----------------|---------------|

| Descrizione strumentazione § 2.x | `{{STRUMENTAZIONE_CAP2}}` |

| Annotazioni cliente / osservazioni | `{{NOTE_COMMITENTE}}` |

| Allegati / bibliografia sintetica | `{{REFERENZA_ALLEGATI}}` |



## UNI (solo macro — senza lx)



Stesso catalogo `uni-options.js` del modulo illuminamento: l’utente sceglie la **macrocategoria** (`uni_tabella_num`).  

In microclima si usa solo `UNI_ATTIVITA_MACRO` / costruzione `PREMESSA_CICLO_LAVORO` (nessun `UNI_EM_REQ` ecc. in questa fase).



## Validazione



- Ragione sociale e sede obbligatorie.

- Macrocategoria UNI obbligatoria.

- `PREMESSA_CICLO_LAVORO` non vuoto (generato da UNI o da override).

- Almeno **una riga** della tabella §2.7 con almeno un campo compilato (`postazione` o una misura / indice), per evitare documenti vuoti.


