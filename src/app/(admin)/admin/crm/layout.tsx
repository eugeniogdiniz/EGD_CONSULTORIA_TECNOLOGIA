import type { ReactNode } from "react";
import { requireOwner } from "@/modules/auth/context";

export const metadata = { title: "CRM" };

/** A navegação do comercial é o grupo Comercial do menu lateral; aqui só a trava de dono. */
export default async function CrmLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return <>{children}</>;
}
