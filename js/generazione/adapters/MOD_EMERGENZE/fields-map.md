# MOD_EMERGENZE — Mappa tag Word

| Campo | Valore |
|-------|--------|
| Codice DB | `MOD_EMERGENZE` (`supabase/seed.sql`, ordine 100) |
| Titolo | Piano di gestione delle emergenze |
| Bucket `modelli` | `MOD_EMERGENZE.docx` |

> **Stato:** cartella adapter creata — mappa tag da completare sul modello Word.

## Copertina (previsto)

| Tag | Fonte |
|-----|--------|
| `{%LOGO}` | Logo azienda |
| `{{MODULO_NUMERO}}` | Wizard |
| `{{RAGIONE_SOCIALE}}` | Anagrafica |
| `{{SEDE_OPERATIVA}}` | Anagrafica |
| `{{DATA_EMISSIONE}}` | Generazione |
| `{{LUOGO}}` | Derivato da sede |

## PREMESSA — Piano coordinato multi-organizzazione

Switch in compilazione: **«C'è un piano delle emergenze coordinato fra più organizzazioni?»**

Se **No**, i due paragrafi sotto restano vuoti nel Word generato.

| Tag | Paragrafo Word (modello std. ~88–89) | Contenuto se Sì |
|-----|--------------------------------------|-----------------|
| `{{PARAGRAFO_PREMESSA_COORD_INOLTRE}}` | Sostituisce il testo che inizia con «Inoltre, per attività facenti capo…» | Frase su D.M. 02/09/2021 e esercitazioni antincendio |
| `{{PARAGRAFO_PREMESSA_COORD_RIMANDO}}` | Sostituisce il testo «Per maggiori dettagli si rimanda al Piano…» | Frase di rimando al piano coordinato |

> Incolla ogni tag **al posto dell’intero testo** del paragrafo corrispondente, in un solo run (es. da Blocco note), delimitatori `{{` `}}`.

## §1.2 — Definizioni (segnalazione / evacuazione)

### Segnalazione di emergenza (par. ~121)

Sostituire **solo** la dicitura del destinatario (`Posto di chiamata` / `Responsabile delle emergenze`) lasciando il resto del paragrafo invariato:

```
… dato al {{TESTO_RUOLO_SEGNALAZIONE}} da chiunque riscontri …
```

| Scelta compilazione | Valore inserito |
|---------------------|-----------------|
| Posto di chiamata | `Posto di chiamata` |
| Responsabile delle emergenze | `Responsabile delle emergenze` |
| Nessuno | *(vuoto)* |

Elenco puntato sotto («Il messaggio di allarme deve contenere…») resta **fisso** nel modello.

### Evacuazione intero sito (par. ~130)

Sostituire la parte opzionale prima di «tramite comunicazione verbale…»:

```
… ordinata attraverso {{TESTO_ALLARME_GENERALE_OR}}tramite comunicazione verbale …
```

| Allarme generale presente | Valore |
|---------------------------|--------|
| Sì | `l'allarme generale o ` (con spazio finale) |
| No | *(vuoto)* |

> Stesso flag `allarme_generale` nel wizard — riusabile più avanti nel documento con lo stesso tag `{{TESTO_ALLARME_GENERALE_OR}}`.

## §2.1 — Caratteristiche dei luoghi (par. ~174)

Sostituire **solo** `ad ufficio` (dopo «immobile adibito»):

```
Gli ambienti di lavoro sono all'interno di un immobile adibito {{IMMOBILE_ADIBITO_A}}.
```

| Compilazione | Valore (default se vuoto: `ad ufficio`) |
|--------------|----------------------------------------|
| Campo testo libero | es. `ad ufficio`, `a magazzino`, `a laboratorio` |

Wizard: `immobile_adibito_a`

### Tabella «Edificio / Attività individuata / Numero di persone» (Tabella 1 nel modello std.)

**Intestazione (riga 0)** — lasciare fissa:

| Edificio | Attività individuata | Numero di persone |
|----------|----------------------|-------------------|

**Riga modello dati (solo la prima riga dati sotto l’intestazione)** — cancellare le altre 7 righe dati del modello dopo aver taggato:

