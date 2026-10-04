"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { setUserActive } from "@/modules/tenancy/actions";
import { inviteTeamMember, resendTeamInvitation, setUserRole } from "./actions";

type S<T = null> = ActionResult<T> | null;

export async function inviteTeamMemberForm(_p: S<{ invitationId: string }>, fd: FormData): Promise<S<{ invitationId: string }>> {
  const ctx = await requireOwner();
  const r = await inviteTeamMember(ctx, { email: String(fd.get("email") ?? ""), role: String(fd.get("role") ?? "collaborator") });
  revalidatePath("/admin/equipe");
  return r;
}

export async function resendTeamInvitationForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await resendTeamInvitation(ctx, String(fd.get("invitationId") ?? ""));
  revalidatePath("/admin/equipe");
}

export async function setUserRoleForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await setUserRole(ctx, String(fd.get("userId") ?? ""), String(fd.get("role") ?? ""));
  revalidatePath("/admin/equipe");
}

export async function setTeamUserActiveForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await setUserActive(ctx, String(fd.get("userId") ?? ""), fd.get("active") === "1");
  revalidatePath("/admin/equipe");
}
