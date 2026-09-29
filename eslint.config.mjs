import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Permite variáveis/parâmetros prefixados com "_" quando
      // intencionalmente não usados (ex.: destructuring para omitir chave).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Site estático antigo (React via CDN, globais definidos por <script>):
    // não é código da aplicação Next.js e não segue as mesmas convenções.
    "legacy/**",
    // Saídas de teste e do MCP do Playwright (HTML/JS minificado).
    "test-results/**",
    "playwright-report/**",
    ".playwright-mcp/**",
    ".superpowers/**",
  ]),
]);

export default eslintConfig;
