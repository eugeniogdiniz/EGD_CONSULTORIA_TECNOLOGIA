"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { createOrganization, updateOrganization, setOrganizationStatus, inviteUser, resendInvitation, setUserActive } from "./actions";

// Wrappers de formulário: são as únicas server actions expostas deste módulo.
// Cada uma valida a sessão de admin antes de chamar o domínio.

type S<T = null> = ActionResult<T> | null;

function orgInput(fd: FormData) {
  const slug = String(fd.get("slug") ?? "").trim();
  return {
    name: String(fd.get("name") ?? ""),
    cnpj: String(fd.get("cnpj") ?? ""),
    slug: slug || undefined,
    // o campo só existe no formulário de edição; na criação fica indefinido (padrão do banco: desligado)
    weeklyDigest: fd.has("weeklyDigestField") ? fd.get("weeklyDigest") === "on" : undefined,
  };
}

export async function createOrganizationForm(_p: S<{ id: string }>, fd: FormData): Promise<S<{ id: string }>> {
  const ctx = await requireAdmin();
  const r = await createOrganization(ctx, orgInput(fd));
  if (r.ok) {
    revalidatePath("/admin/organizacoes");
    redirect(`/admin/organizacoes/${r.data.id}`);
  }
  return r;
}

export async function updateOrganizationForm(_p: S, fd: FormData): Promise<S> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateOrganization(ctx, id, orgInput(fd));
  revalidatePath(`/admin/organizacoes/${id}`);
  revalidatePath("/admin/organizacoes");
  return r;
}

export async function toggleOrganizationStatusForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  await setOrganizationStatus(ctx, id, fd.get("status") === "active" ? "active" : "inactive");
  revalidatePath(`/admin/organizacoes/${id}`);
  revalidatePath("/admin/organizacoes");
}

export async function inviteUserForm(_p: S<{ invitationId: string }>, fd: FormData): Promise<S<{ invitationId: string }>> {
  const ctx = await requireAdmin();
  const organizationId = String(fd.get("organizationId") ?? "");
  const r = await inviteUser(ctx, { email: String(fd.get("email") ?? ""), organizationId });
  revalidatePath(`/admin/organizacoes/${organizationId}`);
  return r;
}

export async function resendInvitationForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await resendInvitation(ctx, String(fd.get("invitationId") ?? ""));
  revalidatePath(`/admin/organizacoes/${String(fd.get("organizationId") ?? "")}`);
}

export async function setUserActiveForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await setUserActive(ctx, String(fd.get("userId") ?? ""), fd.get("active") === "1");
  revalidatePath(`/admin/organizacoes/${String(fd.get("organizationId") ?? "")}`);
}
