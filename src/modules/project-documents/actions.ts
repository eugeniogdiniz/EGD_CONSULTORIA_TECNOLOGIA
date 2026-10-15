import { and, eq, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, project, projectDocument, projectDocumentFolder } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/pg-errors";
import { isUuid } from "@/lib/uuid";
import { deleteObjects } from "@/lib/storage";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { storeFile } from "@/modules/files/actions";
import { MAX_FILE_BYTES } from "@/modules/files/keys";
import { titleFromFilename } from "./folders";
import { documentSchema, folderSchema, type DocumentInput, type FolderInput } from "./validation";

const MAX_FILES_PER_UPLOAD = 20;

async function findFolder(id: string) {
  if (!isUuid(id)) return null;
  return (await db.query.projectDocumentFolder.findFirst({ where: eq(projectDocumentFolder.id, id) })) ?? null;
}

async function activeProject(projectId: string) {
  if (!isUuid(projectId)) return null;
  return (
    (await db.query.project.findFirst({ where: eq(project.id, projectId), columns: { id: true, archivedAt: true } })) ?? null
  );
}

// Pastas ──────────────────────────────────────────────────────────────────

export async function createFolder(ctx: AdminContext, projectId: string, input: FolderInput): Promise<ActionResult<{ id: string }>> {
  const p = await activeProject(projectId);
  if (!p) return fail("Projeto não encontrado.");
  if (p.archivedAt) return fail("Projeto arquivado: desarquive para mexer nos documentos.");
  const parsed = folderSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(${max(projectDocumentFolder.position)}, -1) + 1` })
      .from(projectDocumentFolder)
      .where(eq(projectDocumentFolder.projectId, projectId));
    const [row] = await db
      .insert(projectDocumentFolder)
      .values({ projectId, name: parsed.data.name, visibleToClient: parsed.data.visibleToClient, position: next })
      .returning({ id: projectDocumentFolder.id });
    await audit({ actorId: ctx.user.id, action: "project.folder.created", entityType: "project_document_folder", entityId: row.id, metadata: { projectId, name: parsed.data.name } });
    return ok({ id: row.id });
  } catch (err) {
    if (isUniqueViolation(err)) return fail("Já existe uma pasta com esse nome.", { name: ["Em uso"] });
    throw err;
  }
}

export async function updateFolder(ctx: AdminContext, id: string, input: FolderInput): Promise<ActionResult<null>> {
  const folder = await findFolder(id);
  if (!folder) return fail("Pasta não encontrada.");
  const parsed = folderSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    await db
      .update(projectDocumentFolder)
      .set({ name: parsed.data.name, visibleToClient: parsed.data.visibleToClient })
      .where(eq(projectDocumentFolder.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) return fail("Já existe uma pasta com esse nome.", { name: ["Em uso"] });
    throw err;
  }
  await audit({
    actorId: ctx.user.id,
    action: "project.folder.updated",
    entityType: "project_document_folder",
    entityId: id,
    metadata: { projectId: folder.projectId, name: parsed.data.name, visibleToClient: parsed.data.visibleToClient },
  });
  return ok(null);
}

/** Pastas padrão não se apagam (recebem os documentos do sistema); as demais só vazias. */
export async function deleteFolder(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  const folder = await findFolder(id);
  if (!folder) return fail("Pasta não encontrada.");
  if (folder.systemKey) return fail("Pastas padrão não podem ser excluídas. Renomeie ou deixe interna.");
  const [inUse] = await db.select({ id: projectDocument.id }).from(projectDocument).where(eq(projectDocument.folderId, id)).limit(1);
  if (inUse) return fail("Mova ou exclua os documentos da pasta antes.");
  await db.delete(projectDocumentFolder).where(eq(projectDocumentFolder.id, id));
  await audit({ actorId: ctx.user.id, action: "project.folder.deleted", entityType: "project_document_folder", entityId: id, metadata: { projectId: folder.projectId, name: folder.name } });
  return ok(null);
}

// Documentos ──────────────────────────────────────────────────────────────

/**
 * Envia um ou mais arquivos para uma pasta. Os arquivos ficam internos (sem
 * organização dona): o cliente só os alcança pelo GED do projeto, e só se a
 * pasta estiver compartilhada. Título informado vale quando é um arquivo só.
 */
export async function uploadDocuments(
  ctx: AdminContext,
  input: { folderId: string; title?: string; notes?: string; files: File[] },
): Promise<ActionResult<{ ids: string[] }>> {
  const folder = await findFolder(input.folderId);
  if (!folder) return fail("Escolha uma pasta.", { folderId: ["Obrigatório"] });
  const p = await activeProject(folder.projectId);
  if (!p) return fail("Projeto não encontrado.");
  if (p.archivedAt) return fail("Projeto arquivado: desarquive para mexer nos documentos.");

  const list = input.files.filter((f) => f.size > 0);
  if (list.length === 0) return fail("Selecione ao menos um arquivo.", { files: ["Obrigatório"] });
  if (list.length > MAX_FILES_PER_UPLOAD) return fail(`Envie no máximo ${MAX_FILES_PER_UPLOAD} arquivos por vez.`, { files: ["Muitos arquivos"] });
  const big = list.find((f) => f.size > MAX_FILE_BYTES);
  if (big) return fail(`"${big.name}" passa de 50 MB.`, { files: ["Máximo 50 MB por arquivo"] });

  const single = list.length === 1;
  const meta = documentSchema.safeParse({
    folderId: folder.id,
    title: single && input.title?.trim() ? input.title : titleFromFilename(list[0].name),
    notes: input.notes ?? "",
  });
  if (!meta.success) return fromZod(meta.error);

  const ids: string[] = [];
  for (const file of list) {
    const stored = await storeFile(ctx, file, null);
    if (!stored.ok) return ids.length ? fail(`${ids.length} enviado(s); falhou em "${file.name}": ${stored.error}`) : stored;
    const [row] = await db
      .insert(projectDocument)
      .values({
        projectId: folder.projectId,
        folderId: folder.id,
        fileId: stored.data.id,
        title: single ? meta.data.title : titleFromFilename(file.name),
        notes: meta.data.notes ?? null,
        uploadedBy: ctx.user.id,
      })
      .returning({ id: projectDocument.id });
    ids.push(row.id);
    await audit({
      actorId: ctx.user.id,
      action: "project.document.uploaded",
      entityType: "project_document",
      entityId: row.id,
      metadata: { projectId: folder.projectId, folderId: folder.id, fileId: stored.data.id, name: file.name },
    });
  }
  return ok({ ids });
}

/** Renomeia, anota ou move de pasta (sempre dentro do mesmo projeto). */
export async function updateDocument(ctx: AdminContext, id: string, input: DocumentInput): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Documento não encontrado.");
  const doc = await db.query.projectDocument.findFirst({ where: eq(projectDocument.id, id) });
  if (!doc) return fail("Documento não encontrado.");
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const target = await db.query.projectDocumentFolder.findFirst({
    where: and(eq(projectDocumentFolder.id, parsed.data.folderId), eq(projectDocumentFolder.projectId, doc.projectId)),
    columns: { id: true },
  });
  if (!target) return fail("Pasta não encontrada.", { folderId: ["Inválida"] });
  await db
    .update(projectDocument)
    .set({ folderId: target.id, title: parsed.data.title, notes: parsed.data.notes ?? null })
    .where(eq(projectDocument.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.document.updated",
    entityType: "project_document",
    entityId: id,
    metadata: { projectId: doc.projectId, title: parsed.data.title, ...(target.id !== doc.folderId ? { movedFrom: doc.folderId, movedTo: target.id } : {}) },
  });
  return ok(null);
}

/** Exclui o documento e o arquivo (registro e objeto no storage). */
export async function deleteDocument(ctx: AdminContext, id: string): Promise<ActionResult<{ projectId: string }>> {
  if (!isUuid(id)) return fail("Documento não encontrado.");
  const [row] = await db
    .select({ doc: projectDocument, bucketKey: files.bucketKey })
    .from(projectDocument)
    .innerJoin(files, eq(projectDocument.fileId, files.id))
    .where(eq(projectDocument.id, id))
    .limit(1);
  if (!row) return fail("Documento não encontrado.");
  // apagar o arquivo leva o documento junto (fk com cascade)
  await db.delete(files).where(eq(files.id, row.doc.fileId));
  try {
    await deleteObjects([row.bucketKey]);
  } catch {
    // objeto órfão no bucket não afeta o sistema; o backup/limpeza resolve
  }
  await audit({
    actorId: ctx.user.id,
    action: "project.document.deleted",
    entityType: "project_document",
    entityId: id,
    metadata: { projectId: row.doc.projectId, title: row.doc.title, fileId: row.doc.fileId },
  });
  return ok({ projectId: row.doc.projectId });
}
