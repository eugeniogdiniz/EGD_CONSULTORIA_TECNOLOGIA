import { test, expect } from "@playwright/test";

const SITE_URL = "https://egdsystem.com.br";
// /cases está oculto por enquanto (SHOW_CASES = false em src/content/site.ts).
const PAGES = ["/", "/servicos", "/produtos", "/consorcios", "/para", "/para/construtoras", "/para/empresas-de-engenharia", "/artigos", "/sobre", "/sobre/eugenio-diniz", "/contato", "/produtos/vistorias", "/servicos/auto", "/servicos/bpo", "/artigos/rdo-relatorio-diario-de-obra"];

for (const path of PAGES) {
  test(`SEO ${path}: título, descrição, canonical, Open Graph e um único h1`, async ({ page }) => {
    await page.goto(path);
    const meta = (sel: string, attr = "content") => page.locator(sel).first().getAttribute(attr);
    const title = await page.title();
    const desc = (await meta('meta[name="description"]')) ?? "";
    expect(title.length, "título").toBeGreaterThanOrEqual(20);
    expect(title.length, "título").toBeLessThanOrEqual(70);
    expect(desc.length, "descrição").toBeGreaterThanOrEqual(70);
    expect(desc.length, "descrição").toBeLessThanOrEqual(180);
    const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
    expect(await meta('link[rel="canonical"]', "href")).toBe(url);
    expect(await meta('meta[property="og:url"]')).toBe(url);
    expect(await meta('meta[property="og:title"]')).toBe(title);
    expect(await meta('meta[property="og:description"]')).toBe(desc);
    expect(await meta('meta[property="og:image"]')).toContain("/brand/social-cover.png");
    expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCount(1);
  });
}

test("SEO: títulos e descrições são diferentes entre as páginas (sem duplicidade)", async ({ page }) => {
  const seen = { title: new Set<string>(), desc: new Set<string>() };
  for (const path of PAGES) {
    await page.goto(path);
    seen.title.add(await page.title());
    seen.desc.add((await page.locator('meta[name="description"]').getAttribute("content")) ?? "");
  }
  expect(seen.title.size).toBe(PAGES.length);
  expect(seen.desc.size).toBe(PAGES.length);
});

async function jsonLd(page: import("@playwright/test").Page) {
  const raws = await page.locator('script[type="application/ld+json"]').allTextContents();
  for (const raw of raws) expect(raw).not.toContain("<");
  return raws.map((raw) => JSON.parse(raw) as Record<string, unknown>);
}

test("SEO: a home publica JSON-LD de Organization, WebSite, WebPage e FAQPage válidos", async ({ page }) => {
  await page.goto("/");
  const types = (await jsonLd(page)).map((d) => d["@type"]);
  expect(types).toEqual(["Organization", "Person", "WebSite", "WebPage", "FAQPage"]);
  const [org, person] = (await jsonLd(page)) as [{ url: string; email: string; founder: { "@id": string; name: string }; sameAs: string[] }, { "@id": string; url: string }];
  expect(org.url).toBe(SITE_URL);
  expect(org.email).toMatch(/@egdsystem\.com\.br$/);
  expect(org.founder.name).toBeTruthy();
  expect(org.sameAs.length).toBeGreaterThan(0);
  // a Person do fundador é a mesma entidade que a Organization aponta, e tem página própria
  expect(person["@id"]).toBe(org.founder["@id"]);
  expect(person.url).toBe(`${SITE_URL}/sobre/eugenio-diniz`);
});

