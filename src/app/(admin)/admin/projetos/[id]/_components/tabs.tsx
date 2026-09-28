"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/admin/projetos/${projectId}`, label: "Visão geral", match: (p: string) => p === `/admin/projetos/${projectId}` || p.startsWith(`/admin/projetos/${projectId}/editar`) },
    { href: `/admin/projetos/${projectId}/kanban`, label: "Kanban", match: (p: string) => p.startsWith(`/admin/projetos/${projectId}/kanban`) },
  ];
  return (
    <nav aria-label="Sub-nav do projeto" className="flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground",
              active && "border-signal-strong text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
