/**
 * O Drizzle envolve o erro do postgres.js num `DrizzleQueryError`: o `code`
 * do Postgres fica em `err.cause`, não no erro de cima. Esta função olha os dois.
 */
export function pgErrorCode(err: unknown): string | null {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null | undefined;
  if (typeof e?.code === "string") return e.code;
  if (typeof e?.cause?.code === "string") return e.cause.code;
  return null;
}

/** 23505 = unique_violation */
export const isUniqueViolation = (err: unknown) => pgErrorCode(err) === "23505";
