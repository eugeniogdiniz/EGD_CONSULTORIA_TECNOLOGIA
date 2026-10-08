import type { ReactNode } from "react";
import { requireOwner } from "@/modules/auth/context";
import { FinanceTabs } from "./_components/tabs";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return (
    <div className="flex flex-col gap-6">
      <FinanceTabs />
      {children}
    </div>
  );
}
