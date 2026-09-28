import type { ReactNode } from "react";
import { PortalProjectTabs } from "./_components/tabs";

export default async function PortalProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <PortalProjectTabs projectId={id} />
      {children}
    </div>
  );
}
