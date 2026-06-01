# APPENDICE_A_ORGANIGRAMMA — Field map

Codice: `APPENDICE_A_ORGANIGRAMMA` · Template bucket: `modelli/APPENDICE_A_ORGANIGRAMMA.docx`

## Tag Word (Docxtemplater)

| Tag | Origine | Note |
|-----|---------|------|
| `{%LOGO%}` | Logo azienda (iniezione post-render) | PNG/JPEG in Loghi |
| `{{RAGIONE_SOCIALE}}` | Anagrafica azienda | Tabella + §1 premessa |
| `{{SEDE_OPERATIVA}}` | Sede scelta in generazione | Tabella |
| `{{DATA_EMISSIONE}}` | Data generazione | Tabella |
| `{{#ORGANIGRAMMA_DA_FORMALIZZARE}}…{{/ORGANIGRAMMA_DA_FORMALIZZARE}}` | Wizard: «Dovrà formalizzare» | §1 premessa |
| `{{#ORGANIGRAMMA_GIA_FORMALIZZATO}}…{{/ORGANIGRAMMA_GIA_FORMALIZZATO}}` | Wizard: «Ha già formalizzato» | §1 premessa |
| `{{#ORG_OPT_DATORE_PREPOSTO_UNICO}}…{{/ORG_OPT_DATORE_PREPOSTO_UNICO}}` | Wizard §5.1 opzione 1 | Datore coincide con Preposto |
| `{{#ORG_OPT_DATORE_DISTINTO_DA_PREPOSTO}}…{{/ORG_OPT_DATORE_DISTINTO_DA_PREPOSTO}}` | Wizard §5.1 opzione 2 | Datore distinto da Preposto |
| `{{#ORG_MC_PREVISTO}} e di Medico Competente{{/ORG_MC_PREVISTO}}` | Wizard §5.1 medico competente | Frase “figure esterne…” |
| `{{#ORG_REF_PERSONALE_PREVISTO}}…{{/ORG_REF_PERSONALE_PREVISTO}}` | Wizard referente personale | Riga tabella opzione 1 e 2 |
| `{{#ORG_REF_SERVIZI_TEC_PREVISTO}}…{{/ORG_REF_SERVIZI_TEC_PREVISTO}}` | Wizard referente servizi tecnici | Riga tabella |
| `{{#ORG_REF_ACQUISTI_PREVISTO}}…{{/ORG_REF_ACQUISTI_PREVISTO}}` | Wizard referente acquisti/appalti | Riga tabella |
| `{{ORG_SOGG_DATORE_PREPOSTO}}` | Anagrafica `datore_lavoro` | Tabella opzione 1 |
| `{{ORG_SOGG_DATORE_SOLO}}` | Anagrafica `datore_lavoro` | Tabella opzione 2 |
| `{{ORG_SOGG_RSPP}}` | Anagrafica `rspp` | Tabella |
| `{{ORG_SOGG_MC}}` | Anagrafica `medico_competente` | Tabella (se previsto) |
| `{{ORG_SOGG_RLS}}` | Anagrafica `rls` | Tabella |
| `{{ORG_SOGG_REF_PERSONALE}}` | Wizard | Tabella |
| `{{ORG_SOGG_REF_SERVIZI_TEC}}` | Wizard | Tabella |
| `{{ORG_SOGG_REF_ACQUISTI}}` | Wizard | Tabella |
| `{{ORG_SOGG_PREPOSTO}}` | Wizard | Tabella opzione 2 |
| `{{ORG_SOGG_DIRIGENTI}}` | Wizard | Tabella opzione 2 |
| `{{ORG_SOGG_PREPOSTI_NOTA}}` | Wizard | Tabella opzione 2 |
| `{{ORG_SOGG_SQUADRE_EMERGENZA}}` | Wizard | Tabella |

## Wizard (`preview.html`)

- `stato_formalizzazione_organigramma`: `da_formalizzare` | `gia_formalizzato`
- `organigramma_datore_preposto_unico`: `true` (opzione 1) | `false` (opzione 2)
- `organigramma_mc_previsto`: `true` | `false`
- `organigramma_ref_personale_previsto`, `organigramma_ref_servizi_tecnici_previsto`, `organigramma_ref_acquisti_previsto`: `true` | `false`
- `org_ref_personale`, `org_ref_servizi_tecnici`, `org_ref_acquisti_appalti`
- `org_preposto_sicurezza`, `org_dirigenti_testo`, `org_preposti_nota`
- `org_squadre_emergenza`

## Delimitatori consigliati nel documento (switch grandi)

Usa questi blocchi per racchiudere **intere opzioni**:

```text
{{#ORG_OPT_DATORE_PREPOSTO_UNICO}}
... TUTTO IL TESTO + TABELLA OPZIONE 1 ...
{{/ORG_OPT_DATORE_PREPOSTO_UNICO}}

{{#ORG_OPT_DATORE_DISTINTO_DA_PREPOSTO}}
... TUTTO IL TESTO + TABELLA OPZIONE 2 ...
{{/ORG_OPT_DATORE_DISTINTO_DA_PREPOSTO}}
```

Nella frase comune “Le figure esterne...”, usa:

```text
Le figure esterne all’azienda ricoprono i delicati ruoli di Responsabile del Servizio di Prevenzione e Protezione{{#ORG_MC_PREVISTO}} e di Medico Competente{{/ORG_MC_PREVISTO}}.
```

Nelle **due tabelle** §5.1 (opzione 1 e opzione 2), avvolgi ogni riga referente come per il Medico Competente:

```text
{{#ORG_REF_PERSONALE_PREVISTO}}Referente affari del personale	{{ORG_SOGG_REF_PERSONALE}}{{/ORG_REF_PERSONALE_PREVISTO}}
{{#ORG_REF_SERVIZI_TEC_PREVISTO}}Referente servizi tecnici	{{ORG_SOGG_REF_SERVIZI_TEC}}{{/ORG_REF_SERVIZI_TEC_PREVISTO}}
{{#ORG_REF_ACQUISTI_PREVISTO}}Referente acquisti/appalti	{{ORG_SOGG_REF_ACQUISTI}}{{/ORG_REF_ACQUISTI_PREVISTO}}
```

Ripeti gli stessi tre blocchi in **entrambe** le tabelle (`ORG_OPT_DATORE_PREPOSTO_UNICO` e `ORG_OPT_DATORE_DISTINTO_DA_PREPOSTO`).

## Payload interno (non inviato a Word)

- `_logo_buffer`, `_logo_path`, `LOGO_PREVIEW_URL`
- `_profili_nomi`, `_profili_azienda`
- `_stato_formalizzazione_organigramma`