| Colonna 1 | Colonna 2 | Colonna 3 |
|-----------|-----------|-----------|
| `{#righe_piano_luoghi}{edificio}` | `{attivita}` | `{numero_persone}{/righe_piano_luoghi}` |

- `attivita`: più righe nel Word con **Invio** nella cella (in compilazione: textarea; nel DOCX le righe diventano a capo).
- `numero_persone`: testo libero (default compilazione `x`; sostituire con numero stimato se serve).
- Loop: `righe_piano_luoghi[]` con `{ edificio, attivita, numero_persone }`.

### Affollamento massimo — fine §2.1 (par. ~176–178)

Nel modello standard esistono:
- Par 176: primo testo (densità)
- Par 177: «oppure» *(eliminare dal template, non serve)*
- Par 178: secondo testo (dichiarazione datore di lavoro)

Sostituire par 176 con `{{PARAGRAFO_AFFOLLAMENTO_1}}` e par 178 con `{{PARAGRAFO_AFFOLLAMENTO_2}}`. Eliminare par 177 («oppure»).

#### Logica di pre-popolazione (wizard → testo)

| Rischio basso | Modalità | `{{PARAGRAFO_AFFOLLAMENTO_1}}` | `{{PARAGRAFO_AFFOLLAMENTO_2}}` |
|---|---|---|---|
| **Sì** | — | Testo standard D.M. 03/09/2021 con densità 0,7 persone/m² | Dichiarazione datore di lavoro standard |
| **No** | Densità | Come sopra ma senza riferimento D.M., densità configurabile da tabella o input libero | Dichiarazione datore di lavoro standard |
| **No** | Conteggio diretto | «…il numero massimo di persone ammesse nei locali è pari a N persone.» | Dichiarazione semplificata |

Densità selezionabili (tabella D.M.): 2,0 / 1,2 / 0,7 / 0,4 / 0,2 / 0,1 / 0,05 persone/m²

> **In tutti i casi** i testi pre-popolati sono modificabili dall'operatore tramite textarea. Il testo della textarea è quello che va nel Word.

Wizard: `rischio_incendio_basso`, `affollamento_modalita` (`'densita'`|`'conteggio'`), `densita_affollamento`, `numero_affollamento`, `paragrafo_affollamento_1` (override), `paragrafo_affollamento_2` (override).

## §2.2 — Rilevazione e diffusione dell’allarme antincendio (par. ~187–193)

Eliminare il paragrafo **«oppure»** (par. ~189). Sostituire **l’intero testo** di ogni paragrafo del blocco scelto; l’altro blocco resta vuoto nel Word generato.

### Blocco A — senza impianto (par. ~187–188)

| Paragrafo | Tag |
|-----------|-----|
| 1 | `{{PARAGRAFO_ALLARME_SENZA_1}}` |
| 2 | `{{PARAGRAFO_ALLARME_SENZA_2}}` |

### Blocco B — con impianto (par. ~190–193)

| Paragrafo | Tag |
|-----------|-----|
| 1 | `{{PARAGRAFO_ALLARME_CON_1}}` |
| 2 | `{{PARAGRAFO_ALLARME_CON_2}}` |
| 3 | `{{PARAGRAFO_ALLARME_CON_3}}` |
| 4 | `{{PARAGRAFO_ALLARME_CON_4}}` |

In compilazione: radio **senza** / **con** + textarea del blocco attivo (più paragrafi separati da riga vuota, modificabili).

Wizard: `rilevazione_allarme` (`senza`|`con`), `testo_blocco_allarme_senza`, `testo_blocco_allarme_con`.

## §2.3 — Lavoratori esposti a rischi particolari (par. ~196–198 + Tabella 2)

Eliminare il paragrafo **«Oppure»** (par. ~197).

### Opzione A — nessun rischio particolare (par. ~196)

Sostituire tutto il paragrafo con:

```
{{PARAGRAFO_RISCHI_PARTICOLARI_NESSUNO}}
```

### Opzione B — tabella (par. ~198 + Tabella 2)

**Intro** (par. ~198):

