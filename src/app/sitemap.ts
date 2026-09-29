import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

// Sem `lastModified`: um valor sempre igual a "agora" faz o buscador desconfiar do campo inteiro.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/servicos", "/produtos", "/cases", "/sobre", "/contato"].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
