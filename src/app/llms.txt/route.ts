import { llmsTxt } from "@/content/llms";

/** Resumo do site para assistentes de IA (llmstxt.org). Conteúdo estático: cache de um dia. */
export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
