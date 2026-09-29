import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Guarda contra variáveis CSS que não existem: `fill="var(--bg-subtle)"` com o nome errado
 * não dá erro nenhum, o navegador só pinta preto (foi o que aconteceu no Gantt).
 * Todo `var(--x)` no código precisa estar definido em algum CSS do projeto ou na lista abaixo.
 */
const SRC = path.resolve(import.meta.dirname, "../../src");

// definidas fora dos nossos CSS: fontes do next/font e variáveis injetadas por bibliotecas
const EXTERNAL = [/^--font-/, /^--tw-/, /^--radix-/, /^--base-ui-/, /^--anchor-/, /^--available-/, /^--transform-/, /^--accordion-/];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC);
const defined = new Set<string>();
for (const f of files.filter((f) => f.endsWith(".css"))) {
  for (const m of readFileSync(f, "utf-8").matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
}
// variáveis definidas inline (style={{ "--x": ... }}) em componentes
for (const f of files.filter((f) => /\.(tsx|ts)$/.test(f))) {
  for (const m of readFileSync(f, "utf-8").matchAll(/["'`](--[a-zA-Z0-9-]+)["'`]\s*:/g)) defined.add(m[1]);
}

const used = new Map<string, string[]>();
for (const f of files.filter((f) => /\.(tsx|ts|css)$/.test(f))) {
  for (const m of readFileSync(f, "utf-8").matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
    used.set(m[1], [...(used.get(m[1]) ?? []), path.relative(SRC, f)]);
  }
}

describe("variáveis CSS", () => {
  it("todo var(--x) usado no código tem definição", () => {
    const missing = [...used]
      .filter(([name]) => !defined.has(name) && !EXTERNAL.some((re) => re.test(name)))
      .map(([name, where]) => `${name}  ←  ${[...new Set(where)].slice(0, 3).join(", ")}`);
    expect(missing, `variáveis sem definição:\n${missing.join("\n")}`).toEqual([]);
  });
});
