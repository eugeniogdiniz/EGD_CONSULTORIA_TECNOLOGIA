#!/usr/bin/env python3
"""
Gera os modelos para download dos artigos do site (public/modelos/*.xlsx) só com a biblioteca
padrão: um .xlsx é um zip de XML. Rode `python3 scripts/build-modelos.py` depois de mudar MODELOS.
Cada modelo: título, instruções em uma aba e a planilha em si, com cabeçalho em negrito e larguras.
"""
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent.parent / "public" / "modelos"

MODELOS = {
    "modelo-rdo-relatorio-diario-de-obra.xlsx": {
        "titulo": "Modelo de RDO (Relatório Diário de Obra) — EGD",
        "instrucoes": [
            "Preencha uma linha por dia de obra. Mantenha o número do RDO sequencial e sem buracos.",
            "Clima e condições do dia justificam atrasos e paralisações: registre manhã e tarde.",
            "Efetivo: conte pessoas por função, inclusive terceiros. Equipamentos: horas trabalhadas e paradas.",
            "Ocorrências: acidente, falta de material, interferência, visita da fiscalização. Uma linha por ocorrência, com hora.",
            "Assinaturas: responsável da contratada e fiscal da contratante. Sem as duas, o RDO não vale como evidência.",
            "Publicado por EGD Consultoria em Tecnologia — egdsystem.com.br. Uso livre; mantenha a referência.",
        ],
        "abas": [
            ("RDO", ["Nº RDO", "Data", "Dia da semana", "Obra / contrato", "Frente de serviço", "Clima manhã", "Clima tarde", "Condição de trabalho", "Efetivo próprio", "Efetivo terceiros", "Equipamentos (horas)", "Atividades executadas", "Atividades previstas e não executadas", "Motivo", "Ocorrências", "Materiais recebidos", "Responsável contratada", "Fiscal contratante", "Observações"],
             [[1, "2026-10-01", "Quarta", "Contrato 012/2026 — Lote 3", "Terraplenagem", "Sol", "Nublado", "Praticável", 18, 6, "Escavadeira 8h; Caminhão 6h", "Corte e aterro estacas 10 a 14", "Compactação estaca 15", "Chuva no fim da tarde", "Visita da fiscalização às 14h", "120 m³ brita 1", "", "", ""]],
             [8, 12, 12, 28, 20, 12, 12, 16, 12, 12, 26, 40, 34, 24, 34, 24, 22, 20, 30]),
            ("Efetivo por função", ["Data", "Função", "Própria", "Terceiros", "Total", "Observação"], [["2026-10-01", "Pedreiro", 6, 2, 8, ""], ["2026-10-01", "Servente", 8, 4, 12, ""]], [12, 24, 10, 10, 10, 30]),
            ("Equipamentos", ["Data", "Equipamento", "Prefixo", "Horas trabalhadas", "Horas paradas", "Motivo da parada"], [["2026-10-01", "Escavadeira hidráulica", "ESC-02", 8, 0, ""]], [12, 28, 10, 16, 14, 30]),
        ],
    },
    "modelo-boletim-de-medicao-de-obra.xlsx": {
        "titulo": "Modelo de boletim de medição de contrato de obra — EGD",
        "instrucoes": [
            "Uma linha por item da planilha contratual. Mantenha o código e a unidade exatamente como no contrato.",
            "Quantidade acumulada anterior + quantidade do período = acumulado atual. O saldo é contratual menos acumulado.",
            "Valor do período = quantidade do período × preço unitário contratual. Não misture reajuste nesta aba.",
            "Memória de cálculo: para cada item medido, registre a referência (estaca, eixo, pavimento, desenho) e o critério.",
            "Aditivos entram como itens novos ou como alteração de quantidade, sempre com o número do termo aditivo.",
            "Publicado por EGD Consultoria em Tecnologia — egdsystem.com.br. Uso livre; mantenha a referência.",
        ],
        "abas": [
            ("Boletim", ["Item", "Código", "Descrição", "Unidade", "Qtd. contratual", "Preço unitário (R$)", "Valor contratual (R$)", "Acumulado anterior", "Qtd. período", "Acumulado atual", "Saldo", "Valor período (R$)", "% executado", "Aditivo nº"],
             [["1.1", "01.001", "Escavação mecânica em solo de 1ª categoria", "m³", 12000, 18.5, "=E2*F2", 4000, 1500, "=H2+I2", "=E2-J2", "=I2*F2", "=J2/E2", ""]],
             [8, 10, 44, 8, 14, 16, 18, 16, 12, 14, 10, 16, 12, 10]),
            ("Memória de cálculo", ["Item", "Referência (estaca/eixo/desenho)", "Critério de medição", "Cálculo", "Quantidade", "Unidade", "Evidência (foto/relatório)"], [["1.1", "Estacas 10 a 14", "Volume geométrico", "5 × 300 m³", 1500, "m³", "RDO 1 a 8; fotos 2026-10"]], [8, 30, 24, 24, 12, 8, 30]),
            ("Resumo", ["Período", "Medição nº", "Valor bruto (R$)", "Reajuste (R$)", "Retenções (R$)", "Valor líquido (R$)", "Aprovação fiscal", "Data"], [["2026-10", 3, "", "", "", "", "", ""]], [12, 12, 16, 14, 14, 16, 18, 12]),
        ],
    },
    "modelo-checklist-de-vistoria-de-obra.xlsx": {
        "titulo": "Modelo de checklist de vistoria de obra — EGD",
        "instrucoes": [
            "Uma linha por item verificado. Resultado: Conforme, Não conforme ou Não se aplica. Não deixe em branco.",
            "Toda não conformidade precisa de foto, responsável e prazo. Sem isso o item não fecha.",
            "Agrupe por disciplina (estrutura, alvenaria, instalações, segurança) para o relatório sair organizado.",
            "Reinspeção: registre a data e o novo resultado na mesma linha, sem apagar o original.",
            "Publicado por EGD Consultoria em Tecnologia — egdsystem.com.br. Uso livre; mantenha a referência.",
        ],
        "abas": [
            ("Checklist", ["Nº", "Disciplina", "Item verificado", "Critério / referência", "Resultado", "Descrição da não conformidade", "Foto (nº)", "Gravidade", "Responsável", "Prazo", "Reinspeção (data)", "Resultado reinspeção"],
             [[1, "Estrutura", "Cobrimento da armadura", "Projeto estrutural; NBR 6118", "Conforme", "", "", "", "", "", "", ""], [2, "Segurança", "Guarda-corpo em periferia de laje", "NR-18", "Não conforme", "Trecho de 6 m sem guarda-corpo no 3º pavimento", "F-014", "Alta", "Encarregado", "2026-10-03", "", ""]],
             [6, 16, 34, 30, 14, 40, 10, 10, 18, 12, 16, 16]),
            ("Cabeçalho", ["Campo", "Valor"], [["Obra / contrato", ""], ["Local / frente", ""], ["Data da vistoria", ""], ["Vistoriador", ""], ["Acompanhante da contratada", ""], ["Condições do dia", ""]], [30, 50]),
        ],
    },
    "modelo-lista-mestra-de-documentos.xlsx": {
        "titulo": "Modelo de lista mestra de documentos de contrato — EGD",
        "instrucoes": [
            "Uma linha por documento controlado: projeto, memorial, laudo, ART/RRT, licença, ata, ofício.",
            "Código único por documento e revisão numerada. A revisão vigente é a única que pode ser usada em campo.",
            "Situação: Em elaboração, Em aprovação, Aprovado, Superado, Cancelado. Documento Superado fica na lista, nunca some.",
            "Distribuição: quem recebeu cada revisão e quando. É o que responde 'quem estava com a versão errada'.",
            "Publicado por EGD Consultoria em Tecnologia — egdsystem.com.br. Uso livre; mantenha a referência.",
        ],
        "abas": [
            ("Lista mestra", ["Código", "Título", "Tipo", "Disciplina", "Revisão vigente", "Data da revisão", "Situação", "Emitido por", "Aprovado por", "Data de aprovação", "Local do arquivo (pasta/link)", "Observações"],
             [["CT012-EST-DE-001", "Planta de formas — 3º pavimento", "Desenho", "Estrutura", "R2", "2026-09-20", "Aprovado", "Projetista", "Fiscalização", "2026-09-25", "", ""]],
             [20, 36, 12, 14, 12, 14, 14, 16, 16, 16, 34, 30]),
            ("Revisões", ["Código", "Revisão", "Data", "Motivo da revisão", "Alterações", "Emitido por"], [["CT012-EST-DE-001", "R2", "2026-09-20", "Compatibilização com hidráulica", "Furos em vigas V12 e V13", "Projetista"]], [20, 10, 12, 30, 40, 16]),
            ("Distribuição", ["Código", "Revisão", "Destinatário", "Empresa", "Meio", "Data de envio", "Confirmação"], [["CT012-EST-DE-001", "R2", "Engenheiro residente", "Consorciada A", "E-mail", "2026-09-26", "Sim"]], [20, 10, 24, 20, 12, 14, 12]),
        ],
    },
    "modelo-inventario-de-relatorios-para-automacao.xlsx": {
        "titulo": "Modelo de inventário de relatórios para automação — EGD",
        "instrucoes": [
            "Liste cada relatório que a equipe produz hoje: diário, semanal, mensal, por evento. Um por linha.",
            "Horas por mês = tempo de coletar + montar + revisar + enviar, somando todas as pessoas envolvidas.",
            "Fonte dos dados: de onde cada número vem (planilha, sistema, foto, caderneta). É o que define o esforço de automação.",
            "Prioridade = horas por mês × risco de erro. Comece pelo relatório de maior pontuação.",
            "Publicado por EGD Consultoria em Tecnologia — egdsystem.com.br. Uso livre; mantenha a referência.",
        ],
        "abas": [
            ("Inventário", ["Relatório", "Frequência", "Quem produz", "Quem recebe", "Fonte dos dados", "Formato de saída", "Horas por mês", "Risco de erro (1-5)", "Prioridade", "Observações"],
             [["Relatório semanal de avanço físico", "Semanal", "Engenheiro de planejamento", "Gerente de contrato; cliente", "Planilha de medição; RDO", "PDF por e-mail", 16, 4, "=G2*H2", ""], ["Relatório fotográfico mensal", "Mensal", "Estagiário", "Fiscalização", "Fotos do celular; WhatsApp", "Word/PDF", 12, 3, "=G3*H3", ""]],
             [36, 12, 26, 28, 30, 18, 14, 16, 12, 30]),
        ],
    },
}

