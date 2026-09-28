import { z, type ZodError } from "zod";

/**
 * Resultado padrão de toda server action. Actions nunca lançam para o
 * cliente: sucesso ou falha vêm neste formato, com erros por campo quando
 * a validação falha.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> =>
  fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };

export function fromZod(error: ZodError): ActionResult<never> {
  const flat = z.flattenError(error);
  const fieldErrors = Object.fromEntries(
    Object.entries(flat.fieldErrors)
      .filter(([, v]) => Array.isArray(v) && v.length > 0)
      .map(([k, v]) => [k, v as string[]]),
  );
  return fail("Verifique os campos destacados.", fieldErrors);
}
