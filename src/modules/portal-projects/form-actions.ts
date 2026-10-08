"use server";

import { revalidatePath } from "next/cache";
import { requirePortal } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import {
  createClientComment,
  decideDeliverable,
  deleteClientComment,
  updateClientComment,
} from "./actions";

type NullState = ActionResult<null> | null;
type CreateState = ActionResult<{ id: string }> | null;

const page = (projectId: string, deliverableId: string) =>
  `/portal/projetos/${projectId}/entregas/${deliverableId}`;

export async function createClientCommentForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requirePortal();
  const projectId = String(fd.get("projectId") ?? "");
  const deliverableId = String(fd.get("deliverableId") ?? "");
  const r = await createClientComment(ctx, {
    deliverableId,
    parentId: String(fd.get("parentId") ?? ""),
    body: String(fd.get("body") ?? ""),
  });
  if (r.ok) revalidatePath(page(projectId, deliverableId));
  return r;
}

export async function updateClientCommentForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requirePortal();
  const r = await updateClientComment(ctx, String(fd.get("id") ?? ""), {
    body: String(fd.get("body") ?? ""),
  });
  if (r.ok) revalidatePath(page(String(fd.get("projectId") ?? ""), String(fd.get("deliverableId") ?? "")));
  return r;
}

export async function deleteClientCommentForm(fd: FormData): Promise<void> {
  const ctx = await requirePortal();
  await deleteClientComment(ctx, String(fd.get("id") ?? ""));
  revalidatePath(page(String(fd.get("projectId") ?? ""), String(fd.get("deliverableId") ?? "")));
}

export async function decideDeliverableForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requirePortal();
  const projectId = String(fd.get("projectId") ?? "");
  const deliverableId = String(fd.get("deliverableId") ?? "");
  const r = await decideDeliverable(ctx, { deliverableId, decision: String(fd.get("decision") ?? ""), notes: String(fd.get("notes") ?? "") });
  if (r.ok) {
    revalidatePath(page(projectId, deliverableId));
    revalidatePath(`/portal/projetos/${projectId}`);
    revalidatePath(`/admin/projetos/${projectId}/entregas/${deliverableId}`);
  }
  return r;
}
