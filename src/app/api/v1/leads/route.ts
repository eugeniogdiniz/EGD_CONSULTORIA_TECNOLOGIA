import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { leads } from "@/db/schema";
import { audit } from "@/modules/audit/log";
import { authenticateApiKey, apiError } from "@/modules/api-keys/auth";
import { leadSchema } from "@/modules/leads/validation";
import { sendLeadNotification } from "@/modules/mail/send";
import { notifyLeadCreated } from "@/modules/notifications/events";

export const dynamic = "force-dynamic";

/** Um lead cabe em poucos KB (mensagem até 4000 caracteres); acima disso é abuso. */
const MAX_BODY_BYTES = 32 * 1024;

/**
 * POST /api/v1/leads — webhook de entrada: sistemas parceiros enviam leads em JSON.
 * Mesma validação do formulário do site; o lead entra com source "api". Escopo: leads:write.
 */
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req, "leads:write");
  if (!auth.ok) return auth.response;

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES)
    return apiError(413, "payload_too_large", "O corpo excede 32 KB.");
  let body: unknown;
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return apiError(413, "payload_too_large", "O corpo excede 32 KB.");
    body = JSON.parse(raw);
  } catch {
    return apiError(400, "invalid_json", "O corpo precisa ser JSON.");
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "validation_error", message: "Dados inválidos.", fields: parsed.error.flatten().fieldErrors } },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  // sem IP de origem em chamadas servidor-a-servidor: identifica o remetente pela chave
  const ipHash = createHmac("sha256", env.BETTER_AUTH_SECRET).update(`api-key:${auth.key.id}`).digest("hex").slice(0, 32);
  const [row] = await db
    .insert(leads)
    .values({ ...parsed.data, ipHash, source: "api" })
    .returning({ id: leads.id });
  await audit({
    actorId: null,
    action: "lead.created",
    entityType: "lead",
    entityId: row.id,
    metadata: { email: parsed.data.email, company: parsed.data.company, source: "api", apiKeyId: auth.key.id },
  });
  await sendLeadNotification({
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company,
    message: parsed.data.message,
  });
  await notifyLeadCreated({ leadId: row.id, name: parsed.data.name, email: parsed.data.email, company: parsed.data.company ?? null, message: parsed.data.message });
  return Response.json({ data: { id: row.id } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
