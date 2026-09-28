"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import {
  archiveProject,
  assignDeliverable,
  attachDeliverableFile,
  changeDeliverableStatus,
  changeProjectStatus,
  completeMilestone,
  createComment,
  createDependency,
  createDeliverable,
  createExpense,
  createMilestone,
  createPhase,
  createProjectFromOpportunity,
  createTemplateFromProject,
  deleteComment,
  deleteDeliverable,
  deleteDependency,
  deleteExpense,
  deleteMilestone,
  deletePhase,
  deleteTemplate,
  deleteTimeEntry,
  logManualTime,
  movePhase,
  reorderDeliverable,
  startTimer,
  stopTimer,
  unarchiveProject,
  uncompleteMilestone,
  updateAccountRate,
  updateComment,
  updateDeliverable,
  updateExpense,
  updateMilestone,
  updatePhase,
  updateProject,
  updateTemplate,
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

// Fase ────────────────────────────────────────────────────────────────────

function phaseInput(fd: FormData) {
  return {
    projectId: String(fd.get("projectId") ?? ""),
    name: String(fd.get("name") ?? ""),
    startedAt: String(fd.get("startedAt") ?? ""),
    endedAt: String(fd.get("endedAt") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  };
}

export async function createPhaseForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const r = await createPhase(ctx, phaseInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}`);
  return r;
}

export async function updatePhaseForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updatePhase(ctx, id, phaseInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  revalidatePath(`/admin/projetos/${projectId}`);
  return r;
}

export async function movePhaseForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const direction = fd.get("direction") === "down" ? "down" : "up";
  const projectId = String(fd.get("projectId") ?? "");
  await movePhase(ctx, id, direction);
  revalidatePath(`/admin/projetos/${projectId}`);
}

export async function deletePhaseForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  await deletePhase(ctx, id);
  revalidatePath(`/admin/projetos/${projectId}`);
}

// Marco ───────────────────────────────────────────────────────────────────

function milestoneInput(fd: FormData) {
  return {
    projectId: String(fd.get("projectId") ?? ""),
    phaseId: String(fd.get("phaseId") ?? ""),
    name: String(fd.get("name") ?? ""),
    dueAt: String(fd.get("dueAt") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  };
}

export async function createMilestoneForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const r = await createMilestone(ctx, milestoneInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}`);
  return r;
}

export async function updateMilestoneForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateMilestone(ctx, id, milestoneInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  revalidatePath(`/admin/projetos/${projectId}`);
  return r;
}

export async function toggleMilestoneCompletedForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const completed = fd.get("completed") === "1";
  const projectId = String(fd.get("projectId") ?? "");
  await (completed ? uncompleteMilestone(ctx, id) : completeMilestone(ctx, id));
  revalidatePath(`/admin/projetos/${projectId}`);
}

export async function deleteMilestoneForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  await deleteMilestone(ctx, id);
  revalidatePath(`/admin/projetos/${projectId}`);
}

// Entrega ─────────────────────────────────────────────────────────────────

function deliverableInput(fd: FormData) {
  return {
    projectId: String(fd.get("projectId") ?? ""),
    phaseId: String(fd.get("phaseId") ?? ""),
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    assigneeId: String(fd.get("assigneeId") ?? ""),
    dueAt: String(fd.get("dueAt") ?? ""),
  };
}

export async function createDeliverableForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const r = await createDeliverable(ctx, deliverableInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  if (r.ok) {
    revalidatePath(`/admin/projetos/${projectId}`);
    revalidatePath(`/admin/projetos/${projectId}/kanban`);
  }
  return r;
}

export async function updateDeliverableForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateDeliverable(ctx, id, deliverableInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  revalidatePath(`/admin/projetos/${projectId}`);
  revalidatePath(`/admin/projetos/${projectId}/kanban`);
  return r;
}

export async function changeDeliverableStatusForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "todo") as "todo" | "doing" | "review" | "done" | "blocked";
  const r = await changeDeliverableStatus(ctx, id, { to, blockReason: String(fd.get("blockReason") ?? "") });
  const projectId = String(fd.get("projectId") ?? "");
  revalidatePath(`/admin/projetos/${projectId}`);
  revalidatePath(`/admin/projetos/${projectId}/kanban`);
  return r;
}

export async function assignDeliverableForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const raw = String(fd.get("userId") ?? "");
  await assignDeliverable(ctx, id, raw === "" ? null : raw);
  const projectId = String(fd.get("projectId") ?? "");
  revalidatePath(`/admin/projetos/${projectId}`);
  revalidatePath(`/admin/projetos/${projectId}/kanban`);
}

export async function attachDeliverableFileForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await attachDeliverableFile(ctx, id, fd);
  const projectId = String(fd.get("projectId") ?? "");
  revalidatePath(`/admin/projetos/${projectId}/kanban`);
  return r.ok ? { ok: true, data: null } : r;
}