```
{{PARAGRAFO_RISCHI_PARTICOLARI_INTRO}}
```

**Tabella 2** — intestazione fissa; **una sola riga dati** modello (cancellare le altre 5 righe dati dopo il tag):

| Colonna 1 | Colonna 2 |
|-----------|-----------|
| `{{#righe_rischi_particolari}}{{situazione}}` | `{{misure}}{{/righe_rischi_particolari}}` |

Con doppia graffa: `{{#righe_rischi_particolari}}{{situazione}}` | `{{misure}}{{/righe_rischi_particolari}}`

In compilazione: checkbox per includere/escludere ogni riga (6 standard preselezionate); testi situazione e misure modificabili; possibilità di aggiungere righe.

Wizard: `rischi_particolari_modalita` (`nessuno`|`tabella`), `paragrafo_rischi_nessuno`, `paragrafo_rischi_intro`, `righe_rischi_particolari[]` (`id`, `selezionato`, `situazione`, `misure`).

## §2.4 — Aree ad elevato rischio incendio (par. ~201–204)

Eliminare il paragrafo **«oppure»** (par. ~202).

### Opzione A — nessuna area (par. ~201)

```
{{PARAGRAFO_RISCHI_INCENDIO_NESSUNO}}
```

### Opzione B — aree presenti (par. ~203–204)

| Paragrafo | Tag |
|-----------|-----|
| 1 | `{{PARAGRAFO_RISCHI_INCENDIO_ALTO_1}}` |
| 2 | `{{PARAGRAFO_RISCHI_INCENDIO_ALTO_2}}` |

Testo standard par. 2 con placeholder `XXXXXXXXXXX` (area da descrivere) — tutto modificabile in compilazione (textarea, 2 paragrafi separati da riga vuota).

Wizard: `rischi_incendio_alto_modalita` (`nessuno`|`presenti`), `paragrafo_rischi_incendio_nessuno`, `testo_blocco_rischi_incendio_alto`.

## §2.5 — Persone con esigenze speciali (par. ~207–215)

Eliminare **«oppure»** (par. ~209).

### Frase finale (entrambe le opzioni) — **grassetto nel template Word**

| Dove | Tag |
|------|-----|
| Opz. A — par. ~208 | `{{PARAGRAFO_ESIGENZE_CHIUSURA}}` |
| Opz. B — par. ~215 | `{{PARAGRAFO_ESIGENZE_CHIUSURA}}` |

> Formattare il tag (o l’intero paragrafo) in **grassetto** nel file `.docx`. Testo modificabile in compilazione.

### Opzione A — nessuna esigenza (par. ~207)

```
{{PARAGRAFO_ESIGENZE_NESSUNA}}
```

Poi il paragrafo con `{{PARAGRAFO_ESIGENZE_CHIUSURA}}` (grassetto).

### Opzione B — misure aggiuntive

| Par. | Tag |
|------|-----|
| ~210 Intro | `{{PARAGRAFO_ESIGENZE_INTRO}}` |
| ~211–214 Elenco | `{{LISTA_MISURE_ESIGENZE}}` nel **primo** punto elenco (testo multiriga con `-` e tab), oppure una riga modello: `{{#misure_esigenze_speciali}}-{{testo}}{{/misure_esigenze_speciali}}` |
| ~215 | `{{PARAGRAFO_ESIGENZE_CHIUSURA}}` (grassetto) |

Intro: con checkbox «aperto al pubblico» si aggiunge «anche legate al fatto che il luogo di lavoro è aperto al pubblico».

Wizard: `esigenze_speciali_modalita`, `luogo_aperto_pubblico`, `paragrafo_esigenze_nessuna`, `paragrafo_esigenze_intro`, `paragrafo_esigenze_chiusura`, `misure_esigenze_speciali[]` (`selezionato`, `testo`).

## §2.6 — Misure di protezione (par. ~218–231)

**Fissi nel Word** (nessun tag): par. ~218–221 (intro e definizioni), titoli «PROTEZIONI ATTIVE» / «PROTEZIONI PASSIVE» (par. ~222, ~226), par. ~231 (planimetrie).

