import type { ReactNode } from "react";
import { ReportTabs } from "./_components/tabs";

export default function RelatoriosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <ReportTabs />
      {children}
    </div>
  );
}