export async function deleteDeliverableForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  await deleteDeliverable(ctx, id);
  revalidatePath(`/admin/projetos/${projectId}`);
  revalidatePath(`/admin/projetos/${projectId}/kanban`);
}

export async function reorderDeliverableForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await reorderDeliverable(ctx, {
    deliverableId: String(fd.get("deliverableId") ?? ""),
    toStatus: String(fd.get("toStatus") ?? "todo") as
      | "todo"
      | "doing"
      | "review"
      | "done"
      | "blocked",
    toPosition: String(fd.get("toPosition") ?? "0"),
    blockReason: String(fd.get("blockReason") ?? ""),
  });
  if (r.ok) {
    revalidatePath(`/admin/projetos/${projectId}`);
    revalidatePath(`/admin/projetos/${projectId}/kanban`);
  }
  return r;
}

// Fase 3.5 — Dependência ──────────────────────────────────────────────────

export async function createDependencyForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await createDependency(ctx, {
    predecessorId: String(fd.get("predecessorId") ?? ""),
    successorId: String(fd.get("successorId") ?? ""),
  });
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}`);
  return r;
}

export async function deleteDependencyForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  await deleteDependency(ctx, {
    predecessorId: String(fd.get("predecessorId") ?? ""),
    successorId: String(fd.get("successorId") ?? ""),
  });
  revalidatePath(`/admin/projetos/${projectId}`);
}

// Fase 3.5 — Comentário ───────────────────────────────────────────────────

function commentInput(fd: FormData) {
  return {
    deliverableId: String(fd.get("deliverableId") ?? ""),
    parentId: String(fd.get("parentId") ?? ""),
    body: String(fd.get("body") ?? ""),
  };
}

export async function createCommentForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await createComment(ctx, commentInput(fd));
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}`);
  return r;
}

export async function updateCommentForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  const r = await updateComment(ctx, id, { body: String(fd.get("body") ?? "") });
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}`);
  return r;
}

export async function deleteCommentForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  await deleteComment(ctx, id);
  revalidatePath(`/admin/projetos/${projectId}`);
}

// Fase 3.5 — Timer + tempo manual ─────────────────────────────────────────

export async function startTimerForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await startTimer(ctx, {
    deliverableId: String(fd.get("deliverableId") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  });
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}`);
  return r.ok ? { ok: true, data: null } : r;
}

export async function stopTimerForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  await stopTimer(ctx, String(fd.get("entryId") ?? ""));
  revalidatePath(`/admin/projetos/${projectId}`);
}

export async function logManualTimeForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await logManualTime(ctx, {
    deliverableId: String(fd.get("deliverableId") ?? ""),
    startedAt: String(fd.get("startedAt") ?? ""),
    endedAt: String(fd.get("endedAt") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  });
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}`);
  return r.ok ? { ok: true, data: null } : r;
}

export async function deleteTimeEntryForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  await deleteTimeEntry(ctx, String(fd.get("entryId") ?? ""));
  revalidatePath(`/admin/projetos/${projectId}`);
}

// Fase 3.5 — Despesa ──────────────────────────────────────────────────────

function expenseInput(fd: FormData) {
  return {
    projectId: String(fd.get("projectId") ?? ""),
    description: String(fd.get("description") ?? ""),
    amountCents: String(fd.get("amountCents") ?? ""),
    kind: String(fd.get("kind") ?? "other") as "travel" | "service" | "equipment" | "other",
    dateAt: String(fd.get("dateAt") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  };
}

export async function createExpenseForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const r = await createExpense(ctx, expenseInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}/financeiro`);
  return r;
}

export async function updateExpenseForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateExpense(ctx, id, expenseInput(fd));
  const projectId = String(fd.get("projectId") ?? "");
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}/financeiro`);
  return r;
}

export async function deleteExpenseForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  await deleteExpense(ctx, id);
  revalidatePath(`/admin/projetos/${projectId}/financeiro`);
}

// Fase 3.5 — Template ─────────────────────────────────────────────────────

export async function createTemplateFromProjectForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const r = await createTemplateFromProject(ctx, projectId, {
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
  });
  if (r.ok) {
    revalidatePath(`/admin/projetos/${projectId}`);
    revalidatePath(`/admin/projetos/templates`);
  }
  return r;
}

export async function updateTemplateForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateTemplate(ctx, id, {
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
  });
  if (r.ok) {
    revalidatePath(`/admin/projetos/templates/${id}`);
    revalidatePath(`/admin/projetos/templates`);
  }
  return r;
}

export async function deleteTemplateForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  await deleteTemplate(ctx, id);
  revalidatePath("/admin/projetos/templates");
  redirect("/admin/projetos/templates");
}

// Fase 3.5 — Conta ────────────────────────────────────────────────────────

export async function updateAccountRateForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const raw = fd.get("hourlyRateCents");
  const r = await updateAccountRate(ctx, {
    hourlyRateCents: raw === null ? "" : String(raw),
  });
  if (r.ok) revalidatePath("/admin/conta");
  return r;
}
