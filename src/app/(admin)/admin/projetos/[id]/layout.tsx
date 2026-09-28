import type { ReactNode } from "react";
import { ProjectTabs } from "./_components/tabs";

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <ProjectTabs projectId={id} />
      {children}
    </div>
  );
}
