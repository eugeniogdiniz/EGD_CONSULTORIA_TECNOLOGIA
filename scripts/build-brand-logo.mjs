/** Exporta vetores da mesma geometria usada pelos componentes React. */
import { readFile, writeFile } from 'node:fs/promises';
const brand=JSON.parse(await readFile('src/content/brand.json','utf8'));
const font=(await readFile('public/brand/fonts/archivo.woff2')).toString('base64');
const symbol=(a,b)=>`<path d="${brand.symbolUpper}" fill="${a}"/><path d="${brand.symbolLower}" fill="${b}"/>`;
const wordmark=(color)=>`<g transform="translate(57 8) scale(1.5)" fill="${color}">${brand.wordmark.map(d=>`<path d="${d}" fill-rule="evenodd"/>`).join('')}</g>`;
const svg=(viewBox,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${brand.name}">${body}</svg>\n`;
for(const [filename,a,b] of [['logo-horizontal',brand.blue,brand.ink],['logo-negativo',brand.sky,brand.paper],['logo-monocromatico',brand.ink,brand.ink],['logo-branco','#FFFFFF','#FFFFFF']]) await writeFile(`public/brand/${filename}.svg`,svg('0 0 376 112',symbol(a,b)+wordmark(b)));
await writeFile('public/brand/simbolo.svg',svg('-12 -6 124 124',symbol(brand.blue,brand.ink)));
await writeFile('public/brand/simbolo-negativo.svg',svg('-12 -6 124 124',symbol(brand.sky,brand.paper)));
const institutional=symbol(brand.blue,brand.ink)+wordmark(brand.ink)+`<style>@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}text{font-family:Archivo,sans-serif}</style><path d="M410 24V90" stroke="${brand.ink}" stroke-width="2"/><g fill="${brand.ink}" font-size="27" font-weight="500"><text x="442" y="48">CONSULTORIA</text><text x="442" y="82">EM TECNOLOGIA</text></g>`;
await writeFile('public/brand/logo-institucional.svg',svg('0 0 720 112',institutional));
console.log('7 vetores EGD exportados de src/content/brand.json');
