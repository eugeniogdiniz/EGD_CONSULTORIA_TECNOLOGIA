import type { MetadataRoute } from "next";
import { AI_BOTS } from "@/content/ai-bots";
import { SITE } from "@/content/site";

const PRIVATE = ["/admin", "/portal", "/api", "/entrar", "/convite", "/recuperar-senha", "/redefinir-senha"];

/**
 * Robôs de IA (ChatGPT, Claude, Perplexity, Gemini, Copilot, Meta) listados de forma explícita:
 * alguns deles só leem a regra do próprio nome, e queremos que a EGD apareça nas respostas.
 * As áreas privadas continuam fora para todos. A lista vive em `content/ai-bots.ts`.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: [...AI_BOTS], allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
