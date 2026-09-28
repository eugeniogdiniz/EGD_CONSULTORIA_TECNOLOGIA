"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "cn";
import { Logo } from "@/components/site/logo";

export type NavLink = { href: string; label: string; badge?: number };
export type NavGroup = { label: string; storageKey: string; items: NavLink[] };
export type NavEntry = NavLink | NavGroup;

const NAV_STORAGE_KEY = "egd_admin_nav";

const isGroup = (entry: NavEntry): entry is NavGroup => "items" in entry;

function readGroupState(key: string): "open" | "closed" | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { groups?: Record<string, "open" | "closed"> };
    return parsed.groups?.[key] ?? null;
  } catch {
    return null;
  }
}

function writeGroupState(key: string, state: "open" | "closed") {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(NAV_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { groups?: Record<string, "open" | "closed"> }) : {};
    const groups = { ...(parsed.groups ?? {}), [key]: state };
    window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({ ...parsed, groups }));
  } catch {
    /* silent */
  }
}

/** Regras da spec §6.1 — determina se o grupo deve estar aberto agora. */
export function shouldGroupBeOpen(
  pathname: string,
  hrefs: string[],
  stored: "open" | "closed" | null,
): boolean {
  // Sub-item ativo sempre força aberto, ignora storage.
  if (hrefs.some((h) => pathname === h || pathname.startsWith(`${h}/`))) return true;
  if (stored === null) return false;
  return stored === "open";
}

function isLinkActive(pathname: string, href: string, isFirst: boolean): boolean {
  return isFirst ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, active }: { item: NavLink; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center rounded-sm px-3 text-sm font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground",
        active &&
          "bg-link-soft text-link before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-link hover:bg-link-soft hover:text-link",
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
}

function SidebarGroup({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const hrefs = useMemo(() => group.items.map((i) => i.href), [group.items]);

  // Server render "closed" pra evitar hydration mismatch com localStorage; useEffect ajusta.
  const [stored, setStored] = useState<"open" | "closed" | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação do localStorage é lida uma vez no mount, padrão SSR-safe.
    setStored(readGroupState(group.storageKey));
  }, [group.storageKey]);

  const open = shouldGroupBeOpen(pathname, hrefs, stored);
  const groupId = `nav-group-${group.storageKey}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const next = open ? "closed" : "open";
          writeGroupState(group.storageKey, next);
          setStored(next);
        }}
        aria-expanded={open}
        aria-controls={groupId}
        className="flex h-9 w-full items-center gap-2 rounded-sm px-3 text-left font-mono text-[0.8125rem] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex-1 truncate">{group.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={cn("shrink-0 text-faint transition-transform duration-150", open && "rotate-90")}
          aria-hidden="true"
        >
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div id={groupId} className="grid gap-1 pt-1">
          {group.items.map((item) => (
            <div key={item.href} className="pl-3">
              <SidebarLink item={item} active={isLinkActive(pathname, item.href, false)} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({ nav, footer }: { nav: NavEntry[]; footer: string }) {
  const pathname = usePathname();
  const firstLinkHref = nav.find((e): e is NavLink => !isGroup(e))?.href;

  // Quando dois itens flat competem pelo mesmo pathname (ex.: /admin/projetos e
  // /admin/projetos/templates), o mais específico ganha.
  const flatHrefs = nav.filter((e): e is NavLink => !isGroup(e)).map((e) => e.href);
  const winningHref = flatHrefs
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .reduce<string | null>((longest, h) => (longest == null || h.length > longest.length ? h : longest), null);

  return (
    <>
      <div className="px-3 pt-2 pb-5">
        <Logo />
      </div>
      <nav aria-label="Menu" className="grid gap-1">
        {nav.map((entry, index) => {
          if (isGroup(entry)) return <SidebarGroup key={`g-${entry.storageKey}`} group={entry} />;
          const isFirst = entry.href === firstLinkHref && index === 0;
          const active =
            winningHref !== null
              ? entry.href === winningHref
              : isLinkActive(pathname, entry.href, isFirst);
          return <SidebarLink key={entry.href} item={entry} active={active} />;
        })}
      </nav>
      <div className="mt-auto px-3 py-3 text-[0.8125rem] text-faint">{footer}</div>
    </>
  );
}

// Compat: alguns consumidores ainda importam NavItem.
export type NavItem = NavLink;
