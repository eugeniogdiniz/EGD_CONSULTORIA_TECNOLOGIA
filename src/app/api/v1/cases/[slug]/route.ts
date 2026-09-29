import { authenticateApiKey, apiError } from "@/modules/api-keys/auth";
import { listPublishedCaseRows } from "@/modules/cases/queries";
import { toApiCase } from "@/modules/cases/api";

export const dynamic = "force-dynamic";

/** GET /api/v1/cases/:slug — um case publicado. Escopo: cases:read. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateApiKey(req, "cases:read");
  if (!auth.ok) return auth.response;
  const { slug } = await params;
  const row = (await listPublishedCaseRows()).find((c) => c.slug === slug);
  if (!row) return apiError(404, "not_found", "Case não encontrado.");
  return Response.json({ data: toApiCase(row) }, { headers: { "Cache-Control": "no-store" } });
}
