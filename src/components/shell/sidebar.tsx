"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Logo } from "@/components/site/logo";

export type NavItem = { href: string; label: string; badge?: number };

export function SidebarNav({ nav, footer }: { nav: NavItem[]; footer: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (nav[0]?.href === href ? pathname === href : pathname.startsWith(href));
  return (
    <>
      <div className="px-3 pt-2 pb-5">
        <Logo />
      </div>
      <nav aria-label="Menu" className="grid gap-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center rounded-sm px-3 text-sm font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground",
                active && "bg-link-soft text-link before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-link hover:bg-link-soft hover:text-link",
              )}
            >
              {item.label}
              {item.badge ? (
                <span className="ml-auto inline-flex h-5 items-center rounded-sm bg-signal-soft px-1.5 text-[0.75rem] font-medium text-signal-strong">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 py-3 text-[0.8125rem] text-faint">{footer}</div>
    </>
  );
}
