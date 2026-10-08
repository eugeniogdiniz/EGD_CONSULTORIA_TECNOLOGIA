"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { href: "/admin/financeiro/receber", label: "Contas a receber" },
  { href: "/admin/financeiro/pagar", label: "Contas a pagar" },
  { href: "/admin/relatorios/horas", label: "Horas" },
] as const;

export function FinanceTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sub-navegação do financeiro" className="flex gap-1 border-b border-border print:hidden">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
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
