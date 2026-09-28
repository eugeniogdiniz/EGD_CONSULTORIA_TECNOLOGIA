import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // SKIP_ENV_VALIDATION evita que a importação de "@/lib/env" falhe nos
    // testes por falta de segredos reais; parseEnv() é testado diretamente
    // com valores fictícios em cada teste.
    env: { SKIP_ENV_VALIDATION: "1" },
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
