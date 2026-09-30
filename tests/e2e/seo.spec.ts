import { test, expect } from "@playwright/test";

const SITE_URL = "https://egdsystem.com.br";
// /cases está oculto por enquanto (SHOW_CASES = false em src/content/site.ts).
const PAGES = ["/", "/servicos", "/produtos", "/sobre", "/contato"];

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

test("SEO: a home publica JSON-LD de Organization válido", async ({ page }) => {
  await page.goto("/");
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(raw).not.toContain("<");
  const data = JSON.parse(raw ?? "{}");
  expect(data["@type"]).toBe("Organization");
  expect(data.url).toBe(SITE_URL);
  expect(data.email).toMatch(/@egdsystem\.com\.br$/);
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
  expect(sitemap).not.toContain("<lastmod>");
  expect(sitemap).not.toContain("/cases");
  expect(sitemap).not.toContain("/admin");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  for (const blocked of ["/admin", "/portal", "/api"]) expect(robots).toContain(`Disallow: ${blocked}`);
});
