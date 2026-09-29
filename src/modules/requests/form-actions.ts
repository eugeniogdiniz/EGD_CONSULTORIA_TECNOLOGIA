"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requirePortal } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { createRequest, replyAsClient, replyAsTeam, resolveAsClient, setRequestStatus } from "./actions";

type NullState = ActionResult<null> | null;
type CreateState = ActionResult<{ id: string }> | null;

export async function createRequestForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requirePortal();
  const r = await createRequest(ctx, {
    title: String(fd.get("title") ?? ""),
    body: String(fd.get("body") ?? ""),
    projectId: String(fd.get("projectId") ?? ""),
  });
  if (r.ok) {
    revalidatePath("/portal/solicitacoes");
    redirect(`/portal/solicitacoes/${r.data.id}`);
  }
  return r;
}

export async function replyAsClientForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requirePortal();
  const requestId = String(fd.get("requestId") ?? "");
  const r = await replyAsClient(ctx, { requestId, body: String(fd.get("body") ?? "") });
  if (r.ok) {
    revalidatePath(`/portal/solicitacoes/${requestId}`);
    revalidatePath("/portal/solicitacoes");
  }
  return r;
}

export async function resolveAsClientForm(fd: FormData): Promise<void> {
  const ctx = await requirePortal();
  const id = String(fd.get("id") ?? "");
  await resolveAsClient(ctx, id);
  revalidatePath(`/portal/solicitacoes/${id}`);
  revalidatePath("/portal/solicitacoes");
}

export async function replyAsTeamForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const requestId = String(fd.get("requestId") ?? "");
  const r = await replyAsTeam(ctx, { requestId, body: String(fd.get("body") ?? "") });
  if (r.ok) {
    revalidatePath(`/admin/solicitacoes/${requestId}`);
    revalidatePath("/admin/solicitacoes");
    revalidatePath("/admin");
  }
  return r;
}

export async function setRequestStatusForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  await setRequestStatus(ctx, id, String(fd.get("status") ?? ""));
  revalidatePath(`/admin/solicitacoes/${id}`);
  revalidatePath("/admin/solicitacoes");
  revalidatePath("/admin");
}
