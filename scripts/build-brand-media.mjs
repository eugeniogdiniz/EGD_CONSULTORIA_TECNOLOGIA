/** Recria os formatos web e filmes EGD a partir das imagens aprovadas.
 * npm ci && node scripts/build-brand-media.mjs
 * Requer Google Chrome local ou CHROME_PATH. Não usa APIs ou serviços externos.
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/brand');
await mkdir(path.join(root, 'video'), { recursive: true });
for (const name of ['territorio', 'fluxo']) {
  await sharp(path.join(root, `images/${name}-original.png`)).webp({ quality: 84 }).toFile(path.join(root, `images/${name}-azul.webp`));
}
await sharp(path.join(root, 'simbolo.svg')).resize(180, 180).flatten({background:'#F3F6FB'}).png().toFile(path.join(root, 'apple-touch-icon.png'));
await sharp(path.join(root, 'logo-horizontal.svg')).resize({width:1504}).png().toFile(path.join(root, 'logo-horizontal.png'));
await sharp(path.join(root, 'simbolo.svg')).resize(512,512).png().toFile(path.join(root, 'simbolo.png'));
await sharp(path.join(root, 'logo-negativo.svg')).resize({width:1504}).png().toFile(path.join(root, 'logo-negativo.png'));
const hero = `data:image/webp;base64,${(await readFile(path.join(root, 'images/territorio-azul.webp'))).toString('base64')}`;
const flow = `data:image/webp;base64,${(await readFile(path.join(root, 'images/fluxo-azul.webp'))).toString('base64')}`;
const logo = `data:image/svg+xml;base64,${(await readFile(path.join(root, 'logo-horizontal.svg'))).toString('base64')}`;
const font = `data:font/woff2;base64,${(await readFile(path.join(root, 'fonts/archivo.woff2'))).toString('base64')}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.setContent('<html lang="pt-BR"><body style="margin:0"><canvas width="1280" height="720"></canvas></body></html>');
  const frames = await page.evaluate(async ({hero, flow, logo, font}) => {
    const face = new FontFace("Archivo", `url(${font})`, {weight:"100 900"});
    await face.load(); document.fonts.add(face);
    const load = (src) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
    const [territory, workflow, brand] = await Promise.all([load(hero), load(flow), load(logo)]);
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const ink = '#071d3b', signal = '#0875e1', paper = '#f3f6fb';
    function text(value, x, y, size, color=ink, weight=500) { ctx.fillStyle=color; ctx.font=`${weight} ${size}px Archivo`; ctx.fillText(value,x,y); }
    function cover(img, x, y, w, h, zoom=1) { ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip(); const scale=Math.max(w/img.width,h/img.height)*zoom; ctx.drawImage(img,x+(w-img.width*scale)/2,y+(h-img.height*scale)/2,img.width*scale,img.height*scale); ctx.restore(); }
    function render(time, variant='presentation') {
      ctx.fillStyle=paper; ctx.fillRect(0,0,1280,720);
      if (variant==='signature') {
        ctx.drawImage(brand,80,80,240,71.5);
        text('Do projeto',80,305,74); text('à operação.',80,391,74);
        cover(workflow,650,0,630,720,1+time*.002);
        ctx.strokeStyle=signal; ctx.lineWidth=8; ctx.beginPath();ctx.moveTo(80,460);ctx.lineTo(80+Math.min(time/4,1)*480,460);ctx.stroke();
        text('EGD Consultoria em Tecnologia',80,590,23); text('egdsystem.com.br',80,630,20,'#4b6079');
        return;
      }
      const scene = time < 4 ? 0 : time < 8 ? 1 : time < 12 ? 2 : 3;
      ctx.drawImage(brand,64,52,200,59.6);
      text('Consultoria em Tecnologia',64,129,18,'#4b6079');
      if(scene===0) {
        cover(territory,640,0,640,720,1+time*.006);
        text('Entre o desafio',64,305,56); text('e a próxima',64,375,56); text('entrega.',64,445,56,'#075eb5');
        text('Tecnologia que conecta.',64,597,23);
      } else if(scene===1) {
        cover(workflow,640,0,640,720,1+(time-4)*.005);
        text('Entender.',64,293,61); text('Conectar.',64,365,61,'#075eb5');
        text('Dados, sistemas e pessoas.',64,460,27); text('Contexto antes do código.',64,505,24,'#4b6079');
      } else if(scene===2) {
        cover(territory,640,0,640,720,1.05+(time-8)*.005);
        text('Entregar.',64,325,70);text('Tecnologia para',64,420,35); text('a operação.',64,469,35);text('Do primeiro passo à produção.',64,594,24,'#4b6079');
      } else {
        ctx.fillStyle=ink;ctx.fillRect(0,0,1280,720);ctx.fillStyle=signal;ctx.fillRect(64,70,14,14);
        text('EGD',99,94,38,paper,600); text('Vamos construir',64,320,80,paper);text('juntos.',64,414,80,paper);text('egdsystem.com.br',64,583,30,'#f3f6fb');
      }
      ctx.fillStyle=signal;ctx.fillRect(0,712,1280*Math.min(time/15,1),8);
    }
    window.renderBrand=render;
    render(0);
    return canvas.toDataURL('image/png');
  }, { hero, flow, logo, font });
  await sharp(Buffer.from(frames.split(',')[1], 'base64')).webp({ quality: 85 }).toFile(path.join(root, 'video/apresentacao-poster.webp'));
  await sharp(Buffer.from(frames.split(',')[1], 'base64')).resize(1200, 630, {fit:'cover'}).png().toFile(path.join(root, 'social-cover.png'));
  const signaturePoster = await page.evaluate(() => {
    window.renderBrand(4, 'signature');
    return document.querySelector('canvas').toDataURL('image/png');
  });
  await sharp(Buffer.from(signaturePoster.split(',')[1], 'base64')).webp({ quality: 85 }).toFile(path.join(root, 'video/assinatura-poster.webp'));
  for (const [variant, duration, filename] of [['presentation',15,'egd-apresentacao'],['signature',8,'egd-assinatura']]) {
    const video = await page.evaluate(async ({variant, duration}) => {
      const canvas=document.querySelector('canvas');
      const stream=canvas.captureStream(30);
      const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(type=>MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('Chrome não suporta gravação WebM');
      const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2400000});
      const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const finished=new Promise(resolve=>{recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer());let binary=''; for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));resolve(btoa(binary));};});
      window.renderBrand(0,variant);
      recorder.start();const start=performance.now();
      await new Promise(resolve=>{function tick(now){const elapsed=(now-start)/1000;window.renderBrand(Math.min(elapsed,duration),variant);if(elapsed<duration)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
      recorder.stop(); const result=await finished; stream.getTracks().forEach(track=>track.stop()); return result;
    }, {variant,duration});
    await writeFile(path.join(root, `video/${filename}.webm`),Buffer.from(video,'base64'));
    console.log(`Gerado: ${filename}.webm (${duration}s)`);
  }
} finally { await browser.close(); }
