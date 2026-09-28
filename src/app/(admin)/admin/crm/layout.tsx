import type { ReactNode } from "react";
import { requireAdmin } from "@/modules/auth/context";
import { CrmTabs } from "./_components/tabs";

export const metadata = { title: "CRM" };

export default async function CrmLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <CrmTabs />
      {children}
    </div>
  );
}
