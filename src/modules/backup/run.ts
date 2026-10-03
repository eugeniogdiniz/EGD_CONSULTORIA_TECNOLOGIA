/**
 * Backup lógico diário (Fase 20): cada tabela do schema public vira um JSON
 * gzip no storage, com um manifest. Rede de segurança do sistema, não substitui
 * o backup do Postgres no Coolify (runbook §8).
 */
import { gzipSync } from "node:zlib";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { deleteObjects, getObject, listObjects, putObject } from "@/lib/storage";

export const BACKUP_PREFIX = "backups/";
export const BACKUP_RETENTION_DAYS = 14;

export type ManifestTable = { table: string; rows: number; bytes: number; dependsOn: string[] };
export type Manifest = { date: string; createdAt: string; tables: ManifestTable[]; totalBytes: number };

/** Tabelas do schema public (fora as do Drizzle) com as que cada uma referencia por FK. */
export async function listTablesWithDeps(): Promise<{ table: string; dependsOn: string[] }[]> {
  const tables = await db.execute<{ table_name: string }>(sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' and table_name not like '\\_\\_drizzle%'
    order by table_name
  `);
  const fks = await db.execute<{ child: string; parent: string }>(sql`
    select tc.table_name as child, ccu.table_name as parent
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
  `);
  return tables.map((t) => ({ table: t.table_name, dependsOn: [...new Set(fks.filter((f) => f.child === t.table_name && f.parent !== t.table_name).map((f) => f.parent))] }));
}

/** Ordem de restauração: pais antes dos filhos (puro; ciclos quebram pela ordem alfabética). */
export function planRestoreOrder(tables: { table: string; dependsOn: string[] }[]): string[] {
  const remaining = new Map(tables.map((t) => [t.table, new Set(t.dependsOn.filter((d) => tables.some((x) => x.table === d)))]));
  const out: string[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.entries()].filter(([, deps]) => [...deps].every((d) => out.includes(d))).map(([t]) => t).sort();
    const next = ready.length > 0 ? ready : [[...remaining.keys()].sort()[0]];
    for (const t of next) {
      out.push(t);
      remaining.delete(t);
    }
  }
  return out;
}

export async function dumpTable(table: string): Promise<{ rows: number; body: Buffer }> {
  const [r] = await db.execute<{ data: unknown[] | null; n: number }>(sql`select coalesce(json_agg(t), '[]'::json) as data, count(*)::int as n from ${sql.identifier(table)} t`);
  const json = JSON.stringify(r?.data ?? []);
  return { rows: Number(r?.n ?? 0), body: gzipSync(Buffer.from(json)) };
}

export async function runBackup(now: Date, today: string): Promise<{ tables: number; rows: number; bytes: number; deletedFolders: number; folder: string }> {
  const list = await listTablesWithDeps();
  const folder = `${BACKUP_PREFIX}${today}/`;
  const manifestTables: ManifestTable[] = [];
  let rows = 0;
  let bytes = 0;
  for (const t of list) {
    const d = await dumpTable(t.table);
    await putObject(`${folder}${t.table}.json.gz`, d.body, "application/json", { contentEncoding: "gzip" });
    manifestTables.push({ table: t.table, rows: d.rows, bytes: d.body.length, dependsOn: t.dependsOn });
    rows += d.rows;
    bytes += d.body.length;
  }
  const manifest: Manifest = { date: today, createdAt: now.toISOString(), tables: manifestTables, totalBytes: bytes };
  await putObject(`${folder}manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2)), "application/json");
  const deletedFolders = await pruneOldBackups(today);
  return { tables: list.length, rows, bytes, deletedFolders, folder };
}

/** Apaga pastas `backups/AAAA-MM-DD/` com mais de 14 dias. */
export async function pruneOldBackups(today: string, retentionDays = BACKUP_RETENTION_DAYS): Promise<number> {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const objects = await listObjects(BACKUP_PREFIX);
  const folders = new Set(objects.map((o) => o.key.slice(BACKUP_PREFIX.length).split("/")[0]).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)));
  let deleted = 0;
  for (const f of folders) {
    if (f >= cutoffIso) continue;
    const keys = objects.filter((o) => o.key.startsWith(`${BACKUP_PREFIX}${f}/`)).map((o) => o.key);
    if (keys.length) await deleteObjects(keys);
    deleted++;
  }
  return deleted;
}

export async function listBackupFolders(): Promise<{ date: string; bytes: number; files: number }[]> {
  const objects = await listObjects(BACKUP_PREFIX);
  const by = new Map<string, { bytes: number; files: number }>();
  for (const o of objects) {
    const date = o.key.slice(BACKUP_PREFIX.length).split("/")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cur = by.get(date) ?? { bytes: 0, files: 0 };
    cur.bytes += o.size;
    cur.files += 1;
    by.set(date, cur);
  }
  return [...by.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => b.date.localeCompare(a.date));
}

export async function readManifest(date: string): Promise<Manifest | null> {
  try {
    return JSON.parse((await getObject(`${BACKUP_PREFIX}${date}/manifest.json`)).toString("utf8")) as Manifest;
  } catch {
    return null;
  }
}
