"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { uploadFile } from "./actions";

export type UploadState = ActionResult<{ id: string }> | null;

export async function uploadFileForm(_p: UploadState, fd: FormData): Promise<UploadState> {
  const ctx = await requireAdmin();
  const r = await uploadFile(ctx, fd);
  if (r.ok) revalidatePath("/admin/arquivos");
  return r;
}
