/**
 * Restauração a partir de uma pasta de backup: insere tabela a tabela na ordem
 * do manifest (pais antes dos filhos) em um banco com o schema já migrado.
 * Usada pelo script `scripts/restore-backup.mjs` e pelo teste de integração.
 */
import { gunzipSync } from "node:zlib";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getObject } from "@/lib/storage";
import { BACKUP_PREFIX, planRestoreOrder, readManifest } from "./run";

export async function restoreTables(date: string, opts: { only?: string[]; truncate?: boolean } = {}): Promise<{ restored: { table: string; rows: number }[] }> {
  const manifest = await readManifest(date);
  if (!manifest) throw new Error(`manifest não encontrado para ${date}`);
  const order = planRestoreOrder(manifest.tables.map((t) => ({ table: t.table, dependsOn: t.dependsOn }))).filter((t) => !opts.only || opts.only.includes(t));
  const restored: { table: string; rows: number }[] = [];
  await db.execute(sql`set session_replication_role = replica`);
  try {
    for (const table of order) {
      const raw = gunzipSync(await getObject(`${BACKUP_PREFIX}${date}/${table}.json.gz`)).toString("utf8");
      const rows = JSON.parse(raw) as unknown[];
      if (opts.truncate) await db.execute(sql`truncate table ${sql.identifier(table)} cascade`);
      if (rows.length > 0) {
        await db.execute(sql`insert into ${sql.identifier(table)} select * from json_populate_recordset(null::${sql.identifier(table)}, ${JSON.stringify(rows)}::json) on conflict do nothing`);
      }
      restored.push({ table, rows: rows.length });
    }
  } finally {
    await db.execute(sql`set session_replication_role = default`);
  }
  return { restored };
}
