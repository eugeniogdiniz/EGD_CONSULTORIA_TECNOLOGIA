/**
 * IndexNow (indexnow.org): avisa o Bing (e quem compartilha o índice dele: ChatGPT, Copilot,
 * DuckDuckGo, Yandex) que uma URL mudou, em vez de esperar o rastreio. Precisa de uma chave
 * publicada em um arquivo do próprio site; aqui ela fica em /indexnow/<chave>.txt.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export const keyFileName = (key: string) => `${key}.txt`;

export const keyLocation = (siteUrl: string, key: string) => `${siteUrl.replace(/\/$/, "")}/indexnow/${keyFileName(key)}`;

/** URLs de um sitemap XML, na ordem em que aparecem. */
export const sitemapUrls = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

/** Corpo do POST para a API (até 10.000 URLs por envio). */
export function indexNowPayload({ siteUrl, key, urls }: { siteUrl: string; key: string; urls: string[] }) {
  const host = new URL(siteUrl).host;
  const own = urls.filter((u) => new URL(u).host === host);
  return { host, key, keyLocation: keyLocation(siteUrl, key), urlList: own.slice(0, 10_000) };
}
