import { existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { ARTICLES } from "@/content/artigos";
import { CONSORCIOS } from "@/content/consorcios";
import { FAQ } from "@/content/faq";
import { PRODUCTS_FULL, SERVICES } from "@/content/legacy-pages";
import { PRODUCT_DETAILS } from "@/content/produtos-detalhe";
import { PUBLICOS, PUBLICOS_LINKS } from "@/content/publicos";
import { SERVICE_DETAILS } from "@/content/servicos-detalhe";
import { articleJsonLd, productJsonLd, serviceJsonLd } from "@/content/seo";
import { FOOTER_COLUMNS, NAV_LINKS, SITE } from "@/content/site";
import sitemap from "@/app/sitemap";

const allFaq = [...Object.values(FAQ).flat(), ...PRODUCT_DETAILS.flatMap((p) => p.faq), ...SERVICE_DETAILS.flatMap((s) => s.faq), ...CONSORCIOS.faq, ...PUBLICOS.flatMap((p) => p.faq)];

describe("páginas próprias de produtos e serviços", () => {
  it("todo produto e toda frente têm página própria, e nenhuma página aponta para id inexistente", () => {
    expect(PRODUCT_DETAILS.map((p) => p.id).sort()).toEqual(PRODUCTS_FULL.map((p) => p.id).sort());
    expect(SERVICE_DETAILS.map((s) => s.id).sort()).toEqual(SERVICES.map((s) => s.id).sort());
  });
  it("título e descrição cabem no resultado de busca", () => {
    for (const d of [...PRODUCT_DETAILS, ...SERVICE_DETAILS]) {
      expect(`${d.metaTitle} · EGD`.length, d.id).toBeLessThanOrEqual(70);
      expect(d.metaDescription.length, d.id).toBeGreaterThanOrEqual(70);
      expect(d.metaDescription.length, d.id).toBeLessThanOrEqual(180);
      expect(d.definition.length, d.id).toBeGreaterThan(80);
    }
  });
  it("artigo relacionado existe", () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const d of [...PRODUCT_DETAILS, ...SERVICE_DETAILS]) if (d.article) expect(slugs.has(d.article), d.id).toBe(true);
  });
  it("JSON-LD de produto e serviço apontam para a página própria", () => {
    expect(productJsonLd(PRODUCTS_FULL[0]).url).toBe(`${SITE.url}/produtos/${PRODUCTS_FULL[0].id}`);
    expect(serviceJsonLd(SERVICES[0]).url).toBe(`${SITE.url}/servicos/${SERVICES[0].id}`);
    expect(serviceJsonLd(SERVICES[0], { standalone: true })["@context"]).toBe("https://schema.org");
    expect(serviceJsonLd(SERVICES[0])).not.toHaveProperty("@context");
  });
});

describe("perguntas frequentes de todo o site", () => {
  it("nenhuma pergunta se repete entre páginas e toda resposta é um trecho curto que termina com ponto", () => {
    expect(new Set(allFaq.map((f) => f.q)).size).toBe(allFaq.length);
    for (const f of allFaq) {
      expect(f.q.endsWith("?"), f.q).toBe(true);
      expect(f.a.trim().endsWith("."), f.q).toBe(true);
      expect(f.a.length, f.q).toBeLessThanOrEqual(520);
    }
  });
});

