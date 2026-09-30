"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function ReportTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/relatorios", label: "Portfólio", active: pathname === "/admin/relatorios" },
    { href: "/admin/relatorios/semanal", label: "Semanal", active: pathname.startsWith("/admin/relatorios/semanal") },
  ];
  return (
    <nav aria-label="Relatórios" className="flex gap-1 border-b border-border print:hidden">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground",
            t.active && "border-signal-strong text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
