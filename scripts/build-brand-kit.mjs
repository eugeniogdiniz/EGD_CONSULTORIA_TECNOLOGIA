/** Gera e valida o kit local EGD; não publica nem envia documentos. */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

execFileSync('python3',['scripts/build-brand-kit.py'],{stdio:'inherit'});
const root=path.resolve('docs/brand/kit-comercial');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const url=file=>pathToFileURL(path.join(root,file)).href;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true});
const report={validatedAt:new Date().toISOString(),documents:[],card:{},logos:[],docx:'native OOXML; structure and text checked separately; Word pagination not rendered'};
async function ready(page){
 await page.evaluate(()=>document.fonts.ready);
 assert.deepEqual(await page.locator('img').evaluateAll(imgs=>imgs.filter(img=>!img.complete||!img.naturalWidth).map(img=>img.getAttribute('src'))),[],'imagens carregadas');
}
try{
 const page=await browser.newPage({viewport:{width:1200,height:1300},deviceScaleFactor:1});
 for(const doc of manifest.documents){
  await page.goto(url(`documentos/${doc.slug}.html`),{waitUntil:'networkidle'});await ready(page);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.page').count(),doc.pages);
  const metrics=await page.locator('.page').evaluateAll(pages=>pages.map((p,i)=>({page:i+1,gap:Math.round(p.querySelector('.foot').getBoundingClientRect().top-p.querySelector('.content').getBoundingClientRect().bottom),overflow:p.scrollHeight>p.clientHeight+1})));
  console.log(doc.slug,JSON.stringify(metrics));
  assert.ok(metrics.every(p=>p.gap>=15&&!p.overflow),`Conteúdo excede a página: ${doc.slug}`);
  await page.pdf({path:path.join(root,`documentos/${doc.slug}.pdf`),printBackground:true,preferCSSPageSize:true,tagged:true});
  await page.locator('.page').first().screenshot({path:path.join(root,`previews/${doc.slug}.png`)});
  await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${doc.slug}: overflow mobile`);
  await page.setViewportSize({width:1200,height:1300});
  report.documents.push({file:doc.slug,pages:doc.pages,metrics,mobile:'ok'});
 }
 // Papel limpo com cabeçalho e rodapé, para correspondência e impressão.
 let blank=await readFile(path.join(root,'documentos/papel-timbrado.html'),'utf8');
 blank=blank.replace(/<main class="content">[\s\S]*?<\/main>/,'<main class="content"></main>').replace('href="modelos.css"','href="../documentos/modelos.css"').replace(/<nav class="toolbar">[\s\S]*?<\/nav>/,'');
 await writeFile(path.join(root,'papelaria/papel-timbrado-limpo.html'),blank);
 await page.goto(url('papelaria/papel-timbrado-limpo.html'),{waitUntil:'networkidle'});await ready(page);
 await page.pdf({path:path.join(root,'papelaria/papel-timbrado-limpo.pdf'),printBackground:true,preferCSSPageSize:true});
 for(const suffix of ['','-sangria']){
  await page.goto(url(`papelaria/cartao-visita${suffix}.html`),{waitUntil:'networkidle'});await ready(page);
  await page.pdf({path:path.join(root,`papelaria/cartao-visita${suffix}.pdf`),printBackground:true,preferCSSPageSize:true});
 }
 for(const side of ['frente','verso']){
  await page.goto(url(`papelaria/cartao-${side}.svg`),{waitUntil:'networkidle'});
  await page.evaluate(()=>{document.documentElement.style.width='1080px';document.documentElement.style.height='600px';});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(root,`papelaria/cartao-${side}.png`),clip:{x:0,y:0,width:1080,height:600}});
 }
 for(const name of ['logo-institucional','logo-horizontal','logo-negativo','logo-monocromatico','logo-branco','simbolo','simbolo-negativo']){
  const wide=name==='logo-institucional'?2880:name.startsWith('simbolo')?1024:1504;
  const high=name==='logo-institucional'?448:name.startsWith('simbolo')?1024:448;
  await page.setViewportSize({width:wide,height:high});
  await page.goto(url(`logos/${name}.svg`),{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(root,`logos/${name}.png`),omitBackground:true});
  report.logos.push({file:name,width:wide,height:high});
 }
 const board=await readFile(path.resolve('public/brand/logo-apresentacao.html'),'utf8');
 await writeFile(path.join(root,'logos/prancha-logos.html'),board.replace('url(fonts/','url(../fonts/').replace('</style>','@page{size:400mm 265mm;margin:0}@media print{.board{width:400mm;height:265mm;padding:16mm 20mm}.feature{height:80mm}.feature img{width:290mm}.pillars{margin-bottom:14mm}.variant{height:58mm}.foot{margin-top:12mm}}</style>'));
 await page.goto(url('logos/prancha-logos.html'),{waitUntil:'networkidle'});await ready(page);
 await page.pdf({path:path.join(root,'logos/prancha-logos.pdf'),printBackground:true,preferCSSPageSize:true});
 await page.setViewportSize({width:1200,height:1000});
 await page.goto(url('index.html'),{waitUntil:'networkidle'});await ready(page);
 await page.screenshot({path:path.join(root,'previews/kit-completo.png'),fullPage:true});
 await page.setViewportSize({width:390,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'índice mobile');
 await page.goto(url('papelaria/assinatura-email.html'),{waitUntil:'networkidle'});await ready(page);
 await page.setViewportSize({width:640,height:300});
 await page.screenshot({path:path.join(root,'previews/assinatura-email.png')});
 report.card={trimMm:[90,50],bleedMm:3,pngPixels:[1080,600],equivalentPPI:304.8,qrDestination:manifest.card.qr_url};
 await writeFile(path.join(root,'validacao.json'),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
execFileSync('python3',['scripts/build-brand-kit.py','--package'],{stdio:'inherit'});
console.log('Kit comercial pronto em docs/brand/kit-comercial/');
