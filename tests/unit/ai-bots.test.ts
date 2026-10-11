import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AI_BOTS, detectAiBot } from "@/content/ai-bots";
import { SITE } from "@/content/site";

describe("robôs de busca e de IA", () => {
  it("reconhece os robôs pelo User-Agent, ignorando maiúsculas, e devolve o nome mais específico", () => {
    expect(detectAiBot("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)")).toBe("GPTBot");
    expect(detectAiBot("mozilla/5.0 (compatible; claudebot/1.0; +claudebot@anthropic.com)")).toBe("ClaudeBot");
    expect(detectAiBot("Mozilla/5.0 (compatible; Applebot-Extended/0.1)")).toBe("Applebot-Extended");
    expect(detectAiBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe("Googlebot");
  });
  it("devolve null para navegador comum e para ausência de User-Agent", () => {
    expect(detectAiBot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")).toBeNull();
    expect(detectAiBot(null)).toBeNull();
    expect(detectAiBot("")).toBeNull();
  });
  it("a lista é única e sem espaços", () => {
    expect(new Set(AI_BOTS).size).toBe(AI_BOTS.length);
    for (const b of AI_BOTS) expect(b).toMatch(/^[A-Za-z-]+$/);
  });
});

describe("página do autor", () => {
  it("existe no caminho declarado em SITE.founder.path", () => {
    expect(existsSync(`src/app/(site)${SITE.founder.path}/page.tsx`)).toBe(true);
  });
  it("perfis da empresa, quando houver, são URLs https", () => {
    for (const u of SITE.profiles) expect(u.startsWith("https://")).toBe(true);
  });
});
