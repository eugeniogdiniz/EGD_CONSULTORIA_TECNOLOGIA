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
    { href: `${base}/burndown`, label: "Burndown", match: (p: string) => p.startsWith(`${base}/burndown`) },
    { href: `${base}/atas`, label: "Atas", match: (p: string) => p.startsWith(`${base}/atas`) },
    { href: `${base}/financeiro`, label: "Financeiro", match: (p: string) => p.startsWith(`${base}/financeiro`) },
    { href: `${base}/relatorio`, label: "Relatório", match: (p: string) => p.startsWith(`${base}/relatorio`) },
  ];
  return (
    <nav aria-label="Sub-nav do projeto" className="flex gap-1 overflow-x-auto border-b border-border print:hidden">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
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
