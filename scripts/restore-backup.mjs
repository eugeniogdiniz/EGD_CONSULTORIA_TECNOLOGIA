// Restaura um backup lógico (pasta backups/AAAA-MM-DD do storage) num banco já
// migrado. Uso: node --env-file=.env scripts/restore-backup.mjs 2026-10-03 [--truncate] [--only tabela,tabela]
// Em produção, rode dentro do container do app. Restaura "on conflict do nothing":
// com --truncate, zera cada tabela antes (destrutivo: confirme o banco alvo).
import { spawnSync } from "node:child_process";

const [date, ...rest] = process.argv.slice(2);
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("informe a data do backup: AAAA-MM-DD");
  process.exit(1);
}
const truncate = rest.includes("--truncate");
const onlyIdx = rest.indexOf("--only");
const only = onlyIdx >= 0 ? rest[onlyIdx + 1] : "";
const code = `
import { restoreTables } from "@/modules/backup/restore";
const r = await restoreTables(${JSON.stringify(date)}, { truncate: ${truncate}, only: ${only ? JSON.stringify(only.split(",")) : "undefined"} });
for (const t of r.restored) console.log(t.table.padEnd(40), t.rows);
process.exit(0);
`;
const res = spawnSync("npx", ["tsx", "--tsconfig", "tsconfig.json", "-e", code], { stdio: "inherit", env: process.env });
process.exit(res.status ?? 1);