def col_letter(n):
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s

def cell_xml(ref, value, style=0):
    if value == "" or value is None:
        return f'<c r="{ref}" s="{style}"/>'
    if isinstance(value, str) and value.startswith("="):
        return f'<c r="{ref}" s="{style}"><f>{escape(value[1:])}</f></c>'
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{escape(str(value))}</t></is></c>'

def sheet_xml(header, rows, widths):
    cols = "".join(f'<col min="{i+1}" max="{i+1}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths))
    out = [f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>{cols}</cols><sheetData>']
    out.append('<row r="1">' + "".join(cell_xml(f"{col_letter(i+1)}1", h, 1) for i, h in enumerate(header)) + "</row>")
    for r, row in enumerate(rows, start=2):
        out.append(f'<row r="{r}">' + "".join(cell_xml(f"{col_letter(i+1)}{r}", v) for i, v in enumerate(row)) + "</row>")
    out.append("</sheetData></worksheet>")
    return "".join(out)

def instrucoes_xml(titulo, linhas):
    rows = [[titulo]] + [[""]] + [[l] for l in linhas]
    return sheet_xml(["Leia antes de usar"], rows, [120]).replace('<c r="A1" s="1" t="inlineStr">', '<c r="A1" s="1" t="inlineStr">')

STYLES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
          '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
          '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF071D3B"/></patternFill></fill></fills>'
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')

def build(name, spec):
    sheets = [("Instruções", instrucoes_xml(spec["titulo"], spec["instrucoes"]))] + [(n, sheet_xml(h, r, w)) for n, h, r, w in spec["abas"]]
    ct = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>']
    for i in range(len(sheets)):
        ct.append(f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
    ct.append("</Types>")
    rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'
    wb = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>']
    wbrels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">']
    for i, (n, _) in enumerate(sheets):
        wb.append(f'<sheet name="{escape(n)}" sheetId="{i+1}" r:id="rId{i+1}"/>')
        wbrels.append(f'<Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i+1}.xml"/>')
    wb.append("</sheets></workbook>")
    wbrels.append(f'<Relationship Id="rId{len(sheets)+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    core = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>{escape(spec["titulo"])}</dc:title><dc:creator>EGD Consultoria em Tecnologia</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2026-10-09T00:00:00Z</dcterms:created></cp:coreProperties>'
    app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>EGD</Application></Properties>'
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT / name, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", "".join(ct))
        z.writestr("_rels/.rels", rels)
        z.writestr("docProps/core.xml", core)
        z.writestr("docProps/app.xml", app)
        z.writestr("xl/workbook.xml", "".join(wb))
        z.writestr("xl/_rels/workbook.xml.rels", "".join(wbrels))
        z.writestr("xl/styles.xml", STYLES)
        for i, (_, xml) in enumerate(sheets):
            z.writestr(f"xl/worksheets/sheet{i+1}.xml", xml)
    print("ok", name)

if __name__ == "__main__":
    for name, spec in MODELOS.items():
        build(name, spec)
