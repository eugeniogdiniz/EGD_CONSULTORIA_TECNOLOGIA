import type { ReactNode } from "react";
import { requireAdmin } from "@/modules/auth/context";

export const metadata = { title: "Projetos" };

export default async function ProjetosLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
