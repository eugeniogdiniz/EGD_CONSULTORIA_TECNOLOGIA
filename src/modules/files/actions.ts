import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { files } from "@/db/schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { putObject, getSignedDownloadUrl } from "@/lib/storage";
import { audit } from "@/modules/audit/log";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { buildBucketKey, MAX_FILE_BYTES } from "./keys";
import { getFileForContext } from "./queries";

const DEFAULT_MIME = "application/octet-stream";

/**
 * Grava um arquivo no storage e na tabela `files`. Admin escolhe a organização
 * (nula = interno); cliente só grava na própria organização ativa (Fase 15).
 * Recebe o contexto de quem chama (page/route handler), nunca do cliente.
 */
export async function storeFile(
  ctx: AdminContext | PortalContext,
  file: File,
  organizationId: string | null,
): Promise<ActionResult<{ id: string }>> {
  if (ctx.kind === "portal") organizationId = ctx.organization.id;
  if (file.size === 0) return fail("Selecione um arquivo.", { file: ["Obrigatório"] });
  if (file.size > MAX_FILE_BYTES) return fail("Arquivo acima de 50 MB.", { file: ["Máximo 50 MB"] });

  const id = randomUUID();
  const mimeType = file.type || DEFAULT_MIME;
  const bucketKey = buildBucketKey({ organizationId, fileId: id, filename: file.name });

  await putObject(bucketKey, Buffer.from(await file.arrayBuffer()), mimeType);
  await db.insert(files).values({
    id,
    bucketKey,
    originalName: file.name,
    mimeType,
    sizeBytes: file.size,
    organizationId,
    uploadedBy: ctx.user.id,
  });
  await audit({
    actorId: ctx.user.id,
    action: "file.uploaded",
    entityType: "file",
    entityId: id,
    organizationId,
    metadata: { name: file.name, size: file.size, mimeType },
  });
  return ok({ id });
}

/** Upload pelo formulário do admin (`file` + `organizationId` vazio = interno). */
export async function uploadFile(ctx: AdminContext, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const file = formData.get("file");
  const orgRaw = formData.get("organizationId");
  const orgParsed = z.uuid().nullable().safeParse(orgRaw ? String(orgRaw) : null);
  if (!orgParsed.success) return fail("Organização inválida.", { organizationId: ["Inválida"] });
  if (!(file instanceof File) || file.size === 0) return fail("Selecione um arquivo.", { file: ["Obrigatório"] });
  return storeFile(ctx, file, orgParsed.data);
}

/** URL assinada (5 min) para download, após checar que o contexto pode ver o arquivo. */
export async function getDownloadUrl(
  ctx: AdminContext | PortalContext,
  fileId: string,
): Promise<ActionResult<{ url: string }>> {
  const f = await getFileForContext(ctx, fileId);
  if (!f) return fail("Arquivo não encontrado.");
  await audit({
    actorId: ctx.user.id,
    action: "file.downloaded",
    entityType: "file",
    entityId: f.id,
    organizationId: f.organizationId,
  });
  return ok({ url: await getSignedDownloadUrl(f.bucketKey, f.originalName) });
}
