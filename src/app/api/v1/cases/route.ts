import { authenticateApiKey, apiError } from "@/modules/api-keys/auth";
import { listPublishedCaseRows } from "@/modules/cases/queries";
import { toApiCase } from "@/modules/cases/api";

export const dynamic = "force-dynamic";

/** GET /api/v1/cases — cases publicados, do maior para o menor retorno. Escopo: cases:read. */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req, "cases:read");
  if (!auth.ok) return auth.response;
  try {
    const rows = await listPublishedCaseRows();
    return Response.json({ data: rows.map(toApiCase) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError(500, "internal_error", "Erro ao listar os cases.");
  }
}
