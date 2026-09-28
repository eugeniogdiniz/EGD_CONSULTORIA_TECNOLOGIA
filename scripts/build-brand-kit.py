"""Gera os modelos editáveis e a papelaria a partir das fontes locais, sem APIs."""
from pathlib import Path
import json, sys, base64, shutil, re, zipfile, importlib.util
from html import escape
from xml.sax.saxutils import escape as xml
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'docs/brand/kit-comercial'
D=json.loads((ROOT/'docs/brand/templates/dados-comerciais.json').read_text())
if '--package' in sys.argv:
    with zipfile.ZipFile(OUT.parent/'kit-comercial-egd.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT.rglob('*')):
            if p.is_file(): z.write(p,Path('kit-comercial-egd')/p.relative_to(OUT))
    print('ZIP criado.');sys.exit()
spec=importlib.util.spec_from_file_location('documentos',ROOT/'docs/brand/templates/documentos.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
DOCS=mod.documents(D)
for sub in ['documentos','logos','papelaria','fonts','previews']:(OUT/sub).mkdir(parents=True,exist_ok=True)
for p in (ROOT/'public/brand').glob('*.svg'):shutil.copy2(p,OUT/'logos'/p.name)
for name in ['logo-horizontal.png','logo-negativo.png','simbolo.png','logo-apresentacao.png']:shutil.copy2(ROOT/'public/brand'/name,OUT/'logos'/name)
for p in (ROOT/'public/brand/fonts').iterdir():
    if p.is_file():shutil.copy2(p,OUT/'fonts'/p.name)
shutil.copy2(ROOT/'public/brand/manual-da-marca.pdf',OUT/'manual-da-marca.pdf')
CSS='''@font-face{font-family:Archivo;src:url('../fonts/archivo.woff2');font-weight:100 900}*{box-sizing:border-box}body{margin:0;background:#e0eaf6;color:#071d3b;font-family:Archivo,Arial,sans-serif}.page{width:210mm;height:297mm;margin:20px auto;background:#fff;padding:17mm 19mm 22mm;position:relative;break-after:page}.page:last-child{break-after:auto}.head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ccd9e8;padding-bottom:6mm;margin-bottom:8mm}.head img{width:75mm;height:auto}.head span{font-size:8px;letter-spacing:.5px;color:#4b6079;text-align:right;max-width:34mm}.kicker{font-size:9px;letter-spacing:1.2px;color:#075eb5;font-weight:600;margin:0 0 3mm}h1{font-size:30px;letter-spacing:-1px;line-height:1.1;margin:0 0 3mm;font-weight:600}.subtitle{font-size:11px;color:#4b6079;margin:0 0 6mm}.section-title{font-size:17px;color:#075eb5;font-weight:500;margin:0 0 5mm}h2{font-size:14px;margin:5mm 0 2mm;font-weight:600}p{font-size:13px;line-height:1.5;margin:0 0 3mm;white-space:pre-line;overflow-wrap:anywhere}.note{background:#f3f6fb;border-left:3px solid #0875e1;padding:3mm;font-size:10px;line-height:1.45;margin-bottom:5mm}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:3mm 0 4mm}th,td{text-align:left;vertical-align:top;padding:2.4mm 3mm;font-size:11px;line-height:1.4;border:1px solid #ccd9e8;overflow-wrap:anywhere}th{background:#e0eaf6;font-weight:600}table.cols-2 th:first-child,table.cols-2 td:first-child{width:30%}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-top:9mm}.signature{border-top:1px solid #9db5d2;padding-top:3mm;font-size:10px;line-height:1.7}.foot{position:absolute;left:19mm;right:19mm;bottom:12mm;border-top:1px solid #ccd9e8;padding-top:3mm;display:flex;justify-content:space-between;font-size:8px;color:#4b6079}.toolbar{max-width:794px;margin:18px auto;display:flex;gap:20px;font-size:14px}a{color:#075eb5}@page{size:A4;margin:0}@media print{body{background:#fff}.page{margin:0}.toolbar{display:none}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}@media screen and (max-width:820px){.page{width:100%;height:auto;min-height:297mm;margin:0 0 16px;padding:24px 20px 80px}.head img{max-width:65%;height:auto}.foot{left:20px;right:20px}.toolbar{padding:0 20px;flex-wrap:wrap}h1{font-size:28px}}'''
(OUT/'documentos/modelos.css').write_text(CSS)

def html_block(b):
    t=b['type'];text=escape(b.get('text',''))
    if t=='h':return f'<h2>{text}</h2>'
    if t in ['p','note']:return f'<p class="{t}">{text}</p>'
    if t=='table':return f'<table class="cols-{len(b["headers"])}"><thead><tr>'+''.join(f'<th>{escape(c)}</th>' for c in b['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join(f'<td>{escape(c)}</td>' for c in row)+'</tr>' for row in b['rows'])+'</tbody></table>'
    if t=='sign':return f'<p>{text}</p><div class="signatures">'+''.join('<div class="signature">'+'<br>'.join(escape(row[i]) for row in b['rows'])+'</div>' for i in range(2))+'</div>'

def markdown_block(b):
    if b['type']=='h':return '### '+b['text']
    if b['type'] in ['p','note']:return b['text']
    if b['type']=='table':return '| '+' | '.join(b['headers'])+' |\n| '+' | '.join('---' for _ in b['headers'])+' |\n'+'\n'.join('| '+' | '.join(row)+' |' for row in b['rows'])
    return b['text']+'\n\n'+'\n'.join(' · '.join(row) for row in b['rows'])

# DOCX nativo: texto, estilos, tabelas, cabeçalho com marca e rodapé numerado.
NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
def run(text,bold=False):
    parts=re.split(r'(\[[^\]]+\])',text)
    return ''.join('<w:r><w:rPr>'+('<w:b/>' if bold else '')+('<w:color w:val="075EB5"/>' if s.startswith('[') else '')+'</w:rPr>'+''.join('<w:t xml:space="preserve">'+xml(line)+'</w:t>'+('<w:br/>' if i<len(s.split('\n'))-1 else '') for i,line in enumerate(s.split('\n')))+'</w:r>' for s in parts if s)
def para(text,style='Normal',bold=False):return f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr>{run(text,bold)}</w:p>'
def wordtable(headers,rows,sign=False):
    count=len(headers);widths=[2925,6825] if count==2 and not sign else [9750//count]*count
    def row(cells,header=False):
        return '<w:tr><w:trPr><w:cantSplit/>'+('<w:tblHeader/>' if header else '')+'</w:trPr>'+''.join(f'<w:tc><w:tcPr><w:tcW w:w="{widths[i]}" w:type="dxa"/>'+('<w:shd w:fill="E0EAF6"/>' if header else '')+'</w:tcPr>'+para(c,'Table',header)+'</w:tc>' for i,c in enumerate(cells))+'</w:tr>'
    borders=''.join(f'<w:{e} w:val="single" w:sz="4" w:color="CCD9E8"/>' for e in ['top','left','bottom','right','insideH','insideV'])
    return '<w:tbl><w:tblPr><w:tblW w:w="9750" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+borders+'</w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+''.join(f'<w:gridCol w:w="{v}"/>' for v in widths)+'</w:tblGrid>'+row(headers,True)+''.join(row(r) for r in rows)+'</w:tbl>'+para('')

def make_docx(doc):
    body=[]
    for i,page in enumerate(doc['pages']):
        if i:body.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
        body += [para(doc['kind'],'Kicker'),para(doc['title'] if i==0 else page['title'],'Title'),para(doc['subtitle'] if i==0 else f'{doc["title"]} · continuação','Subtitle')]
        if i==0:body.append(para(page['title'],'Heading1'))
        for b in page['blocks']:
            if b['type'] in ['h','p','note']:body.append(para(b['text'],{'h':'Heading1','p':'Normal','note':'Note'}[b['type']]))
            elif b['type']=='table':body.append(wordtable(b['headers'],b['rows']))
            else:
                body.append(para(b['text']));body.append(para(''));body.append(wordtable(b['rows'][0],b['rows'][1:],True))
    sect='<w:sectPr><w:headerReference w:type="default" r:id="rHeader"/><w:footerReference w:type="default" r:id="rFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1650" w:right="1078" w:bottom="1200" w:left="1078" w:header="550" w:footer="600"/></w:sectPr>'
    styles=f'''<w:styles {NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Archivo" w:hAnsi="Archivo"/><w:sz w:val="21"/><w:color w:val="071D3B"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="110" w:line="285" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults>'''
    for name,size,color,after in [('Normal',21,'071D3B',110),('Title',38,'071D3B',140),('Subtitle',20,'4B6079',200),('Kicker',17,'075EB5',90),('Heading1',24,'075EB5',100),('Note',19,'4B6079',170),('Table',18,'071D3B',50)]:
        styles+=f'<w:style w:type="paragraph" w:styleId="{name}"'+(' w:default="1"' if name=='Normal' else '')+f'><w:name w:val="{name}"/>'+('' if name=='Normal' else '<w:basedOn w:val="Normal"/>')+f'<w:pPr><w:spacing w:after="{after}" w:line="270" w:lineRule="auto"/>'+('<w:keepNext/>' if name in ['Title','Subtitle','Kicker','Heading1'] else '')+'</w:pPr>'+f'<w:rPr><w:sz w:val="{size}"/><w:color w:val="{color}"/>'+('<w:b/>' if name in ['Title','Kicker','Heading1'] else '')+'</w:rPr></w:style>'
    styles+='</w:styles>'
    drawing='''<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="1280160" cy="381600"/><wp:docPr id="1" name="Marca EGD" descr="EGD Consultoria em Tecnologia"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1280160" cy="381600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'''
    header=f'<w:hdr {NS}><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="8" w:color="CCD9E8"/></w:pBdr></w:pPr>{drawing}{run("   Consultoria em Tecnologia")}</w:p></w:hdr>'
    footer=f'<w:ftr {NS}><w:p><w:pPr><w:pStyle w:val="Table"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="8" w:color="CCD9E8"/></w:pBdr></w:pPr>{run(D["site_curto"]+" · "+D["email"]+"   |   ")}<w:fldSimple w:instr="PAGE"/></w:p></w:ftr>'
    relns='http://schemas.openxmlformats.org/package/2006/relationships';rbase='http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
    with zipfile.ZipFile(OUT/'documentos'/f'{doc["slug"]}.docx','w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>'+''.join(f'<Override PartName="/word/{f}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.{ct}+xml"/>' for f,ct in [('document','document.main'),('styles','styles'),('header1','header'),('footer1','footer'),('settings','settings')])+'</Types>')
        z.writestr('_rels/.rels',f'<Relationships xmlns="{relns}"><Relationship Id="rDoc" Type="{rbase}officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr('word/document.xml',f'<?xml version="1.0" encoding="UTF-8"?><w:document {NS}><w:body>'+''.join(body)+sect+'</w:body></w:document>')
        z.writestr('word/styles.xml',styles);z.writestr('word/header1.xml',header);z.writestr('word/footer1.xml',footer)
        z.writestr('word/settings.xml',f'<w:settings {NS}><w:updateFields w:val="true"/></w:settings>')
        z.writestr('word/_rels/document.xml.rels',f'<Relationships xmlns="{relns}">'+''.join(f'<Relationship Id="{i}" Type="{rbase}{typ}" Target="{target}"/>' for i,typ,target in [('rStyle','styles','styles.xml'),('rHeader','header','header1.xml'),('rFooter','footer','footer1.xml'),('rSettings','settings','settings.xml')])+'</Relationships>')
        z.writestr('word/_rels/header1.xml.rels',f'<Relationships xmlns="{relns}"><Relationship Id="rLogo" Type="{rbase}image" Target="media/logo.png"/></Relationships>')
        z.write(OUT/'logos/logo-horizontal.png','word/media/logo.png')

for doc in DOCS:
    sections=[]
    for i,page in enumerate(doc['pages']):
        sections.append(f'<section class="page"><header class="head"><img src="../logos/logo-institucional.svg" alt="EGD Consultoria em Tecnologia"><span>{escape(doc["kind"])}</span></header><main class="content"><div class="kicker">{escape(doc["kind"])}</div><h1>{escape(doc["title"] if i==0 else page["title"])}</h1><p class="subtitle">{escape(doc["subtitle"] if i==0 else doc["title"]+" · continuação")}</p>'+ (f'<div class="section-title">{escape(page["title"])}</div>' if i==0 else '')+''.join(html_block(b) for b in page['blocks'])+f'</main><footer class="foot"><span>{D["site_curto"]} · {D["email"]}</span><span>{i+1:02d} / {len(doc["pages"]):02d}</span></footer></section>')
    (OUT/'documentos'/f'{doc["slug"]}.html').write_text(f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(doc["title"])} · EGD</title><link rel="stylesheet" href="modelos.css"><body><nav class="toolbar"><a href="../index.html">Kit EGD</a><a href="{doc["slug"]}.docx">Editar em Word</a><a href="{doc["slug"]}.pdf">Abrir PDF</a></nav>'+''.join(sections)+'</body></html>')
    (OUT/'documentos'/f'{doc["slug"]}.md').write_text('# '+doc['title']+'\n\n'+doc['subtitle']+'\n\n'+'\n\n'.join('## '+p['title']+'\n\n'+'\n\n'.join(markdown_block(b) for b in p['blocks']) for p in doc['pages'])+'\n')
    make_docx(doc)

font=base64.b64encode((OUT/'fonts/archivo.woff2').read_bytes()).decode()
svgstyle=f'<style>@font-face{{font-family:Archivo;src:url(data:font/woff2;base64,{font});font-weight:100 900}}text{{font-family:Archivo,Arial,sans-serif}}</style>'
def logo(name,x,y,w,h):
    s=(OUT/'logos'/f'{name}.svg').read_text()
    return re.sub(r'<svg ',f'<svg x="{x}" y="{y}" width="{w}" height="{h}" ',s,count=1)
def text(x,y,s,size=24,color='#071D3B',weight=400):return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}">{escape(s)}</text>'
# QR real com margem silenciosa de quatro módulos, destinado ao site institucional.
import qrcode
qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=1,border=4)
qr.add_data(D['site']);qr.make(fit=True);matrix=qr.get_matrix();n=len(matrix)
qrsvg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}"><rect width="{n}" height="{n}" fill="white"/><path fill="#071D3B" d="'+''.join(f'M{x} {y}h1v1h-1z' for y,row in enumerate(matrix) for x,v in enumerate(row) if v)+'"/></svg>'
(OUT/'papelaria/qr-site.svg').write_text(qrsvg)
front=logo('logo-negativo',65,70,360,108)+text(65,229,'CONSULTORIA EM TECNOLOGIA',22,'#F3F6FB',500)+text(65,338,'Tecnologia que transforma.',31,'#F3F6FB',500)+text(65,382,'Soluções que geram valor.',31,'#54B8FF',500)+text(65,450,D['site_curto'],22,'#F3F6FB')+'<path d="M650 -30V140H805V280H930" stroke="#0875E1" stroke-width="7" fill="none"/><circle cx="805" cy="140" r="9" fill="#54B8FF"/>'
back=logo('logo-horizontal',65,48,215,64)+text(65,192,D['nome_contato'],38,'#071D3B',600)+text(65,231,D['cargo'],24,'#075EB5')+'<path d="M65 267H540" stroke="#CCD9E8" stroke-width="2"/>'+text(65,316,D['telefone'],25)+text(65,357,D['email'],24)+text(65,398,D['site_curto'],24)+text(65,449,D['localidade'],20,'#4B6079')+qrsvg.replace('<svg ', '<svg x="637" y="277" width="190" height="190" ',1)
for side,body,bg in [('frente',front,'#071D3B'),('verso',back,'#FFFFFF')]:
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="50mm" viewBox="0 0 900 500" role="img" aria-label="Cartão EGD {side}">{svgstyle}<rect width="900" height="500" fill="{bg}"/>{body}</svg>'
    (OUT/'papelaria'/f'cartao-{side}.svg').write_text(svg)
    bleed=f'<svg xmlns="http://www.w3.org/2000/svg" width="96mm" height="56mm" viewBox="-30 -30 960 560" role="img" aria-label="Cartão EGD {side} com sangria">{svgstyle}<rect x="-30" y="-30" width="960" height="560" fill="{bg}"/>{body}</svg>'
    (OUT/'papelaria'/f'cartao-{side}-sangria.svg').write_text(bleed)
for suffix,w,h in [('',90,50),('-sangria',96,56)]:
    (OUT/'papelaria'/f'cartao-visita{suffix}.html').write_text(f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Cartão EGD</title><style>@page{{size:{w}mm {h}mm;margin:0}}body{{margin:0}}.face{{width:{w}mm;height:{h}mm;break-after:page}}.face:last-child{{break-after:auto}}img{{display:block;width:100%;height:100%}}</style><body>'+''.join(f'<div class="face"><img src="cartao-{s}{suffix}.svg" alt="Cartão {s}"></div>' for s in ['frente','verso'])+'</body></html>')
# Assinatura de e-mail com tabela e estilos inline, sem JavaScript.
signature=f'''<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;color:#071d3b;font-size:13px;line-height:1.5"><tr><td style="vertical-align:top;padding:4px 20px 4px 0;border-right:2px solid #0875e1"><img src="../logos/logo-horizontal.png" width="126" height="38" alt="EGD" style="display:block;border:0"></td><td style="padding-left:20px"><strong style="font-size:18px">{escape(D['nome_contato'])}</strong><br><span style="color:#075eb5">{D['cargo']}</span><br><span>{D['marca']}</span><br><a href="tel:{D['telefone_uri']}" style="color:#071d3b;text-decoration:none">{D['telefone']}</a><br><a href="mailto:{D['email']}" style="color:#075eb5">{D['email']}</a><br><a href="{D['site']}" style="color:#075eb5">{D['site_curto']}</a> · <a href="{D['linkedin']}" style="color:#075eb5">LinkedIn</a></td></tr></table>'''
(OUT/'papelaria/assinatura-email.html').write_text('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Assinatura EGD</title><body style="background:white;padding:24px">'+signature+'</body></html>')
(OUT/'papelaria/assinatura-email.txt').write_text('\n'.join([D['nome_contato'],D['cargo'],D['marca'],D['telefone'],D['email'],D['site'],D['linkedin']])+'\n')
(OUT/'papelaria/contato-egd.vcf').write_text('BEGIN:VCARD\nVERSION:3.0\nN:Diniz;Eugênio;G.;;\nFN:'+D['nome_contato']+'\nORG:'+D['marca']+'\nTITLE:'+D['cargo']+'\nTEL;TYPE=WORK,VOICE:'+D['telefone_uri']+'\nEMAIL;TYPE=WORK:'+D['email']+'\nURL:'+D['site']+'\nEND:VCARD\n')
(OUT/'manifest.json').write_text(json.dumps({'documents':[{k:v for k,v in doc.items() if k!='pages'}|{'pages':len(doc['pages'])} for doc in DOCS],'card':{'trim_mm':[90,50],'bleed_mm':3,'qr_url':D['site']},'data_origin':D['origem']},ensure_ascii=False,indent=2)+'\n')
links=''.join(f'<article><span>{i+1:02d}</span><h3>{escape(doc["title"])}</h3><p>{escape(doc["subtitle"])}</p><div><a href="documentos/{doc["slug"]}.pdf">PDF</a><a href="documentos/{doc["slug"]}.docx">Word editável</a><a href="documentos/{doc["slug"]}.html">Visualizar</a></div></article>' for i,doc in enumerate(DOCS))
(OUT/'index.html').write_text('''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EGD · Kit comercial e papelaria</title><style>@font-face{font-family:Archivo;src:url('fonts/archivo.woff2');font-weight:100 900}*{box-sizing:border-box}body{margin:0;font-family:Archivo,Arial,sans-serif;color:#071d3b;background:#f3f6fb}main{max-width:1120px;margin:auto;padding:56px 32px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccd9e8;padding-bottom:24px}header img{width:280px}header span{font-size:12px;color:#4b6079}h1{font-size:60px;line-height:1.05;letter-spacing:-2px;font-weight:500;max-width:750px;margin:64px 0 24px}h1 em{font-style:normal;color:#075eb5}p{line-height:1.6;color:#4b6079}.lead{font-size:18px;max-width:700px;margin-bottom:44px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}article{background:#fff;border:1px solid #ccd9e8;padding:24px}article span{font-size:12px;color:#075eb5}h3{font-size:22px;line-height:1.2;font-weight:500}article p{font-size:14px;min-height:45px}article div{display:flex;gap:16px;flex-wrap:wrap}a{color:#075eb5;font-size:14px;text-underline-offset:4px}h2{font-size:34px;font-weight:500;margin-top:64px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:24px}.cards img{width:100%;border:1px solid #ccd9e8}.links{display:flex;gap:24px;flex-wrap:wrap;padding:24px 0}.note{border-top:1px solid #ccd9e8;padding-top:24px;margin-top:30px;font-size:13px}@media(max-width:760px){main{padding:28px 20px}header{align-items:start;gap:16px}header img{width:200px}h1{font-size:42px}.grid,.cards{grid-template-columns:1fr}}</style><body><main><header><img src="logos/logo-institucional.svg" alt="EGD Consultoria em Tecnologia"><span>Kit comercial · edição 2026</span></header><h1>Uma marca.<br>Da primeira conversa<br>à <em>próxima entrega.</em></h1><p class="lead">Documentos, identidade e papelaria para apresentar a EGD, organizar o projeto e formalizar cada etapa.</p><div class="grid">'''+links+'''</div><h2>Cartão de visita</h2><div class="cards"><img src="papelaria/cartao-frente.svg" alt="Frente do cartão"><img src="papelaria/cartao-verso.svg" alt="Verso do cartão"></div><div class="links"><a href="papelaria/cartao-visita.pdf">PDF · 90 × 50 mm</a><a href="papelaria/cartao-visita-sangria.pdf">PDF com sangria · 96 × 56 mm</a><a href="papelaria/contato-egd.vcf">Salvar contato</a></div><h2>Marca e comunicação</h2><div class="links"><a href="logos/logo-institucional.svg">Logo institucional · SVG</a><a href="logos/logo-institucional.png">Logo institucional · PNG</a><a href="logos/prancha-logos.pdf">Prancha de logos · PDF</a><a href="papelaria/assinatura-email.html">Assinatura de e-mail</a><a href="papelaria/papel-timbrado-limpo.pdf">Papel timbrado em branco</a><a href="manual-da-marca.pdf">Manual da marca</a></div><p class="note">Modelos locais e editáveis. Campos entre colchetes exigem preenchimento; minutas contratuais exigem adequação ao negócio e revisão jurídica antes da assinatura. Consulte LEIA-ME.md para edição, impressão e instalação da assinatura.</p></main></body></html>''')
(OUT/'LEIA-ME.md').write_text(f'''# EGD · Kit comercial e papelaria

## Conteúdo

- Contrato de prestação de serviços: 6 páginas, incluindo anexos de escopo/investimento e tratamento de dados.
- Proposta comercial: 3 páginas.
- Acordo de confidencialidade mútuo: 2 páginas.
- Termo aditivo, termo de entrega/aceite e papel timbrado: 1 página cada.
- Documentos em DOCX nativo editável, PDF, HTML e Markdown. PDFs são a referência visual; o Word pode repaginar conforme as fontes e o aplicativo.
- Logo em SVG e PNG, prancha em PDF e manual da marca.
- Cartão frente/verso em SVG editável, PNG e PDF, com versões de corte e sangria.
- Assinatura de e-mail em HTML e texto; contato em vCard; QR que aponta para {D['site']}.

Abra `index.html` para navegar pelo kit. Nenhum material foi publicado ou enviado a terceiros.

## Preencher e adaptar

O nome EGD é usado como marca, sem presumir razão social. Razão social, CNPJ, endereço, poderes de representação, dados do cliente, valores, prazos, foro e regime de direitos permanecem entre colchetes. Não usar CNPJs fictícios de mockups do projeto. Preencher ou marcar expressamente como não aplicável; retirar as notas de minuta apenas após revisão. Proposta e contrato não estão assinados.

As cláusulas são uma base de trabalho, não parecer jurídico. Validar a aplicação ao negócio com profissional habilitado antes da assinatura, em especial direitos sobre software, rescisão, dados pessoais e condições comerciais. Os anexos são parte do contrato e devem ser preenchidos junto com ele.

## Edição

Editar DOCX em Word ou editor compatível. O conteúdo é texto e tabelas nativos, não uma imagem. A tipografia indicada é Archivo; a versão WOFF2 e licença incluídas atendem aos HTMLs e SVGs. Para Word, instalar a família Archivo em formato de desktop a partir da fonte oficial indicada no manual, ou revisar a paginação com a fonte substituta. Os PDFs já incorporam as fontes usadas na exportação.

Para regenerar: dados em `docs/brand/templates/dados-comerciais.json`; textos em `docs/brand/templates/documentos.py`; executar `node scripts/build-brand-kit.mjs` na raiz do projeto. O script gera e verifica os PDFs, imagens e pacote ZIP. Não grava dados no CRM nem publica arquivos.

## Cartão e gráfica

Tamanho final: **90 × 50 mm**. Arquivo com sangria: **96 × 56 mm**, com 3 mm adicionais em cada lado; cortar 3 mm para obter o formato final. Conteúdo essencial está afastado pelo menos 4 mm da linha de corte. PDF tem duas páginas: frente e verso. Solicitar prova para orientação do verso antes de imprimir em lote. Não imprimir a prancha como arte de corte.

Os arquivos usam RGB/sRGB, sem perfil CMYK específico, certificação PDF/X ou marcas de corte. A gráfica deve aplicar o perfil adequado e confirmar acabamento, conversão de cor e imposição. Não reduzir o QR nem remover sua margem branca. PNGs do cartão são exportados com pelo menos 300 ppi equivalentes; os SVGs preservam vetores.

## Assinatura de e-mail

Abra `papelaria/assinatura-email.html`, copie o bloco visual e cole no editor de assinatura do seu provedor. **Insira `logos/logo-horizontal.png` como imagem pelo próprio editor de e-mail**: o caminho relativo do HTML é para prévia local e não funciona sozinho na mensagem recebida. Também é possível substituir o caminho por uma URL HTTPS pública após publicar o logo. Faça um envio de teste por conta própria. A versão `.txt` funciona sem imagens. O kit não envia mensagens nem instala a assinatura na conta.

## Dados usados

{D['origem']}

## Referências jurídicas consultadas

Consultadas em 27/09/2026 como apoio à redação da minuta, sem transcrição extensa:

- [Código Civil — Lei 10.406/2002](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm): disciplina contratual e prestação de serviços.
- [Lei do Software — Lei 9.609/1998](https://www.planalto.gov.br/ccivil_03/leis/l9609.htm): direitos sobre programas e licenciamento.
- [LGPD — Lei 13.709/2018](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm): tratamento, papéis e segurança de dados pessoais.
''')
print(f'{len(DOCS)} modelos, logos e papelaria gerados.')
