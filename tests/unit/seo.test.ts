import { describe, it, expect } from "vitest";
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd, ORG_ID, pageMeta, productsJsonLd, servicesJsonLd, webPageJsonLd, websiteJsonLd, WEBSITE_ID } from "@/content/seo";
import { FAQ } from "@/content/faq";
import { llmsFullTxt, llmsTxt } from "@/content/llms";
import { SERVICES, PRODUCTS_FULL } from "@/content/legacy-pages";
import { SITE } from "@/content/site";
import robots from "@/app/robots";

const serializable = (j: object) => expect(() => JSON.parse(JSON.stringify(j))).not.toThrow();

describe("pageMeta", () => {
  const m = pageMeta({ title: "Serviços", description: "Descrição da página.", path: "/servicos" });
  it("define canonical relativo (o metadataBase do layout completa a URL)", () => {
    expect(m.alternates?.canonical).toBe("/servicos");
    expect(m.openGraph).toMatchObject({ url: "/servicos", type: "website", locale: "pt_BR", siteName: "EGD" });
  });
  it("Open Graph e Twitter repetem o título completo (com o sufixo do template) e a descrição", () => {
    expect(m.openGraph).toMatchObject({ title: "Serviços · EGD", description: "Descrição da página." });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Serviços · EGD" });
  });
  it("o openGraph da página substitui o do layout, então precisa levar a imagem", () => {
    expect((m.openGraph as { images: unknown[] }).images).toHaveLength(1);
  });
  it("título absoluto não ganha sufixo", () => {
    const home = pageMeta({ title: { absolute: "EGD — Home" }, description: "d", path: "/" });
    expect(home.openGraph).toMatchObject({ title: "EGD — Home" });
    expect(home.title).toEqual({ absolute: "EGD — Home" });
  });
});

describe("organizationJsonLd", () => {
  const j = organizationJsonLd();
  it("é uma Organization schema.org com a identidade do site", () => {
    expect(j["@context"]).toBe("https://schema.org");
    expect(j["@type"]).toBe("Organization");
    expect(j["@id"]).toBe(ORG_ID);
    expect(j.name).toBe(SITE.name);
    expect(j.url).toBe(SITE.url);
    expect(j.email).toBe(SITE.email);
    expect(j.foundingDate).toBe(SITE.foundingYear);
  });
  it("logo e contato usam URLs absolutas", () => {
    expect(j.logo.startsWith("https://")).toBe(true);
    expect(j.image.startsWith("https://")).toBe(true);
    expect(j.contactPoint.email).toBe(SITE.email);
  });
  it("liga a empresa a quem responde por ela (fundador e perfis públicos)", () => {
    expect(j.founder).toMatchObject({ "@type": "Person", name: SITE.founder.name, worksFor: { "@id": ORG_ID } });
    expect(j.sameAs).toEqual([SITE.founder.linkedin, SITE.founder.github]);
    for (const url of j.sameAs) expect(url.startsWith("https://")).toBe(true);
  });
  it("lista as seis frentes de serviço no catálogo", () => {
    expect(j.hasOfferCatalog.itemListElement).toHaveLength(SERVICES.length);
    expect(j.hasOfferCatalog.itemListElement[0].itemOffered.url).toBe(`${SITE.url}/servicos/dev`);
  });
  it("serializa em JSON válido", () => serializable(j));
});

describe("websiteJsonLd e webPageJsonLd", () => {
  it("o site aponta para a organização e a página para o site", () => {
    const site = websiteJsonLd();
    expect(site["@id"]).toBe(WEBSITE_ID);
    expect(site.publisher).toEqual({ "@id": ORG_ID });
    const page = webPageJsonLd({ kind: "AboutPage", path: "/sobre", title: "Sobre", description: "d" });
    expect(page["@type"]).toBe("AboutPage");
    expect(page.url).toBe(`${SITE.url}/sobre`);
    expect(page.isPartOf).toEqual({ "@id": WEBSITE_ID });
    expect(page.inLanguage).toBe("pt-BR");
  });
  it("a home vira a raiz com barra final (igual ao canonical)", () => {
    expect(webPageJsonLd({ path: "/", title: "t", description: "d" }).url).toBe(`${SITE.url}/`);
  });
});

describe("breadcrumbJsonLd", () => {
  it("começa pelo Início e numera as posições a partir de 1", () => {
    const b = breadcrumbJsonLd([{ name: "Serviços", path: "/servicos" }]);
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(b.itemListElement[0]).toMatchObject({ name: "Início", item: `${SITE.url}/` });
    expect(b.itemListElement[1]).toMatchObject({ name: "Serviços", item: `${SITE.url}/servicos` });
  });
});