### Elenchi puntati — compilazione in app

| Sezione | Tag | Dove nel Word |
|---------|-----|----------------|
| Protezioni attive | `{{LISTA_PROTEZIONI_ATTIVE}}` | Primo punto elenco sotto «PROTEZIONI ATTIVE» (par. ~223); **cancellare** i punti ~224–225 |
| Protezioni passive | `{{LISTA_PROTEZIONI_PASSIVE}}` | Primo punto sotto «PROTEZIONI PASSIVE» (par. ~227); **cancellare** i punti ~228–230 |

Alternativa loop (una riga modello per elenco):

| Attive | `{{#protezioni_attive}}•\t{{testo}}{{/protezioni_attive}}` |
| Passive | `{{#protezioni_passive}}•\t{{testo}}{{/protezioni_passive}}` |

Wizard: `protezioni_attive[]`, `protezioni_passive[]` — oggetti `{ testo }`; voci standard pre-caricate, modificabili, aggiungi/rimuovi.

## §2.8 — Aree operative (par. ~259–268)

**Fissi nel Word** (nessun tag): titolo sezione, testi descrittivi «CENTRO DI COORDINAMENTO», «POSTO DI CHIAMATA», «PUNTO DI RACCOLTA», frasi «Il luogo individuato come…», etichetta «PUNTO DI RACCOLTA» nella tabella a due colonne.

### Tre luoghi — compilazione in app

| Voce | Tag | Dove nel Word (modello STD) |
|------|-----|-----------------------------|
| Centro di coordinamento | `{{LUOGO_CENTRO_COORDINAMENTO}}` | **Tabella 3**, riga 0 col. 0 — cella blu al posto di `RECEPTION` |
| Posto di chiamata | `{{LUOGO_POSTO_CHIAMATA}}` | **Tabella 4**, riga 0 col. 0 — cella blu al posto di `RECEPTION` |
| Punto di raccolta (area) | `{{LUOGO_PUNTO_RACCOLTA}}` | **Tabella 5**, riga 0 col. 1 — colonna destra; col. 0 resta «PUNTO DI RACCOLTA» |

Wizard: `luogo_centro_coordinamento`, `luogo_posto_chiamata`, `luogo_punto_raccolta` (testo libero; default = valori del modello STD).

## §2.9 — Segnalazione allarme incendio (par. ~281–295)

