"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";

type NullState = ActionResult<null> | null;

const revalidate = (id: string, proposalId?: string) => {
  revalidatePath(`/admin/crm/contratos/${id}`);
  revalidatePath("/admin/crm/contratos");
  if (proposalId) revalidatePath(`/admin/crm/propostas/${proposalId}`);
};

export async function createContractForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  const proposalId = String(fd.get("proposalId") ?? "");
  const { createContractFromProposal } = await import("./actions");
  const r = await createContractFromProposal(ctx, proposalId);
  revalidatePath(`/admin/crm/propostas/${proposalId}`);
  if (r.ok) redirect(`/admin/crm/contratos/${r.data.id}`);
}

export async function updateContractDocumentForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  let doc: unknown = {};
  try {
    doc = JSON.parse(String(fd.get("document") ?? "{}"));
  } catch {
    return { ok: false, error: "Documento inválido." };
  }
  const { updateContractDocument } = await import("./actions");
  const r = await updateContractDocument(ctx, id, doc);
  if (r.ok) revalidate(id);
  return r;
}

export async function generateContractPdfForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const { generateContractPdf } = await import("./actions");
  await generateContractPdf(ctx, id);
  revalidate(id);
}

export async function issueContractForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const { issueContract } = await import("./actions");
  await issueContract(ctx, id);
  revalidate(id, String(fd.get("proposalId") ?? "") || undefined);
}

export async function reopenContractForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const { reopenContract } = await import("./actions");
  await reopenContract(ctx, id);
  revalidate(id, String(fd.get("proposalId") ?? "") || undefined);
}

export async function markContractSignedForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const { markContractSigned } = await import("./actions");
  const r = await markContractSigned(ctx, id, String(fd.get("signedAt") ?? ""));
  if (r.ok) revalidate(id, String(fd.get("proposalId") ?? "") || undefined);
  return r;
}

export async function attachSignedContractForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const { attachSignedContract } = await import("./actions");
  const r = await attachSignedContract(ctx, id, fd);
  if (r.ok) revalidate(id, String(fd.get("proposalId") ?? "") || undefined);
  return r.ok ? { ok: true, data: null } : r;
}

export async function generateAcceptanceTermForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireOwner();
  const deliverableId = String(fd.get("deliverableId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  const { generateAcceptanceTerm } = await import("./actions");
  const r = await generateAcceptanceTerm(ctx, deliverableId, { reservations: String(fd.get("reservations") ?? "") });
  if (r.ok) revalidatePath(`/admin/projetos/${projectId}/entregas/${deliverableId}`);
  return r.ok ? { ok: true, data: null } : r;
}
