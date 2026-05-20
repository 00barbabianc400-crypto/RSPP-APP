# -*- coding: utf-8 -*-
"""
Inserisce placeholder Docxtemplater nel modello Word MOD_MICROCLIMA.

Operazioni tipiche su word/document.xml:
  • Copertina MODULO / numero → {{MODULO_NUMERO}}
  • Ragione sociale / sede / logo ({%LOGO})
  • Data emissione / premessa sede / paragrafo ciclo → {{PREMESSA_CICLO_LAVORO}}
  • Firma Luogo / Data
  • Tabella §2.7 — prima riga dati con loop {{#RIGHE_MICROCLIMA}} … {{/RIGHE_MICROCLIMA}}

Su word/header*.xml e word/footer*.xml:
  • Sequenze XXXXXXXXXXXXXXX in alternanza {{RAGIONE_SOCIALE}} / {{SEDE_OPERATIVA}}

Se il modello è stato modificato rispetto alle «ancore» previste, lo script segnala
errori o applica solo le sostituzioni sicure.

Uso:
  python scripts/insert_mod_microclima_placeholders.py \"Percorso\\\\Modulo Microclima.docx\"

Output: <stem>_patched.docx nella stessa cartella dell'ingresso.
Backup (solo se non esiste già): <stem>.docx.bak-micro

Campi documentati in: js/generazione/adapters/MOD_MICROCLIMA/fields-map.md
"""

from __future__ import annotations

import re
import shutil
import sys
import zipfile
from pathlib import Path

TAB_ANCHORS = (
    "Tabella 1- Risultati delle rilevazioni microclimatiche",
    "Tabella 1 – Risultati delle rilevazioni microclimatiche",
    "Tabella 1 — Risultati delle rilevazioni microclimatiche",
)

ROW_CELL_TAGS = (
    "{{#RIGHE_MICROCLIMA}}{{RIGA_N}}",
    "{{POSTAZIONE}}",
    "{{DATA_RIL}}",
    "{{ORA_RIL}}",
    "{{VA}}",
    "{{TG}}",
    "{{TAMB}}",
    "{{TRAD}}",
    "{{RH}}",
    "{{MET}}",
    "{{CLO}}",
    "{{PMV}}",
    "{{PPD}}{{/RIGHE_MICROCLIMA}}",
)

# Copertina: due run «MODULO » + «XX» → un solo run con placeholder (Calibri esempio da modello tipico)
_COVER_MOD_OLD = (
    '<w:r w:rsidRPr="00DF0892"><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Tahoma"/>'
    '<w:i/><w:smallCaps/><w:sz w:val="44"/><w:szCs w:val="28"/></w:rPr>'
    '<w:t xml:space="preserve">MODULO </w:t></w:r>'
    '<w:r w:rsidRPr="0068597C"><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Tahoma"/>'
    '<w:i/><w:smallCaps/><w:sz w:val="44"/><w:szCs w:val="28"/><w:highlight w:val="yellow"/></w:rPr>'
    "<w:t>XX</w:t></w:r>"
)

_COVER_MOD_NEW = (
    '<w:r w:rsidRPr="00DF0892"><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Tahoma"/>'
    '<w:i/><w:smallCaps/><w:sz w:val="44"/><w:szCs w:val="28"/></w:rPr>'
    "<w:t xml:space=\"preserve\">MODULO {{MODULO_NUMERO}}</w:t></w:r>"
)


def patch_placeholder_headers_footers(xml: str) -> str:
    """Sostituisce XXXXXXXXXXXXXXX con RS / Sede in ordine."""
    out = xml
    toggle_rs = True
    while "XXXXXXXXXXXXXXX" in out:
        rep = "{{RAGIONE_SOCIALE}}" if toggle_rs else "{{SEDE_OPERATIVA}}"
        toggle_rs = not toggle_rs
        out = out.replace("XXXXXXXXXXXXXXX", rep, 1)
    return out


def _is_tbl_element_open(xml: str, j: int) -> bool:
    """True se è il tag tabella <w:tbl …>, non <w:tblGrid / tblPr ecc."""
    if not xml.startswith("<w:tbl", j):
        return False
    k = j + len("<w:tbl")
    if k >= len(xml):
        return True
    return xml[k] in " >/\t\r\n"


def _extract_balanced_tbl(xml: str, start: int) -> tuple[str, int, int] | None:
    i = xml.find("<w:tbl", start)
    while i >= 0 and not _is_tbl_element_open(xml, i):
        i = xml.find("<w:tbl", i + 1)
    if i < 0:
        return None
    j = i
    depth = 0
    while j < len(xml):
        if _is_tbl_element_open(xml, j):
            depth += 1
            gt = xml.find(">", j)
            if gt < 0:
                return None
            j = gt + 1
            continue
        if xml.startswith("</w:tbl>", j):
            depth -= 1
            end = j + len("</w:tbl>")
            if depth == 0:
                return xml[i:end], i, end
            j = end
            continue
        j += 1
    return None


def _split_tr(tbl_inner: str) -> list[str]:
    return re.findall(r"<w:tr\b[\s\S]*?</w:tr>", tbl_inner)


