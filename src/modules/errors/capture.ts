/**
 * Captura de erros de servidor (gancho `onRequestError` do Next). Agrupa por
 * fingerprint; nunca lança (um erro ao registrar erro vai só para o log).
 */
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type CapturedError = { name: string; message: string; stack: string | null; digest: string | null };

export function describeError(err: unknown): CapturedError {
  if (err instanceof Error) {
    return { name: err.name || "Error", message: err.message || "(sem mensagem)", stack: err.stack ?? null, digest: (err as { digest?: string }).digest ?? null };
  }
  return { name: "Error", message: typeof err === "string" ? err : JSON.stringify(err).slice(0, 500), stack: null, digest: null };
}

/** Primeira linha do stack que aponta para código da aplicação (sem node_modules), ou a primeira linha. */
export function stackAnchor(stack: string | null): string {
  if (!stack) return "";
  const lines = stack.split("\n").slice(1).map((l) => l.trim()).filter(Boolean);
  const app = lines.find((l) => !l.includes("node_modules") && !l.includes("node:internal"));
  return (app ?? lines[0] ?? "").replace(/:\d+:\d+\)?$/, "").replace(/\?[^ )]*/g, "");
}

/** Estável para o mesmo erro no mesmo lugar; não usa a mensagem inteira quando ela tem ids/números. */
export function fingerprint(e: CapturedError): string {
  const msg = e.message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>").replace(/\d+/g, "<n>").slice(0, 200);
  return createHash("sha256").update(`${e.name}\n${msg}\n${stackAnchor(e.stack)}`).digest("hex").slice(0, 32);
}

export type CaptureContext = { path?: string | null; method?: string | null; routeKind?: string | null; userId?: string | null };

/** Grava ou incrementa. Devolve `{ isNew }` para a notificação de erro novo. */
export async function captureError(err: unknown, ctx: CaptureContext = {}): Promise<{ id: string; isNew: boolean; fingerprint: string } | null> {
  const e = describeError(err);
  const fp = fingerprint(e);
  try {
    const [row] = await db.execute<{ id: string; count: number; resolved_at: Date | null }>(sql`
      insert into app_error (fingerprint, name, message, stack, path, method, route_kind, digest, user_id)
      values (${fp}, ${e.name.slice(0, 120)}, ${e.message.slice(0, 2000)}, ${e.stack ? e.stack.slice(0, 8000) : null}, ${ctx.path ?? null}, ${ctx.method ?? null}, ${ctx.routeKind ?? null}, ${e.digest}, ${ctx.userId ?? null})
      on conflict (fingerprint) do update set
        count = app_error.count + 1,
        last_seen_at = now(),
        message = excluded.message,
        stack = coalesce(excluded.stack, app_error.stack),
        path = coalesce(excluded.path, app_error.path),
        digest = coalesce(excluded.digest, app_error.digest),
        user_id = coalesce(excluded.user_id, app_error.user_id),
        resolved_at = null,
        resolved_by = null
      returning id, count, (xmax = 0) as is_new, resolved_at
    `);
    const isNew = Number(row.count) === 1;
    logger.error("request.error", { fingerprint: fp, name: e.name, message: e.message.slice(0, 300), path: ctx.path ?? null, digest: e.digest, count: row.count });
    return { id: row.id, isNew, fingerprint: fp };
  } catch (inner) {
    logger.error("error_capture.failed", { err: String(inner), original: e.message.slice(0, 300) });
    return null;
  }
}
