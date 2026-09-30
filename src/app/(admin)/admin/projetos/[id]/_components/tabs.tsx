"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/admin/projetos/${projectId}`;
  const tabs = [
    { href: base, label: "Visão geral", match: (p: string) => p === base || p.startsWith(`${base}/editar`) || p.startsWith(`${base}/entregas`) },
    { href: `${base}/kanban`, label: "Kanban", match: (p: string) => p.startsWith(`${base}/kanban`) },
    { href: `${base}/gantt`, label: "Gantt", match: (p: string) => p.startsWith(`${base}/gantt`) },
    { href: `${base}/calendario`, label: "Calendário", match: (p: string) => p.startsWith(`${base}/calendario`) },
    { href: `${base}/atas`, label: "Atas", match: (p: string) => p.startsWith(`${base}/atas`) },
    { href: `${base}/financeiro`, label: "Financeiro", match: (p: string) => p.startsWith(`${base}/financeiro`) },
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
