"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { createCase, deleteCase, setCasePublished, updateCase } from "./actions";
import { SITE_CASES_TAG } from "./site";

type NullState = ActionResult<null> | null;
type CreateState = ActionResult<{ id: string; slug: string }> | null;

/** Site público e API leem estes caminhos; invalida todos numa alteração. */
function revalidatePublic() {
  updateTag(SITE_CASES_TAG);
  revalidatePath("/", "page");
  revalidatePath("/cases");
  revalidatePath("/sobre");
  revalidatePath("/admin/cases");
}

function input(fd: FormData) {
  return {
    name: String(fd.get("name") ?? ""),
    sector: String(fd.get("sector") ?? ""),
    size: String(fd.get("size") ?? "small") as "micro" | "small" | "medium" | "large",
    systems: String(fd.get("systems") ?? "0"),
    automations: String(fd.get("automations") ?? "0"),
    savings: String(fd.get("savings") ?? ""),
    capex: String(fd.get("capex") ?? ""),
    featured: fd.get("featured") === "on",
    published: fd.get("published") === "on",
    deliverables: String(fd.get("deliverables") ?? ""),
    statusNote: String(fd.get("statusNote") ?? ""),
  };
}

export async function createCaseForm(_p: CreateState, fd: FormData): Promise<CreateState> {
  const ctx = await requireAdmin();
  const r = await createCase(ctx, input(fd));
  if (r.ok) {
    revalidatePublic();
    redirect(`/admin/cases/${r.data.id}`);
  }
  return r;
}

export async function updateCaseForm(_p: NullState, fd: FormData): Promise<NullState> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const r = await updateCase(ctx, id, input(fd));
  if (r.ok) {
    revalidatePublic();
    revalidatePath(`/admin/cases/${id}`);
  }
  return r;
}

export async function toggleCasePublishedForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await setCasePublished(ctx, String(fd.get("id") ?? ""), fd.get("published") === "1");
  revalidatePublic();
}

export async function deleteCaseForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await deleteCase(ctx, String(fd.get("id") ?? ""));
  revalidatePublic();
  redirect("/admin/cases");
}
