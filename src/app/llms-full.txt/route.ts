import { llmsFullTxt } from "@/content/llms";

/** Versão completa do /llms.txt: serviços, produtos, princípios e perguntas frequentes. */
export function GET() {
  return new Response(llmsFullTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
