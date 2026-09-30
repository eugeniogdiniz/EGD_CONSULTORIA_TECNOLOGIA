"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import type { Priority } from "@/modules/projects/priority";
import { addActionItem, createMeeting, deleteMeeting, setMeetingShared, updateMeeting } from "./actions";

type NullState = ActionResult<null> | null;
type CreateState = ActionResult<{ id: string }> | null;
type ItemState = ActionResult<{ deliverableId: string }> | null;

function meetingInput(fd: FormData) {
  return {
    projectId: String(fd.get("projectId") ?? ""),
    companyId: String(fd.get("companyId") ?? ""),
    title: String(fd.get("title") ?? ""),
    heldAt: String(fd.get("heldAt") ?? ""),
    location: String(fd.get("location") ?? ""),
    agenda: String(fd.get("agenda") ?? ""),
    discussion: String(fd.get("discussion") ?? ""),
    decisions: String(fd.get("decisions") ?? ""),
    teamIds: fd.getAll("teamIds").map(String),
    externals: String(fd.get("externals") ?? ""),
  };
}

function revalidateMeeting(id: string, projectId: string | null) {
  revalidatePath("/admin/atas");
  revalidatePath(`/admin/atas/${id}`);
  if (projectId) revalidatePath(`/admin/projetos/${projectId}/atas`);
  revalidatePath("/portal/atas");
}

export async function createMeetingForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const r = await createMeeting(ctx, meetingInput(fd));
  if (r.ok) {
    revalidateMeeting(r.data.id, String(fd.get("projectId") ?? "") || null);
    redirect(`/admin/atas/${r.data.id}`);
  }
  return r;
}

export async function updateMeetingForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateMeeting(ctx, id, meetingInput(fd));
  if (r.ok) {
    revalidateMeeting(id, String(fd.get("projectId") ?? "") || null);
    revalidatePath(`/portal/atas/${id}`);
    redirect(`/admin/atas/${id}`);
  }
  return r;
}

export async function deleteMeetingForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await deleteMeeting(ctx, id);
  if (r.ok) {
    revalidateMeeting(id, r.data.projectId);
    redirect(r.data.projectId ? `/admin/projetos/${r.data.projectId}/atas` : "/admin/atas");
  }
}

export async function setMeetingSharedForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await setMeetingShared(ctx, id, fd.get("shared") === "1");
  if (r.ok) {
    revalidatePath(`/admin/atas/${id}`);
    revalidatePath("/admin/atas");
    revalidatePath("/portal/atas");
    revalidatePath(`/portal/atas/${id}`);
  }
  return r;
}

export async function addActionItemForm(_p: ItemState, fd: FormData): Promise<ItemState> {
  const ctx = await requireAdmin();
  const meetingId = String(fd.get("meetingId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  const r = await addActionItem(ctx, {
    meetingId,
    projectId,
    title: String(fd.get("title") ?? ""),
    assigneeId: String(fd.get("assigneeId") ?? ""),
    dueAt: String(fd.get("dueAt") ?? ""),
    priority: String(fd.get("priority") ?? "medium") as Priority,
    visibleToClient: fd.get("visibleToClient") === "on",
  });
  if (r.ok) {
    revalidatePath(`/admin/atas/${meetingId}`);
    revalidatePath(`/portal/atas/${meetingId}`);
    revalidatePath(`/admin/projetos/${projectId}/kanban`);
    revalidatePath("/admin/demandas");
  }
  return r;
}
