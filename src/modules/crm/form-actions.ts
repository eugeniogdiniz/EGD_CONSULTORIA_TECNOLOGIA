"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import {
  archiveCompany,
  archiveContact,
  changeOpportunityStage,
  changeProposalStatus,
  createCompany,
  createContact,
  createInteraction,
  createOpportunity,
  createProposal,
  deleteInteraction,
  linkCompanyToOrganization,
  unarchiveCompany,
  unarchiveContact,
  updateCompany,
  updateContact,
  updateInteraction,
  updateOpportunity,
  updateProposal,
} from "./actions";

// Empresas ────────────────────────────────────────────────────────────────

type CompanyState = ActionResult<{ id: string; slug: string }> | null;

function companyInput(fd: FormData) {
  const source = String(fd.get("source") ?? "outbound");
  return {
    name: String(fd.get("name") ?? ""),
    cnpj: String(fd.get("cnpj") ?? ""),
    website: String(fd.get("website") ?? ""),
    industry: String(fd.get("industry") ?? ""),
    size: String(fd.get("size") ?? ""),
    source: (["site_contact", "referral", "event", "outbound", "other"].includes(source) ? source : "outbound") as
      | "site_contact"
      | "referral"
      | "event"
      | "outbound"
      | "other",
    notes: String(fd.get("notes") ?? ""),
  };
}

export async function createCompanyForm(_p: CompanyState, fd: FormData): Promise<CompanyState> {
  const ctx = await requireAdmin();
  const r = await createCompany(ctx, companyInput(fd));
  if (r.ok) {
    revalidatePath("/admin/crm/empresas");
    redirect(`/admin/crm/empresas/${r.data.id}`);
  }
  return r;
}

type NullState = ActionResult<null> | null;

export async function updateCompanyForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateCompany(ctx, id, companyInput(fd));
  revalidatePath(`/admin/crm/empresas/${id}`);
  revalidatePath("/admin/crm/empresas");
  return r;
}

export async function toggleCompanyArchivedForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const currentlyArchived = fd.get("archived") === "1";
  await (currentlyArchived ? unarchiveCompany(ctx, id) : archiveCompany(ctx, id));
  revalidatePath(`/admin/crm/empresas/${id}`);
  revalidatePath("/admin/crm/empresas");
}

export async function linkCompanyForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const companyId = String(fd.get("companyId") ?? "");
  const rawOrg = String(fd.get("organizationId") ?? "");
  const organizationId = rawOrg === "" ? null : rawOrg;
  await linkCompanyToOrganization(ctx, companyId, organizationId);
  revalidatePath(`/admin/crm/empresas/${companyId}`);
}

// Contatos ────────────────────────────────────────────────────────────────

function contactInput(fd: FormData) {
  const role = String(fd.get("role") ?? "primary");
  return {
    companyId: String(fd.get("companyId") ?? ""),
    name: String(fd.get("name") ?? ""),
    email: String(fd.get("email") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    role: (["primary", "technical", "financial", "other"].includes(role) ? role : "primary") as
      | "primary"
      | "technical"
      | "financial"
      | "other",
    title: String(fd.get("title") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  };
}

type ContactState = ActionResult<{ id: string }> | null;

export async function createContactForm(_p: ContactState, fd: FormData): Promise<ContactState> {
  const ctx = await requireAdmin();
  const r = await createContact(ctx, contactInput(fd));
  if (r.ok) revalidatePath(`/admin/crm/empresas/${contactInput(fd).companyId}`);
  return r;
}

export async function updateContactForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateContact(ctx, id, contactInput(fd));
  revalidatePath(`/admin/crm/empresas/${contactInput(fd).companyId}`);
  return r;
}

export async function toggleContactArchivedForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const companyId = String(fd.get("companyId") ?? "");
  const currentlyArchived = fd.get("archived") === "1";
  await (currentlyArchived ? unarchiveContact(ctx, id) : archiveContact(ctx, id));
  revalidatePath(`/admin/crm/empresas/${companyId}`);
}

// Oportunidades ───────────────────────────────────────────────────────────

function opportunityInput(fd: FormData) {
  const stage = String(fd.get("stage") ?? "new");
  return {
    companyId: String(fd.get("companyId") ?? ""),
    primaryContactId: String(fd.get("primaryContactId") ?? ""),
    title: String(fd.get("title") ?? ""),
    stage: (["new", "qualified", "meeting", "proposal", "won", "lost"].includes(stage) ? stage : "new") as
      | "new"
      | "qualified"
      | "meeting"
      | "proposal"
      | "won"
      | "lost",
    valueCents: String(fd.get("valueCents") ?? ""),
    expectedCloseAt: String(fd.get("expectedCloseAt") ?? ""),
    nextStep: String(fd.get("nextStep") ?? ""),
    nextStepAt: String(fd.get("nextStepAt") ?? ""),
  };
}