describe("FAQ e faqJsonLd", () => {
  const all = Object.values(FAQ).flat();
  it("toda página tem perguntas e nenhuma pergunta se repete entre páginas", () => {
    for (const items of Object.values(FAQ)) expect(items.length).toBeGreaterThanOrEqual(3);
    expect(new Set(all.map((f) => f.q)).size).toBe(all.length);
  });
  it("respostas são curtas o bastante para virar trecho (até 500 caracteres) e terminam com ponto", () => {
    for (const f of all) {
      expect(f.a.length, f.q).toBeLessThanOrEqual(500);
      expect(f.a.trim().endsWith("."), f.q).toBe(true);
      expect(f.q.endsWith("?"), f.q).toBe(true);
    }
  });
  it("o JSON-LD leva exatamente o texto mostrado na tela", () => {
    const j = faqJsonLd(FAQ.contato);
    expect(j["@type"]).toBe("FAQPage");
    expect(j.mainEntity).toHaveLength(FAQ.contato.length);
    expect(j.mainEntity[0]).toEqual({ "@type": "Question", name: FAQ.contato[0].q, acceptedAnswer: { "@type": "Answer", text: FAQ.contato[0].a } });
    serializable(j);
  });
  it("o prazo de resposta é o mesmo em todo o site (sem contradição entre páginas)", () => {
    expect(FAQ.contato[0].a).toContain(SITE.responseTime);
    expect(SITE.responseTime).toMatch(/48 horas úteis/);
  });
});

describe("servicesJsonLd e productsJsonLd", () => {
  it("cada serviço do site vira um Service com provider na organização", () => {
    const j = servicesJsonLd();
    expect(j.itemListElement).toHaveLength(SERVICES.length);
    for (const li of j.itemListElement) {
      expect(li.item["@type"]).toBe("Service");
      expect(li.item.provider).toEqual({ "@id": ORG_ID });
      expect(li.item.url.startsWith(`${SITE.url}/servicos/`)).toBe(true);
    }
    serializable(j);
  });
  it("cada produto vira um SoftwareApplication com funcionalidades e oferta sem preço fixo", () => {
    const j = productsJsonLd();
    expect(j.itemListElement).toHaveLength(PRODUCTS_FULL.length);
    for (const li of j.itemListElement) {
      expect(li.item["@type"]).toBe("SoftwareApplication");
      expect(li.item.featureList.length).toBeGreaterThan(0);
      expect(li.item.offers).not.toHaveProperty("price");
      expect(li.item.offers.url).toBe(`${SITE.url}/contato`);
    }
    serializable(j);
  });
});

describe("llms.txt", () => {
  const short = llmsTxt();
  const full = llmsFullTxt();
  it("começa pelo nome da empresa e pelo resumo em citação (formato llmstxt.org)", () => {
    expect(short.startsWith(`# ${SITE.name}\n\n> `)).toBe(true);
    expect(full.startsWith(`# ${SITE.name}\n\n> `)).toBe(true);
  });
  it("lista serviços, produtos e páginas com links absolutos", () => {
    for (const s of SERVICES) expect(short).toContain(`[${s.title}](${SITE.url}/servicos/${s.id})`);
    for (const p of PRODUCTS_FULL) expect(short).toContain(`[${p.title}](${SITE.url}/produtos/${p.id})`);
    expect(short).toContain(`${SITE.url}/consorcios`);
    expect(short).toContain(`${SITE.url}/artigos/`);
    expect(short).toContain(`(${SITE.url}/contato)`);
    expect(short).toContain(`${SITE.url}/llms-full.txt`);
    expect(short).not.toContain("/cases");
  });
  it("a versão completa inclui princípios e todas as perguntas frequentes", () => {
    for (const f of Object.values(FAQ).flat()) expect(full).toContain(f.q);
    expect(full).toContain("## Princípios");
    expect(full.length).toBeGreaterThan(short.length);
  });
  it("não vaza rotas privadas", () => {
    for (const t of [short, full]) expect(t).not.toMatch(/\/(admin|api|entrar|convite)\b/);
  });
});

describe("robots", () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  it("libera os robôs de IA de forma explícita e mantém as áreas privadas fechadas para todos", () => {
    const ai = rules.find((x) => Array.isArray(x.userAgent));
    expect(ai?.userAgent).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"]));
    for (const rule of rules) expect(rule.disallow).toEqual(expect.arrayContaining(["/admin", "/portal", "/api", "/entrar"]));
    expect(ai?.allow).toEqual(expect.arrayContaining(["/llms.txt"]));
  });
  it("aponta para o sitemap", () => expect(r.sitemap).toBe(`${SITE.url}/sitemap.xml`));
});
