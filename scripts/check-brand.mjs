/** Verificação visual e funcional do rebranding. Requer servidor em BRAND_BASE_URL. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const base = process.env.BRAND_BASE_URL || 'http://127.0.0.1:3000';
await mkdir('docs/brand/screenshots', {recursive:true});
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
const manualOnly=process.argv.includes('--manual-only');
const results=manualOnly ? JSON.parse(await readFile('docs/brand/validacao.json','utf8').catch(error=>{if(error.code==='ENOENT')return '[]';throw error;})).filter(r=>!r.manual) : [];
const brandURL=filename=>manualOnly ? pathToFileURL(path.resolve('public/brand',filename)).href : `${base}/brand/${filename}`;
async function checkAssets(page) {
 await page.evaluate(()=>document.fonts.ready);
 assert.ok(await page.evaluate(()=>document.fonts.check('500 16px Archivo')), 'Archivo carregada');
 assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(img=>!img.complete || !img.naturalWidth).map(img=>img.getAttribute('src'))), [], 'imagens carregadas');
}
async function checkFilm(page, file) {
 const video=page.locator('video');
 assert.equal(await video.getAttribute('preload'),'none');
 assert.equal(await video.getAttribute('autoplay'),null);
 assert.ok((await video.locator('source').getAttribute('src')).endsWith(file));
 await video.evaluate(async v=>{v.muted=true;await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo excedido ao carregar vídeo')),15000))]);});
 await page.waitForTimeout(700);
 assert.ok(await video.evaluate(v=>v.currentTime>0 && v.videoWidth===1280 && v.videoHeight===720),'reprodução de vídeo');
 await page.waitForFunction(()=>document.querySelector('video track').readyState===2);
 await video.evaluate(v=>v.pause());
 await page.getByText('Ler transcrição do vídeo',{exact:true}).click();
 assert.ok(await page.locator('.brand-film details p').isVisible());
}
try {
 if(!manualOnly) for (const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
  page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(30000);
  for(const route of ['/','/servicos','/produtos','/cases','/sobre','/contato','/entrar']) {
   const errors=[]; const handler=error=>errors.push(error.message); page.on('pageerror',handler);
   const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:120000});
   assert.equal(response.status(),200,`${route}: HTTP ${response.status()}`);
   assert.ok(await page.locator('h1').first().isVisible(),`${route}: h1 visível`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
   assert.equal(overflow,false,`${route}: overflow em ${width}px`);
   assert.deepEqual(errors,[],`${route}: erros JS`);
   if(route==='/' || route==='/entrar') await page.screenshot({path:`docs/brand/screenshots/${route==='/'?'inicio':'entrar'}-${width}.png`,fullPage:true});
   console.log(`Página OK: ${route} @ ${width}`);
   results.push({route,width,status:response.status(),overflow,errors});
   page.off('pageerror',handler);
  }
  await page.goto(base,{waitUntil:'networkidle'});
  console.log(`Interações: ${width}`);
  if(width===390){const menu=page.locator('.burger');await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');await page.locator('#menu-mobile').getByRole('link',{name:'Serviços',exact:true}).click();await page.waitForURL('**/servicos');assert.equal(await page.locator('#menu-mobile').isVisible(),false);await page.goto(base,{waitUntil:'networkidle'});}
  await page.getByRole('tab',{name:'02 Conectar'}).click();assert.ok(await page.getByRole('tabpanel').getByText('Uma arquitetura com propósito').isVisible());
  await page.getByRole('tab',{name:'02 Conectar'}).press('ArrowRight');assert.ok(await page.getByRole('tabpanel').getByText('Da validação à operação').isVisible());
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.route-progress').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.getByRole('tab',{name:'01 Entender'}).click();
  assert.equal(await page.locator('.route-progress').evaluate(e=>getComputedStyle(e).strokeDashoffset),'0.75px');
  console.log(`Vídeo: ${width}`);
  await checkFilm(page,'egd-apresentacao.webm');
  await page.goto(`${base}/sobre`,{waitUntil:'networkidle'});
  await checkFilm(page,'egd-assinatura.webm');
  await page.locator('.brand-film').screenshot({path:`docs/brand/screenshots/filme-assinatura-${width}.png`});
  results.push({width,menu:'ok',tabs:'ok',reducedMotion:'ok',video:'ok',signatureVideo:'ok',captions:'ok',transcripts:'ok',validatedAt:new Date().toISOString()});
  await page.close();
 }
 await writeFile('docs/brand/validacao.json',JSON.stringify(results,null,2)+'\n');
 console.log("Manual PDF");
 const board=await browser.newPage({viewport:{width:1600,height:1060},deviceScaleFactor:1});
 await board.goto(brandURL('logo-apresentacao.html'),{waitUntil:'networkidle'});
 await checkAssets(board);
 await board.screenshot({path:'public/brand/logo-apresentacao.png'});
 await board.close();
 const manual=await browser.newPage();
 await manual.goto(brandURL('manual-da-marca.html'),{waitUntil:'networkidle'});
 await checkAssets(manual);
 assert.equal(await manual.locator('.page').count(),8);
 await manual.emulateMedia({media:'print'});
 const overflow=await manual.locator('.page').evaluateAll(pages=>pages.map((p,i)=>({page:i+1,overflow:p.scrollHeight>1124})).filter(p=>p.overflow));
 assert.deepEqual(overflow,[],'manual: conteúdo excede página A4');
 const footGaps=await manual.locator('.page').evaluateAll(pages=>pages.map((p,i)=>{
  const foot=p.querySelector('.foot');
  const bottom=Math.max(...[...p.children].filter(child=>child!==foot).map(child=>child.getBoundingClientRect().bottom));
  return {page:i+1,footGap:Math.round(foot.getBoundingClientRect().top-bottom)};
 }));
 assert.ok(footGaps.every(page=>page.footGap>=16), `manual: conteúdo próximo ao rodapé ${JSON.stringify(footGaps)}`);
 await manual.pdf({path:'public/brand/manual-da-marca.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});
 await manual.locator('.page').first().screenshot({path:'docs/brand/screenshots/manual-capa.png'});
 for(const number of [2,3,4,5,6,7,8]) await manual.locator('.page').nth(number-1).screenshot({path:`docs/brand/screenshots/manual-${number}.png`});
 await manual.emulateMedia({media:'screen'});
 for(const width of [390,768,1440]) {
  await manual.setViewportSize({width,height:1000});
  assert.equal(await manual.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`manual: overflow horizontal em ${width}px`);
 }
 results.push({manual:'8 páginas, PDF exportado',validatedAt:new Date().toISOString(),assets:'ok',footGaps,responsiveWidths:[390,768,1440]});
 await writeFile('docs/brand/validacao.json',JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
