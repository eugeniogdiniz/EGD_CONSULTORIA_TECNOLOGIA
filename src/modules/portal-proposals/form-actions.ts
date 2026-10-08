"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requirePortal } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { decideProposal } from "./actions";

export async function decideProposalForm(_p: ActionResult<null> | null, fd: FormData): Promise<ActionResult<null> | null> {
  const ctx = await requirePortal();
  const h = await headers();
  const id = String(fd.get("id") ?? "");
  const r = await decideProposal(
    ctx,
    id,
    { decision: String(fd.get("decision") ?? "") as "accepted" | "rejected", name: String(fd.get("name") ?? ""), agree: fd.get("agree") === "on", notes: String(fd.get("notes") ?? "") },
    { ip: h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null, userAgent: h.get("user-agent") },
  );
  if (r.ok) {
    revalidatePath(`/portal/propostas/${id}`);
    revalidatePath("/portal/propostas");
    revalidatePath(`/admin/crm/propostas/${id}`);
  }
  return r;
}