def _split_tc(tr_xml: str) -> list[str]:
    return re.findall(r"<w:tc\b[\s\S]*?</w:tc>", tr_xml)


def _escape_xml_text(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _replace_first_cell_text(tc_xml: str, new_plain: str) -> str:
    """Imposta il primo contenuto <w:t>...</w:t> della cella a new_plain (conserva OOXML attorno)."""
    m = re.search(r"<w:t([^>]*)>([^<]*)</w:t>", tc_xml)
    if not m:
        gt = tc_xml.find(">")
        if gt < 0:
            return tc_xml
        ins = (
            "<w:p><w:r><w:t xml:space=\"preserve\">"
            + _escape_xml_text(new_plain)
            + "</w:t></w:r></w:p>"
        )
        return tc_xml[: gt + 1] + ins + tc_xml[gt + 1 :]
    attrs = m.group(1) or ""
    if "xml:space" not in attrs:
        attrs = ' xml:space="preserve"' + attrs.strip()
    rep = "<w:t" + attrs + ">" + _escape_xml_text(new_plain) + "</w:t>"
    return tc_xml[: m.start()] + rep + tc_xml[m.end() :]


def patch_micro_table(xml: str) -> tuple[str, bool]:
    """Prima tabella dopo ancora testuale: header intatto, prima riga dati = placeholder, righe dati extra rimosse."""
    pos = -1
    used_anchor = ""
    for a in TAB_ANCHORS:
        pos = xml.find(a)
        if pos >= 0:
            used_anchor = a
            break
    if pos < 0:
        print("[WARN] Ancora tabella non trovata (varianti Tabella 1… microclima). Salto patch tabella.")
        return xml, False

    tbl_block = _extract_balanced_tbl(xml, pos)
    if not tbl_block:
        print("[WARN] Nessuna <w:tbl> dopo l'ancora. Salto patch tabella.")
        return xml, False

    full_tbl, tbl_start, tbl_end = tbl_block
    m_tbl = re.match(r"(<w:tbl\b[^>]*>)([\s\S]*)(</w:tbl>)", full_tbl)
    if not m_tbl:
        print("[WARN] Struttura tabella imprevista. Salto.")
        return xml, False
    tbl_open, inner, tbl_close = m_tbl.group(1), m_tbl.group(2), m_tbl.group(3)

    rows = _split_tr(inner)
    if len(rows) < 2:
        print("[WARN] Tabella troppo corta per righe dati. Salto.")
        return xml, False

    header_row = rows[0]
    first_data = rows[1]
    cells = _split_tc(first_data)
    need = len(ROW_CELL_TAGS)
    if len(cells) < need:
        print(f"[WARN] Celle prima riga dati ({len(cells)}) < placeholder ({need}). Salto tabella.")
        return xml, False

    new_cells_xml = []
    for i in range(need):
        new_cells_xml.append(_replace_first_cell_text(cells[i], ROW_CELL_TAGS[i]))

    rebuilt_first_data = first_data
    for orig, neu in zip(cells[:need], new_cells_xml):
        rebuilt_first_data = rebuilt_first_data.replace(orig, neu, 1)

    kept_middle = header_row + rebuilt_first_data
    new_inner = kept_middle + "".join(rows[2:])
    new_tbl = tbl_open + new_inner + tbl_close
    out = xml[:tbl_start] + new_tbl + xml[tbl_end:]
    print(f"[OK] Tabella §2.7 patchata (ancora: «{used_anchor[:48]}…», righe dati rimosse oltre la prima).")
    return out, True


def patch_premessa_ciclo_placeholder(xml: str) -> str:
    """Se trova il testo tipico del ciclo lavoro, sostituisce quel <w:t> con {{PREMESSA_CICLO_LAVORO}}."""
    needle = "Il ciclo di lavoro considerato"
    i = xml.find(needle)
    if i < 0:
        return xml
    t_open = xml.rfind("<w:t", max(0, i - 800), i)
    if t_open < 0:
        return xml
    t_gt = xml.find(">", t_open)
    t_close = xml.find("</w:t>", i)
    if t_gt < 0 or t_close < 0:
        return xml
    attrs = xml[t_open + 4 : t_gt]
    if "xml:space" not in attrs:
        attrs = ' xml:space="preserve"' + attrs.strip()
    repl = "<w:t" + attrs + ">{{PREMESSA_CICLO_LAVORO}}</w:t>"
    out = xml[:t_open] + repl + xml[t_close + len("</w:t>") :]
    print("[OK] Premessa ciclo lavoro → {{PREMESSA_CICLO_LAVORO}} (primo match).")
    return out


def patch_conclusioni_blocks(xml: str) -> str:
    """
    Tentativo leggero: inserisce tag §3 su frasi note. Se il modello differisce, nessun errore.
    """
    out = xml
    # Frase PMV (prima occorrenza)
    old_phrase = (
        "I valori ottenuti in relazione a tali indici e riportati nella precedente "
        "tabella risultano pienamente conformi in relazione al range di valori di riferimento "
        "che attestano il benessere termico (-0.5 <PMV < +0.5 e PPD< 10%). "
    )
    if old_phrase in out:
        t_open = out.rfind("<w:t", 0, out.find(old_phrase))
        if t_open >= 0:
            t_gt = out.find(">", t_open)
            t_close = out.find("</w:t>", out.find(old_phrase))
            if t_gt > t_open and t_close > t_gt:
                attrs = out[t_open + 4 : t_gt]
                if "xml:space" not in attrs:
                    attrs = ' xml:space="preserve"' + attrs.strip()
                rep = "<w:t" + attrs + ">{{FRASE_VALORI_PMV_CONCLUSIONI}}</w:t>"
                out = out[:t_open] + rep + out[t_close + len("</w:t>") :]
                print("[OK] §3 — frase PMV → {{FRASE_VALORI_PMV_CONCLUSIONI}}")

    # Paragrafo impianto → placeholder (match abbreviato)
    imp_needle = "Andando a valutare nel dettaglio l"
    ip = out.find(imp_needle)
    if ip >= 0:
        t_open = out.rfind("<w:t", max(0, ip - 600), ip)
        if t_open >= 0:
            t_gt = out.find(">", t_open)
            t_close = out.find("</w:t>", ip)
            if t_gt > t_open and t_close > t_gt:
                attrs = out[t_open + 4 : t_gt]
                if "xml:space" not in attrs:
                    attrs = ' xml:space="preserve"' + attrs.strip()
                rep = "<w:t" + attrs + ">{{PARAGRAFO_IMPIANTO_CONCLUSIONI}}</w:t>"
                out = out[:t_open] + rep + out[t_close + len("</w:t>") :]
                print("[OK] §3 — paragrafo impianto → {{PARAGRAFO_IMPIANTO_CONCLUSIONI}}")

    return out


def patch_document_xml(xml: str) -> str:
    # Copertina modulo
    if _COVER_MOD_OLD in xml:
        xml = xml.replace(_COVER_MOD_OLD, _COVER_MOD_NEW, 1)
        print("[OK] Copertina MODULO + XX → MODULO {{MODULO_NUMERO}}")

    # Committente / indirizzo tipici (pattern dal modello storico)
    xml = xml.replace("<w:t>XXXXXXXXX</w:t>", "<w:t>{{RAGIONE_SOCIALE}}</w:t>")
    xml = xml.replace("<w:t>VIA XXXXXXXXXXXX</w:t>", "<w:t>{{SEDE_OPERATIVA}}</w:t>")

    for old, neu in (
        ("ubicata in XXXXXXXXXXXXXXX,", "ubicata in {{SEDE_OPERATIVA}},"),
        ("ubicata in XXXXXXXXXXXXXXX ,", "ubicata in {{SEDE_OPERATIVA}} ,"),
        ("Emissione del XXXXXXXXXXXXXXX", "Emissione del {{DATA_EMISSIONE}}"),
    ):
        xml = xml.replace(old, neu)

    # Ultimo XXXXXXXXXXXXXXX isolato nel document (ragione sociale singola cella)
    win = xml
    while True:
        j = win.rfind("XXXXXXXXXXXXXXX")
        if j < 0:
            break
        xml = xml[:j] + "{{RAGIONE_SOCIALE}}" + xml[j + len("XXXXXXXXXXXXXXX") :]
        win = xml[:j]
        break

    xml = patch_premessa_ciclo_placeholder(xml)

    xml, _ok_tbl = patch_micro_table(xml)

    xml = patch_conclusioni_blocks(xml)

    return xml


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(2)

    src = Path(sys.argv[1]).expanduser().resolve()
    if not src.is_file():
        raise SystemExit(f"File non trovato: {src}")

    bak = src.with_suffix(src.suffix + ".bak-micro")
    out_path = src.with_name(src.stem + "_patched" + src.suffix)

    if not bak.exists():
        shutil.copy2(src, bak)
        print(f"[OK] Backup creato: {bak}")

    tmp_out = out_path.with_suffix(out_path.suffix + ".tmp")

    targets_pat = re.compile(r"word/(document|header\d+|footer\d+)\.xml$", re.I)

    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(tmp_out, "w", zipfile.ZIP_DEFLATED) as zout:
        names = zin.namelist()
        doc_targets = [n for n in names if targets_pat.match(n.replace("\\", "/"))]
        if not any(re.match(r"word/document\d*\.xml$", n.replace("\\", "/"), re.I) for n in doc_targets):
            raise SystemExit("Nessun document.xml trovato nel docx")

        for item in zin.infolist():
            data = zin.read(item.filename)
            fn = item.filename.replace("\\", "/")
            if targets_pat.match(fn):
                text = data.decode("utf-8")
                if fn.lower() == "word/document.xml":
                    text = patch_document_xml(text)
                elif fn.lower().startswith("word/header") or fn.lower().startswith("word/footer"):
                    text = patch_placeholder_headers_footers(text)
                data = text.encode("utf-8")
            zout.writestr(item, data)

    tmp_out.replace(out_path)
    print(f"[OK] Creato: {out_path}")


if __name__ == "__main__":
    main()