test("SEO: páginas internas publicam trilha (BreadcrumbList) e perguntas frequentes (FAQPage) visíveis", async ({ page }) => {
  const expected: Record<string, string[]> = {
    "/servicos": ["CollectionPage", "BreadcrumbList", "ItemList", "FAQPage"],
    "/produtos": ["CollectionPage", "BreadcrumbList", "ItemList", "FAQPage"],
    "/sobre": ["AboutPage", "BreadcrumbList", "FAQPage"],
    "/contato": ["ContactPage", "BreadcrumbList", "FAQPage"],
    "/consorcios": ["WebPage", "BreadcrumbList", "FAQPage"],
    "/para/construtoras": ["WebPage", "BreadcrumbList", "FAQPage"],
    "/produtos/vistorias": ["WebPage", "BreadcrumbList", "SoftwareApplication", "FAQPage"],
    "/servicos/auto": ["WebPage", "BreadcrumbList", "Service", "FAQPage"],
    "/servicos/bpo": ["WebPage", "BreadcrumbList", "Service", "FAQPage"],
  };
  for (const [path, types] of Object.entries(expected)) {
    await page.goto(path);
    const data = await jsonLd(page);
    expect(data.map((d) => d["@type"]), path).toEqual(types);
    const faq = data.find((d) => d["@type"] === "FAQPage") as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    // o mesmo texto do JSON-LD aparece na tela (o Google penaliza FAQ só no código)
    for (const q of faq.mainEntity) {
      await expect(page.getByRole("heading", { level: 3, name: q.name }), `${path}: ${q.name}`).toBeVisible();
      await expect(page.getByText(q.acceptedAnswer.text, { exact: true })).toBeVisible();
    }
    const crumbs = data.find((d) => d["@type"] === "BreadcrumbList") as { itemListElement: { item: string }[] };
    expect(crumbs.itemListElement[0].item).toBe(`${SITE_URL}/`);
    expect(crumbs.itemListElement.at(-1)?.item).toBe(`${SITE_URL}${path}`);
  }
});

test("SEO: artigo publica Article com autor e data, e o modelo em planilha baixa de verdade", async ({ page, request }) => {
  await page.goto("/artigos");
  const first = page.locator('a[href^="/artigos/"]').first();
  const href = await first.getAttribute("href");
  await page.goto(href!);
  const data = await jsonLd(page);
  expect(data.map((d) => d["@type"])).toEqual(["WebPage", "BreadcrumbList", "Article"]);
  const art = data[2] as { headline: string; datePublished: string; associatedMedia: { contentUrl: string } };
  expect(art.headline).toBe(await page.locator("h1").textContent());
  expect(art.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(await page.locator('meta[property="og:type"]').getAttribute("content")).toBe("article");
  const file = new URL(art.associatedMedia.contentUrl).pathname;
  await expect(page.locator(`a[href="${file}"][download]`)).toBeVisible();
  const res = await request.get(file);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
  expect((await res.body()).subarray(0, 2).toString()).toBe("PK");
});

test("SEO: sitemap inclui páginas próprias de produto, serviço, consórcios e artigos (artigos com lastmod)", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/consorcios", "/para/incorporadoras", "/artigos", "/produtos/vistorias", "/servicos/auto", "/artigos/rdo-relatorio-diario-de-obra"]) expect(sitemap).toContain(`<loc>${SITE_URL}${p}</loc>`);
  expect(sitemap).toContain("<lastmod>2026-");
});

test("SEO: llms.txt e llms-full.txt respondem em texto puro com o resumo da EGD", async ({ request }) => {
  for (const path of ["/llms.txt", "/llms-full.txt"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body.startsWith("# EGD Consultoria em Tecnologia")).toBe(true);
    expect(body).toContain(`${SITE_URL}/servicos`);
    expect(body).not.toContain("/admin");
  }
});

test("SEO: a home diz em uma frase o que a EGD é e onde atende (texto citável por buscadores e IAs)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/A EGD Consultoria em Tecnologia é uma consultoria de São Paulo/)).toBeVisible();
  // as diretivas de trecho vão na tag própria do Googlebot (o Next separa `robots` de `googleBot`)
  expect(await page.locator('meta[name="googlebot"]').first().getAttribute("content")).toContain("max-snippet:-1");
});

test("SEO: páginas de acesso saem do índice (noindex)", async ({ page }) => {
  for (const path of ["/entrar", "/recuperar-senha"]) {
    await page.goto(path);
    expect(await page.locator('meta[name="robots"]').getAttribute("content"), path).toContain("noindex");
  }
});

test("SEO: sitemap lista as páginas públicas (sem /cases) sem lastmod e robots aponta para ele", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of PAGES) expect(sitemap).toContain(`<loc>${SITE_URL}${path === "/" ? "/" : path}</loc>`);
  // páginas fixas sem lastmod (só os artigos levam data real)
  expect(sitemap.split("<url>").filter((u) => u.includes("/servicos</loc>") || u.includes("/produtos</loc>")).every((u) => !u.includes("<lastmod>"))).toBe(true);
  expect(sitemap).not.toContain("/cases");
  expect(sitemap).not.toContain("/admin");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  for (const blocked of ["/admin", "/portal", "/api"]) expect(robots).toContain(`Disallow: ${blocked}`);
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(robots).toContain(`User-Agent: ${bot}`);
  expect(robots).toContain("Allow: /llms.txt");
});
