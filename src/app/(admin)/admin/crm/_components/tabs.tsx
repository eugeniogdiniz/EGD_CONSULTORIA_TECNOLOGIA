"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { href: "/admin/crm/empresas", label: "Empresas" },
  { href: "/admin/crm/contatos", label: "Contatos" },
  { href: "/admin/crm/funil", label: "Funil" },
  { href: "/admin/crm/propostas", label: "Propostas" },
] as const;

export function CrmTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sub-navegação do CRM" className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground",
              active && "border-signal-strong text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
