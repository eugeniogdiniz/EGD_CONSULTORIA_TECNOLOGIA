import { defineConfig } from "vitest/config";
import path from "node:path";

// Testes de integração rodam contra Postgres, RustFS e Mailpit do docker-compose.dev.yml.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