describe("artigos", () => {
  it("slugs únicos, datas absolutas e modelo para baixar existente em public/", () => {
    expect(new Set(ARTICLES.map((a) => a.slug)).size).toBe(ARTICLES.length);
    for (const a of ARTICLES) {
      expect(a.slug, a.slug).toMatch(/^[a-z0-9-]+$/);
      expect(a.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(existsSync(`public${a.model.file}`), a.model.file).toBe(true);
      expect(a.model.file.endsWith(".xlsx")).toBe(true);
      expect(a.lead.length, a.slug).toBeGreaterThan(200);
      expect(a.blocks.filter((b) => "h2" in b).length, a.slug).toBeGreaterThanOrEqual(4);
    }
  });
  it("título e descrição cabem no resultado de busca", () => {
    for (const a of ARTICLES) {
      expect(`${a.title} · EGD`.length, a.slug).toBeLessThanOrEqual(70);
      expect(a.description.length, a.slug).toBeGreaterThanOrEqual(70);
      expect(a.description.length, a.slug).toBeLessThanOrEqual(180);
    }
  });
  it("o link relacionado aponta para uma página que existe no site", () => {
    const known = new Set([
      "/consorcios",
      ...PRODUCTS_FULL.map((p) => `/produtos/${p.id}`),
      ...SERVICES.map((s) => `/servicos/${s.id}`),
    ]);
    for (const a of ARTICLES) expect(known.has(a.related.href), a.slug).toBe(true);
    for (const d of CONSORCIOS.deliverables) expect(known.has(d.href), d.href).toBe(true);
    for (const p of PUBLICOS) for (const d of p.deliverables) expect(known.has(d.href), `${p.slug}: ${d.href}`).toBe(true);
  });
  it("JSON-LD de Article tem autor, data e o modelo como anexo", () => {
    const j = articleJsonLd(ARTICLES[0]);
    expect(j["@type"]).toBe("Article");
    expect(j.datePublished).toBe(ARTICLES[0].published);
    expect(j.author).toMatchObject({ "@type": "Person", "@id": `${SITE.url}/#founder`, name: SITE.founder.name, url: `${SITE.url}${SITE.founder.path}` });
    expect(j.publisher).toEqual({ "@id": `${SITE.url}/#organization` });
    expect(j.associatedMedia.contentUrl).toBe(`${SITE.url}${ARTICLES[0].model.file}`);
    expect(() => JSON.parse(JSON.stringify(j))).not.toThrow();
  });
});

describe("páginas por público (/para)", () => {
  it("slugs únicos, título e descrição no limite da busca, seis problemas, quatro entregas e artigos existentes", () => {
    expect(new Set(PUBLICOS.map((p) => p.slug)).size).toBe(PUBLICOS.length);
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const p of PUBLICOS) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(`${p.metaTitle} · EGD`.length, p.slug).toBeLessThanOrEqual(70);
      expect(p.metaDescription.length, p.slug).toBeGreaterThanOrEqual(70);
      expect(p.metaDescription.length, p.slug).toBeLessThanOrEqual(180);
      expect(p.definition.length, p.slug).toBeGreaterThan(80);
      expect(p.problems).toHaveLength(6);
      expect(p.deliverables).toHaveLength(4);
      expect(p.faq.length, p.slug).toBeGreaterThanOrEqual(3);
      for (const s of p.articles) expect(slugs.has(s), `${p.slug}: ${s}`).toBe(true);
    }
  });
  it("a lista de públicos inclui consórcios e todas as páginas /para/<slug>", () => {
    expect(PUBLICOS_LINKS.map((l) => l.href)).toEqual(["/consorcios", ...PUBLICOS.map((p) => `/para/${p.slug}`)]);
  });
});

describe("navegação e sitemap", () => {
  it("menu e rodapé levam às páginas novas e não usam âncoras de serviço", () => {
    expect(NAV_LINKS.map((l) => l.href)).toEqual(expect.arrayContaining(["/consorcios", "/artigos"]));
    const footer = FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href));
    expect(footer).toEqual(expect.arrayContaining(["/servicos/dev", "/produtos", "/consorcios", "/artigos", "/para", ...PUBLICOS.map((p) => `/para/${p.slug}`)]));
    expect(footer.some((h) => h.includes("#"))).toBe(false);
  });
  it("sitemap lista páginas fixas, produtos, serviços e artigos, com lastModified só nos artigos", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    for (const p of ["/", "/consorcios", "/para", "/para/construtoras", "/artigos", "/servicos/dev", "/produtos/vistorias", SITE.founder.path, `/artigos/${ARTICLES[0].slug}`]) expect(urls).toContain(`${SITE.url}${p}`);
    expect(urls).not.toContain(`${SITE.url}/cases`);
    for (const e of entries) {
      if (e.url.includes("/artigos/")) expect(e.lastModified).toBeTruthy();
      else expect(e.lastModified).toBeUndefined();
    }
  });
});
