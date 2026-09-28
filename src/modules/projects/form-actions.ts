"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import {
  archiveProject,
  changeProjectStatus,
  createProjectFromOpportunity,
  unarchiveProject,
  updateProject,
} from "./actions";

type NullState = ActionResult<null> | null;
type CreateState = ActionResult<{ id: string }> | null;

// Projeto ─────────────────────────────────────────────────────────────────

export async function createProjectFromOpportunityForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const opportunityId = String(fd.get("opportunityId") ?? "");
  const r = await createProjectFromOpportunity(ctx, opportunityId, {
    title: String(fd.get("title") ?? ""),
    copyValue: fd.get("copyValue") === "on",
  });
  if (r.ok) {
    revalidatePath("/admin/projetos");
    revalidatePath(`/admin/crm/oportunidades/${opportunityId}`);
    redirect(`/admin/projetos/${r.data.id}`);
  }
  return r;
}

function projectInput(fd: FormData) {
  return {
    title: String(fd.get("title") ?? ""),
    budgetCents: String(fd.get("budgetCents") ?? ""),
    startedAt: String(fd.get("startedAt") ?? ""),
    endedAt: String(fd.get("endedAt") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  };
}

export async function updateProjectForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateProject(ctx, id, projectInput(fd));
  revalidatePath(`/admin/projetos/${id}`);
  revalidatePath("/admin/projetos");
  return r;
}

export async function changeProjectStatusForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "planning") as
    | "planning"
    | "active"
    | "on_hold"
    | "delivered"
    | "cancelled";
  await changeProjectStatus(ctx, id, { to });
  revalidatePath(`/admin/projetos/${id}`);
  revalidatePath("/admin/projetos");
}

export async function toggleProjectArchivedForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const archived = fd.get("archived") === "1";
  await (archived ? unarchiveProject(ctx, id) : archiveProject(ctx, id));
  revalidatePath(`/admin/projetos/${id}`);
  revalidatePath("/admin/projetos");
}
