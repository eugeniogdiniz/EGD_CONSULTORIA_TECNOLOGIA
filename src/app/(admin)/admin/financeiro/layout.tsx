import type { ReactNode } from "react";
import { requireOwner } from "@/modules/auth/context";

export const metadata = { title: "Financeiro" };

/** A navegação do financeiro é o grupo Financeiro do menu lateral; aqui só a trava de dono. */
export default async function FinanceiroLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return <>{children}</>;
}
