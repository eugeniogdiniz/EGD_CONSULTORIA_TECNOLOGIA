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

/**
 * Grupo aberto: sub-item ativo força aberto (ignora o storage); sem preferência
 * guardada o grupo nasce aberto (o menu inteiro é feito de grupos, fechado por
 * padrão esconderia tudo); depois vale o que a pessoa escolheu.
 */
export function shouldGroupBeOpen(
  pathname: string,
  hrefs: string[],
  stored: "open" | "closed" | null,
): boolean {
  if (hrefs.some((h) => pathname === h || pathname.startsWith(`${h}/`))) return true;
  if (stored === null) return true;
  return stored === "open";
}

/**
 * Um único item ativo por vez: entre os hrefs que casam com a rota (exato ou
 * como prefixo de pasta), vence o mais específico. A raiz (`/admin`) só casa
 * exato, senão ficaria ativa em toda página. Pura: testada em unidade.
 */
export function activeHref(pathname: string, hrefs: string[], root?: string): string | null {
  return hrefs
    .filter((h) => (h === root ? pathname === h : pathname === h || pathname.startsWith(`${h}/`)))
    .reduce<string | null>((longest, h) => (longest == null || h.length > longest.length ? h : longest), null);
}

function SidebarLink({ item, active, nested }: { item: NavLink; active: boolean; nested?: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center rounded-sm px-3 text-sm font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground",
        nested && "pl-6",
        active &&
          "bg-link-soft text-link before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-link hover:bg-link-soft hover:text-link",
      )}
    >
      {item.label}
      {item.badge ? <Badge n={item.badge} /> : null}
    </Link>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="ml-auto inline-flex h-5 items-center rounded-sm bg-signal-soft px-1.5 text-[0.75rem] font-medium text-signal-strong">
      {n}
    </span>
  );
}

function SidebarGroup({ group, active }: { group: NavGroup; active: string | null }) {
  const pathname = usePathname();
  const hrefs = useMemo(() => group.items.map((i) => i.href), [group.items]);

  // Server render usa o default (aberto) pra evitar hydration mismatch com localStorage; useEffect ajusta.
  const [stored, setStored] = useState<"open" | "closed" | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação do localStorage é lida uma vez no mount, padrão SSR-safe.
    setStored(readGroupState(group.storageKey));
  }, [group.storageKey]);

  const open = shouldGroupBeOpen(pathname, hrefs, stored);
  const groupId = `nav-group-${group.storageKey}`;
  const badgeTotal = group.items.reduce((s, i) => s + (i.badge ?? 0), 0);

  return (
    <div className="pt-2 first:pt-0">
      <button
        type="button"
        onClick={() => {
          const next = open ? "closed" : "open";
          writeGroupState(group.storageKey, next);
          setStored(next);
        }}
        aria-expanded={open}
        aria-controls={groupId}
        className="flex h-8 w-full items-center gap-2 rounded-sm px-3 text-left text-[0.75rem] font-medium tracking-wide text-faint uppercase hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex-1 truncate">{group.label}</span>
        {!open && badgeTotal > 0 ? <Badge n={badgeTotal} /> : null}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={cn("shrink-0 transition-transform duration-150", open && "rotate-90")}
          aria-hidden="true"
        >
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div id={groupId} className="grid gap-0.5 pt-0.5">
          {group.items.map((item) => (
            <SidebarLink key={item.href} item={item} active={item.href === active} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({ nav, footer }: { nav: NavEntry[]; footer: string }) {
  const pathname = usePathname();
  const root = nav.find((e): e is NavLink => !isGroup(e))?.href;
  const allHrefs = nav.flatMap((e) => (isGroup(e) ? e.items.map((i) => i.href) : [e.href]));
  const active = activeHref(pathname, allHrefs, root);

  return (
    <>
      <div className="px-3 pt-2 pb-5">
        <Logo />
      </div>
      <nav aria-label="Menu" className="grid gap-1">
        {nav.map((entry) =>
          isGroup(entry) ? (
            <SidebarGroup key={`g-${entry.storageKey}`} group={entry} active={active} />
          ) : (
            <SidebarLink key={entry.href} item={entry} active={entry.href === active} />
          ),
        )}
      </nav>
      <div className="mt-auto px-3 py-3 text-[0.8125rem] text-faint">{footer}</div>
    </>
  );
}

// Compat: alguns consumidores ainda importam NavItem.
export type NavItem = NavLink;
