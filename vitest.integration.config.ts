import { defineConfig } from "vitest/config";
import path from "node:path";
import "dotenv/config";
import { testDatabaseUrl } from "./scripts/test-db-url.mjs";

// Testes de integração rodam contra um Postgres SEPARADO do de desenvolvimento
// (`<nome>_test`, criado por scripts/test-db.mjs), além de RustFS e Mailpit do
// docker-compose.dev.yml. O setup trunca tabelas: nunca aponte para o banco de dev.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    env: { DATABASE_URL: testDatabaseUrl() },
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
