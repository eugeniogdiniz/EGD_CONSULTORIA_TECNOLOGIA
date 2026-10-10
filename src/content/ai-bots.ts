/**
 * Robôs de busca e de IA que queremos lendo o site. A lista vale para o robots.txt (liberação
 * explícita) e para o registro de acesso no proxy (saber se ChatGPT, Claude, Perplexity, Google
 * e Bing estão de fato lendo as páginas e o llms.txt).
 */
export const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Googlebot", "Bingbot", "Applebot", "Applebot-Extended",
  "meta-externalagent", "Amazonbot", "DuckAssistBot", "CCBot",
] as const;

export type AiBot = (typeof AI_BOTS)[number];

/** Nome do robô se o User-Agent for de um deles; null para visitantes comuns. */
export function detectAiBot(userAgent: string | null | undefined): AiBot | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  // os nomes mais específicos primeiro ("Applebot-Extended" antes de "Applebot")
  const ordered = [...AI_BOTS].sort((a, b) => b.length - a.length);
  return ordered.find((b) => ua.includes(b.toLowerCase())) ?? null;
}