**Fissi nel Word**: titolo sezione, intro Allegato 2, «Istruzione per la segnalazione…», DESTINATARIO (titolo + «Chiunque rilevi…» + «L'incendio può essere segnalato da:»), punto elenco **testimone** (sempre presente), punti elenco ubicazione/stato/persone/sostanze sotto QUANDO.

### DESTINATARIO — voci opzionali

| Tag | Dove |
|-----|------|
| `{{LISTA_SEGNALAZIONE_INCENDIO_OPZIONALI}}` | Sostituisce i paragrafi «impianto di rivelazione;» e «Posto di chiamata esterno.» (multiriga con `•` se selezionate; vuoto se nessuna) |

Wizard: `segnalazione_incendio_impianto_rivelazione`, `segnalazione_incendio_posto_chiamata_esterno` (checkbox, indipendenti).

### QUANDO SI VERIFICA L'EVENTO — frase introduttiva

| Tag | Contenuto |
|-----|-----------|
| `{{PARAGRAFO_QUANDO_SEGNALAZIONE_INCENDIO}}` | Paragrafo completo prima dei punti «ubicazione / stato / …» |

Wizard:

| Campo | Effetto |
|-------|---------|
| `centrale_segnalazione_incendio` | `true` → include «o il lavoratore che riceve la segnalazione dell'incendio dalla centrale, »; `false` → omesso |
| `segnalazione_destinatario` (§1.2) | `posto_chiamata` → «all'addetto al Posto di Chiamata»; `responsabile` → «al Responsabile dell'emergenza»; `nessuno` → formula combinata Posto/Responsabile |

### Attivazione squadra / soccorso esterno — riga DESTINATARIO

| Tag | Dove nel Word (modello STD) |
|-----|-----------------------------|
| `{{TESTO_DESTINATARIO_RUOLO_EMERGENZA}}` | **Par. subito sotto «DESTINATARIO»** in: (1) «Istruzioni per l'attivazione della squadra di emergenza»; (2) «Istruzione di richiesta di soccorso agli enti esterni» — sostituisce «Addetto Posto di Chiamata/Responsabile dell'emergenza» |

Wizard: solo `segnalazione_destinatario` (§1.2) — `posto_chiamata` → «Addetto Posto di Chiamata»; `responsabile` → «Responsabile dell'emergenza»; `nessuno` → formula combinata.

### Disattivazione forniture energetiche

**Fissi nel Word**: titolo istruzione, `DESTINATARIO` («Addetto alla disattivazione delle forniture energetiche.»), `QUANDO SI VERIFICA L'EVENTO`, intro «Al segnale di evacuazione tale figura provvede a:», primo punto elenco (energia elettrica).

| Tag | Dove |
|-----|------|
| `{{VOCE_DISATTIVAZIONE_GAS}}` | Secondo punto elenco (sotto quello sull'energia elettrica) — testo completo o vuoto |
| `{{#impianto_gas_distribuzione_presente}}` … `{{/impianto_gas_distribuzione_presente}}` | Opzionale: avvolgere lo stesso punto per condizionale docxtemplater |

Wizard: `impianto_gas_distribuzione_presente` (`true` / `false`, obbligatorio).

- `true` → «Eseguire la disattivazione dell'impianto di distribuzione del gas (ove presente nei locali di pertinenza diretta);»
- `false` → stringa vuota (punto omesso)

### Istruzione per l'evacuazione — Addetto al Posto di Chiamata

**Fissi nel Word**: titolo istruzione, DESTINATARIO («Tutto il personale presente»), EVACUAZIONE + paragrafo ordine evacuazione, blocchi Squadra / Pubblico.

**Condizionale** (testo titolo e corpo fissi, formattazione rosso sul titolo nel modello):

| Tag | Dove |
|-----|------|
| `{{#mostra_addetto_posto_chiamata_evacuazione}}` | Inizio paragrafo titolo rosso «Addetto al Posto di Chiamata» |
| `{{/mostra_addetto_posto_chiamata_evacuazione}}` | Fine paragrafo «Ricevuto l'ordine di evacuazione avvisa gli enti…» |

Campo dati (boolean): `mostra_addetto_posto_chiamata_evacuazione` — `true` se §1.2 `segnalazione_destinatario` ≠ `nessuno`; `false` se «Nessuno».

## Comportamenti da tenere in caso di incendio

**Fissi nel Word**: titolo, intro fiamme/fumo, altri punti del primo elenco, blocchi fumo in vie di esodo / locale bloccato / ordine evacuazione; in «In linea generale» il **primo** punto (flussi opposti) e gli **ultimi tre** (vestiti, solidarietà, punto di raccolta).

| Tag | Dove |
|-----|------|
| `{{VOCE_COMPORTAMENTI_SEGNALAZIONE_EVENTO}}` | Punto elenco «segnalare, come indicato nella apposita procedura…» (primo elenco occupanti) |
| `{{VOCE_COMPORTAMENTI_ASCENSORI}}` | Punto «In linea generale» — divieto ascensori (testo intero o vuoto) |
| `{{VOCE_COMPORTAMENTI_PORTE_REI}}` | Punto successivo — porte REI (testo intero o vuoto) |

Wizard:

| Campo | Effetto |
|-------|---------|
| `segnalazione_destinatario` (§1.2) | Testo «… al Posto di Chiamata» / «… al Responsabile dell'emergenza» / combinato |
| `comportamenti_vietato_ascensori` | `true` → include voce ascensori; `false` → omessa |
| `comportamenti_porte_rei` | `true` → include voce porte REI; `false` → omessa |

## §4.2 — Responsabile delle emergenze (preallarme / falso allarme)

**Fissi nel Word**: intro §4.2, blocco IN CASO DI PREALLARME, primi punti elenco, blocco «Se falso allarme…» (dichiara fine allerta, verifica cause).

| Tag | Dove |
|-----|------|
| `{{VOCE_RESET_CENTRALE_ANTINCENDIO}}` | Ultimo punto sotto «Se falso allarme o emergenza rientrata…» — «provvede, se necessario, al reset della centrale antincendio.» |

Wizard: riusa `centrale_segnalazione_incendio` (§2.9) — `true` → testo completo; `false` o centrale non presente → vuoto.

## §4.3 — Addetti antincendio

**Fissi nel Word**: intro §4.3 (contrasto evento, manovre, ecc.), blocco IN CASO DI PREALLARME e punti elenco successivi.

| Tag | Dove |
|-----|------|
| `{{PARAGRAFO_DIFFUSIONE_EVACUAZIONE_ANTINCENDIO}}` | Paragrafo «Su disposizione del Responsabile delle emergenze…» (sostituisce l’intero paragrafo) |
| `{{LIVELLO_RISCHIO_INCENDIO}}` | Nel paragrafo formazione: «… classificata a Livello **{{LIVELLO_RISCHIO_INCENDIO}}** di rischio incendio.» (solo il numero/label livello) |

Wizard:

| Campo | Effetto |
|-------|---------|
| `diffusione_evacuazione_antincendio` | `allarme` → attivano segnalazione/allarme evacuazione; `verbale` → diffondono verbalmente l’ordine |
| `livello_rischio_incendio` | Testo al posto di «1» (default `1`) |

### Preallarme / evacuazione addetti antincendio

| Tag | Dove |
|-----|------|
| `{{PARAGRAFO_PREALLARME_ANTINCENDIO_INTRO}}` | Frase «Il … consulta l'elenco…» sotto IN CASO DI PREALLARME (§4.3) |
| `{{VOCE_ESITO_INTERVENTO_ANTINCENDIO}}` | Ultimo punto elenco preallarme («comunichi l'esito…») |
| `{{VOCE_EVAC_COMUNICA_ESITO}}` | Punto evacuazione «comunica al … l'esito… evacuazione» |
| `{{VOCE_EVAC_ATTIVAZIONE_ALLARME}}` | Punto pulsante allarme **oppure** solo verbale (un paragrafo) |
| `{{VOCE_EVAC_ALLARME_FALLBACK_VERBALE}}` | Paragrafo successivo: fallback verbale se guasto (vuoto se solo verbale) |

| Campo wizard | Effetto |
|--------------|---------|
| `segnalazione_destinatario` (§1.2) | Intro preallarme + punto «comunica… evacuazione» |
| `esito_intervento_comunicazione_a` | `centro` / `responsabile` / `entrambi` — destinazione esito preallarme |
| `modalita_allarme_evacuazione_antincendio` | `pulsante` (pulsante + fallback) / `verbale` (solo diffusione verbale) |

## §4.4 / §4.5 — Sfollamento e primo soccorso

**Fissi nel Word**: testi introduttivi, altri punti elenco, evacuazione sfollamento (tranne punto segnalazione), primo soccorso punto interventi/cassetta, evacuazione primo soccorso.

| Tag | Dove |
|-----|------|
| `{{VOCE_SFOLLAMENTO_SEGNALA_SOCCORSI}}` | §4.4 — punto «… le segnalano … affinché siano inviati i soccorsi» |
| `{{VOCE_PRIMO_SOCCORSO_COMUNICAZIONE}}` | §4.5 — «la comunicazione viene data dal … o da un testimone» |
| `{{VOCE_PRIMO_SOCCORSO_COORDINA_118}}` | §4.5 — «un altro incaricato si coordina con il … ed effettua la chiamata… 118» |

Wizard: solo `segnalazione_destinatario` (§1.2).

## §4.6 — Addetto al posto di chiamata

**Fissi nel Word**: intro CHIAMATA DI SOCCORSO ESTERNA (primo paragrafo efficacia), resto preallarme/evacuazione.

| Tag | Dove |
|-----|------|
| `{{PARAGRAFO_TELEFONATA_SOCCORSO_POSTO_CHIAMATA}}` | «La telefonata di soccorso dovrà essere effettuata …» |
| `{{VOCE_POSTO_CHIAMATA_RICEVE_INFORMAZIONI}}` | Preallarme — primo punto elenco ricezione informazioni |

| Campo | Effetto |
|-------|---------|
| `segnalazione_destinatario` (§1.2) | Destinatario telefonata soccorso |
| `centrale_segnalazione_incendio` (§2.9) | `true` → aggiunge «o da chi ha rilevato un allarme dalla centrale antincendio» |

## §5.2 — Formazione del personale incaricato

**Fissi nel Word**: paragrafi su D.M. 02/09/2021, addetti antincendio/evacuazione, primo soccorso D.M. 388/03.

| Tag | Dove |
|-----|------|
| `{{LIVELLO_ADDESTRAMENTO_EMERGENZE}}` | «… è previsto un addestramento di Livello **X** ai sensi della normativa vigente.» (solo numero/sigla livello) |

| Campo wizard | Effetto |
|--------------|---------|
| `livello_addestramento_emergenze` | Testo al posto di «II» (default `II`) |

## §6.1 — Emergenza sanitaria

**Fissi nel Word**: paragrafo introduttivo, secondo punto elenco (primo soccorso).

| Tag | Dove |
|-----|------|
| `{{VOCE_EMERGENZA_SANITARIA_DESTINATARIO}}` | Primo punto elenco «informare» (testo in **MAIUSCOLO**) |

| `segnalazione_destinatario` (§1.2) | Testo generato |
|-------------------------------------|----------------|
| Posto di chiamata | `POSTO DI CHIAMATA` |
| Responsabile | `RESPONSABILE DELL'EMERGENZA` |
| Nessuno / combinato | `POSTO DI CHIAMATA/RESPONSABILE DELL'EMERGENZA` |

## §6.2 — Rinvenimento oggetto sospetto

**Fissi nel Word**: resto del paragrafo (consultazione Responsabile, Forze dell'ordine, ecc.).

| Tag | Dove |
|-----|------|
| `{{TESTO_RINVENIMENTO_OGGETTO_SOSPETTO_DESTINATARIO}}` | «… il più presto al **Posto di Chiamata/Responsabile dell'emergenza** che provvederà…» |

| `segnalazione_destinatario` (§1.2) | Testo (senza «al ») |
|-------------------------------------|---------------------|
| Posto di chiamata | Posto di Chiamata |
| Responsabile | Responsabile dell'emergenza |
| Nessuno / combinato | Posto di Chiamata/Responsabile dell'emergenza |

## §6.7 — Comportamenti in emergenza incendio

**Fissi nel Word**: altri punti elenco (fumo, vie di esodo, estintori, ecc.).

| Tag | Punto elenco |
|-----|----------------|
| `{{VOCE_COMPORTAMENTI_67_AVVISA_DESTINATARIO}}` | Fiamme/fumo — «… avvisare immediatamente **il** …» (solo destinatario; «il » è fisso nel Word) |
| `{{VOCE_COMPORTAMENTI_67_EVACUA_DESTINATARIO}}` | Ultimo punto — «… avvisare immediatamente **il …** per l'eventuale ordine di evacuazione» (tag include «il ») |

## §6.8 — Fuga di gas / sostanze pericolose

**Fissi nel Word**: altri punti elenco.

| Tag | Punto elenco |
|-----|----------------|
| `{{VOCE_COMPORTAMENTI_68_ALLERTA_DESTINATARIO}}` | Ultimo punto — «Allertare il **…** per l'eventuale chiamata…» |

Per §6.7 e §6.8, `segnalazione_destinatario` (§1.2) come §6.2: Posto di Chiamata / Responsabile dell'emergenza / formula combinata.

## Altre sezioni

Da definire (procedure, squadre, vie di fuga, numeri utili, ecc.).

## File adapter

| File | Ruolo |
|------|--------|
| `adapter.js` | `buildData`, `validate`, `generateDocx` |
| `preview.html` | Compila + anteprima Word |
| `logo-docx.js` | Iniezione logo post-render |
| `fields-map.md` | Questa documentazione |
