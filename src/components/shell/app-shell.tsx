import type { ReactNode } from "react";
import { SidebarNav, type NavEntry } from "./sidebar";
import { UserMenu, MobileNav } from "./user-menu";

/** Layout dos portais: sidebar 240 px em papel, topbar 56 px, conteúdo em branco. */
export function AppShell({
  nav,
  footer,
  user,
  accountHref,
  title,
  topRight,
  children,
}: {
  nav: NavEntry[];
  footer: string;
  user: { name: string; email: string };
  accountHref: string;
  title?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="theme-app grid min-h-full flex-1 bg-background md:grid-cols-[240px_1fr] print:block print:bg-card">
      <aside className="hidden flex-col border-r border-border bg-paper p-3 md:flex print:hidden">
        <SidebarNav nav={nav} footer={footer} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-5 md:px-8 print:hidden">
          <div className="flex items-center gap-3">
            <MobileNav nav={nav} footer={footer} />
            <div className="text-base font-semibold">{title}</div>
          </div>
          <div className="flex items-center gap-4">
            {topRight}
            <UserMenu name={user.name} email={user.email} accountHref={accountHref} />
          </div>
        </header>
        <main className="flex max-w-[1240px] flex-1 flex-col gap-6 p-5 md:p-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
