import type { MetadataRoute } from "next";
import { ARTICLES } from "@/content/artigos";
import { PUBLICOS } from "@/content/publicos";
import { PRODUCTS_FULL, SERVICES } from "@/content/legacy-pages";
import { SHOW_CASES, SITE } from "@/content/site";

// Sem `lastModified` nas páginas fixas: um valor sempre igual a "agora" faz o buscador desconfiar
// do campo inteiro. Artigos levam a data real de publicação ou atualização.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/servicos", "/produtos", "/consorcios", "/para", ...(SHOW_CASES ? ["/cases"] : []), "/artigos", "/sobre", SITE.founder.path, "/contato"];
  const detail = [...SERVICES.map((s) => `/servicos/${s.id}`), ...PRODUCTS_FULL.map((p) => `/produtos/${p.id}`), ...PUBLICOS.map((p) => `/para/${p.slug}`)];
  return [
    ...pages.map((path) => ({ url: `${SITE.url}${path}`, changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const), priority: path === "/" ? 1 : path === "/consorcios" ? 0.9 : 0.7 })),
    ...detail.map((path) => ({ url: `${SITE.url}${path}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...ARTICLES.map((a) => ({ url: `${SITE.url}/artigos/${a.slug}`, lastModified: a.updated ?? a.published, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
