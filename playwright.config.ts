import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";
import { testDatabaseUrl } from "./scripts/test-db-url.mjs";

/**
 * Sem E2E_BASE_URL (uso local): sobe o PRÓPRIO servidor na porta 3100 com o banco
 * `<nome>_test`, para não criar fixtures no banco de desenvolvimento nem disputar
 * a porta 3000. Com E2E_BASE_URL (CI): usa o servidor já em pé, como antes.
 */
const external = process.env.E2E_BASE_URL;
const PORT = 3100;
const baseURL = external ?? `http://localhost:${PORT}`;

if (!external) {
  const dbUrl = testDatabaseUrl();
  // o main process define e os workers herdam (a config é carregada em cada um)
  process.env.DATABASE_URL = dbUrl;
  process.env.BETTER_AUTH_URL = baseURL;
  if (!process.env.E2E_DB_READY) {
    const run = (args: string[]) => execFileSync("npx", args, { stdio: "inherit", env: process.env });
    run(["--no-install", "node", "scripts/test-db.mjs"]);
    run(["tsx", "--tsconfig", "tsconfig.json", "src/db/seed.ts"]); // admin no banco de teste
    process.env.E2E_DB_READY = "1";
  }
}

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "pt-BR",
  },
  webServer: external
    ? undefined
    : {
        // teto de memória: o `next dev` compila todas as rotas e já passou de 11 GB (OOM derrubou a máquina)
        command: `systemd-run --user --scope -p MemoryMax=6G -p MemorySwapMax=1G npx next dev -p ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: { NEXT_DIST_DIR: ".next-e2e" },
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // portais no mobile são cobertos pelo Sheet do shell; e2e mobile só para o site público
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /site\.spec\.ts/ },
  ],
});