type OpportunityState = ActionResult<{ id: string }> | null;

export async function createOpportunityForm(_p: OpportunityState, fd: FormData): Promise<OpportunityState> {
  const ctx = await requireAdmin();
  const r = await createOpportunity(ctx, opportunityInput(fd));
  const companyId = opportunityInput(fd).companyId;
  if (r.ok) {
    revalidatePath(`/admin/crm/empresas/${companyId}`);
    revalidatePath("/admin/crm/funil");
    redirect(`/admin/crm/oportunidades/${r.data.id}`);
  }
  return r;
}

export async function updateOpportunityForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateOpportunity(ctx, id, opportunityInput(fd));
  revalidatePath(`/admin/crm/oportunidades/${id}`);
  revalidatePath("/admin/crm/funil");
  return r;
}

export async function changeOpportunityStageForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "new") as
    | "new"
    | "qualified"
    | "meeting"
    | "proposal"
    | "won"
    | "lost";
  const lostReason = String(fd.get("lostReason") ?? "");
  await changeOpportunityStage(ctx, id, { to, lostReason });
  revalidatePath(`/admin/crm/oportunidades/${id}`);
  revalidatePath("/admin/crm/funil");
}

// Interações ──────────────────────────────────────────────────────────────

function interactionInput(fd: FormData) {
  const type = String(fd.get("type") ?? "note") as "call" | "email" | "meeting" | "note";
  return {
    type,
    at: String(fd.get("at") ?? new Date().toISOString()),
    summary: String(fd.get("summary") ?? ""),
    body: String(fd.get("body") ?? ""),
    companyId: String(fd.get("companyId") ?? ""),
    contactId: String(fd.get("contactId") ?? ""),
    opportunityId: String(fd.get("opportunityId") ?? ""),
  };
}

type InteractionState = ActionResult<{ id: string }> | null;

export async function createInteractionForm(_p: InteractionState, fd: FormData): Promise<InteractionState> {
  const ctx = await requireAdmin();
  const r = await createInteraction(ctx, interactionInput(fd));
  const back = String(fd.get("_back") ?? "");
  if (r.ok && back) revalidatePath(back);
  return r;
}

export async function updateInteractionForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateInteraction(ctx, id, interactionInput(fd));
  const back = String(fd.get("_back") ?? "");
  if (back) revalidatePath(back);
  return r;
}

export async function deleteInteractionForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const back = String(fd.get("_back") ?? "");
  await deleteInteraction(ctx, id);
  if (back) revalidatePath(back);
}

// Propostas ───────────────────────────────────────────────────────────────

function proposalInput(fd: FormData) {
  return {
    opportunityId: String(fd.get("opportunityId") ?? ""),
    title: String(fd.get("title") ?? ""),
    valueCents: String(fd.get("valueCents") ?? "0"),
    validUntil: String(fd.get("validUntil") ?? ""),
  };
}

type ProposalState = ActionResult<{ id: string; number: string }> | null;

export async function createProposalForm(_p: ProposalState, fd: FormData): Promise<ProposalState> {
  const ctx = await requireAdmin();
  const r = await createProposal(ctx, proposalInput(fd));
  if (r.ok) {
    revalidatePath(`/admin/crm/propostas`);
    revalidatePath(`/admin/crm/oportunidades/${proposalInput(fd).opportunityId}`);
    redirect(`/admin/crm/propostas/${r.data.id}`);
  }
  return r;
}

export async function updateProposalForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateProposal(ctx, id, proposalInput(fd));
  revalidatePath(`/admin/crm/propostas/${id}`);
  return r;
}

export async function attachProposalFileForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const { attachProposalFile } = await import("./actions");
  const r = await attachProposalFile(ctx, id, fd);
  revalidatePath(`/admin/crm/propostas/${id}`);
  return r.ok ? { ok: true, data: null } : r;
}

export async function changeProposalStatusForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "draft") as "draft" | "sent" | "accepted" | "rejected" | "expired";
  await changeProposalStatus(ctx, id, {
    to,
    decisionNotes: String(fd.get("decisionNotes") ?? ""),
    sentAt: String(fd.get("sentAt") ?? ""),
    validUntil: String(fd.get("validUntil") ?? ""),
  });
  revalidatePath(`/admin/crm/propostas/${id}`);
  revalidatePath("/admin/crm/propostas");
}
