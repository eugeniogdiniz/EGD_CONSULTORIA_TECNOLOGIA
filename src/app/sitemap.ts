import type { MetadataRoute } from "next";
import { SHOW_CASES, SITE } from "@/content/site";

// Sem `lastModified`: um valor sempre igual a "agora" faz o buscador desconfiar do campo inteiro.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/servicos", "/produtos", ...(SHOW_CASES ? ["/cases"] : []), "/sobre", "/contato"];
  return pages.map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
