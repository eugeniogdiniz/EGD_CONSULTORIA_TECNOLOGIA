/**
 * Envia as URLs do sitemap de produção ao IndexNow (Bing, Copilot, ChatGPT, DuckDuckGo).
 * Uso: `npm run seo:indexnow` (lê INDEXNOW_KEY do .env; SITE_URL opcional, padrão produção).
 * Rode depois de cada deploy que publique página nova ou texto revisado.
 */
import { INDEXNOW_ENDPOINT, indexNowPayload, sitemapUrls } from "../src/lib/indexnow";

const siteUrl = process.env.SITE_URL ?? "https://egdsystem.com.br";
const key = process.env.INDEXNOW_KEY;
if (!key) {
  console.error("INDEXNOW_KEY não definida (gere uma chave de 32 caracteres hexadecimais e coloque no .env e no Coolify).");
  process.exit(1);
}

const xml = await (await fetch(`${siteUrl}/sitemap.xml`)).text();
const urls = sitemapUrls(xml);
const payload = indexNowPayload({ siteUrl, key, urls });

const keyCheck = await fetch(payload.keyLocation);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== key) {
  console.error(`A chave não está publicada em ${payload.keyLocation} (HTTP ${keyCheck.status}). Confira INDEXNOW_KEY no servidor.`);
  process.exit(1);
}

const res = await fetch(INDEXNOW_ENDPOINT, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(payload) });
// 200 = ok; 202 = aceito, chave será validada depois
console.log(`IndexNow: ${res.status} ${res.statusText} para ${payload.urlList.length} URLs de ${payload.host}`);
process.exit(res.ok ? 0 : 1);
