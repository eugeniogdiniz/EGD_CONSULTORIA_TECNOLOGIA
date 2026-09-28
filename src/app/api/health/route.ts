import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Saúde real: env válido (import) e banco respondendo. Falha derruba o healthcheck do container. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, env: env.NODE_ENV, ts: new Date().toISOString() });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 503 });
  }
}
