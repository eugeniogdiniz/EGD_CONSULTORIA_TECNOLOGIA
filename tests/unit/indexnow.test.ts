import { describe, expect, it } from "vitest";
import { indexNowPayload, keyFileName, keyLocation, sitemapUrls } from "@/lib/indexnow";

describe("IndexNow", () => {
  const site = "https://egdsystem.com.br";
  it("a chave é servida em /indexnow/<chave>.txt", () => {
    expect(keyFileName("abc123")).toBe("abc123.txt");
    expect(keyLocation(`${site}/`, "abc123")).toBe(`${site}/indexnow/abc123.txt`);
  });
  it("lê as URLs do sitemap na ordem", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>${site}/</loc></url><url><loc> ${site}/para </loc><lastmod>2026-10-10</lastmod></url></urlset>`;
    expect(sitemapUrls(xml)).toEqual([`${site}/`, `${site}/para`]);
  });
  it("monta o corpo do envio só com URLs do próprio host", () => {
    const p = indexNowPayload({ siteUrl: site, key: "k1", urls: [`${site}/`, "https://outro.com/x", `${site}/artigos`] });
    expect(p).toEqual({ host: "egdsystem.com.br", key: "k1", keyLocation: `${site}/indexnow/k1.txt`, urlList: [`${site}/`, `${site}/artigos`] });
  });
});
