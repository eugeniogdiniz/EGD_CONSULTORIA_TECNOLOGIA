"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import { markLeadSeen } from "./admin-actions";

export async function markLeadSeenForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await markLeadSeen(ctx, String(fd.get("id") ?? ""));
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}
