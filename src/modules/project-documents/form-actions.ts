"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { createFolder, deleteDocument, deleteFolder, updateDocument, updateFolder, uploadDocuments } from "./actions";

type NullState = ActionResult<null> | null;
export type UploadDocumentsState = ActionResult<{ ids: string[] }> | null;
type CreateState = ActionResult<{ id: string }> | null;

const docsPath = (projectId: string) => `/admin/projetos/${projectId}/documentos`;

function revalidate(projectId: string) {
  revalidatePath(docsPath(projectId));
  revalidatePath(`/portal/projetos/${projectId}/documentos`);
}

export async function uploadDocumentsForm(_p: UploadDocumentsState, fd: FormData): Promise<UploadDocumentsState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await uploadDocuments(ctx, {
    folderId: String(fd.get("folderId") ?? ""),
    title: String(fd.get("title") ?? ""),
    notes: String(fd.get("notes") ?? ""),
    files: fd.getAll("files").filter((f): f is File => f instanceof File),
  });
  if (r.ok) revalidate(projectId);
  return r;
}

export async function updateDocumentForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await updateDocument(ctx, String(fd.get("id") ?? ""), {
    folderId: String(fd.get("folderId") ?? ""),
    title: String(fd.get("title") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  });
  if (r.ok) revalidate(projectId);
  return r;
}

export async function deleteDocumentForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const r = await deleteDocument(ctx, String(fd.get("id") ?? ""));
  if (r.ok) revalidate(r.data.projectId);
}

export async function createFolderForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await createFolder(ctx, projectId, {
    name: String(fd.get("name") ?? ""),
    visibleToClient: fd.get("visibleToClient") === "on",
  });
  if (r.ok) revalidate(projectId);
  return r;
}

export async function updateFolderForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await updateFolder(ctx, String(fd.get("id") ?? ""), {
    name: String(fd.get("name") ?? ""),
    visibleToClient: fd.get("visibleToClient") === "on",
  });
  if (r.ok) revalidate(projectId);
  return r;
}

export async function deleteFolderForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await deleteFolder(ctx, String(fd.get("id") ?? ""));
  if (r.ok) revalidate(projectId);
  return r;
}
