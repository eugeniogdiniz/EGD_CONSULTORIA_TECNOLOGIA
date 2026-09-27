"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { cn } from "cn";
import { NAV_LINKS } from "@/content/site";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./logo";

export function Navbar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="mx-auto w-full max-w-[1180px] px-5 sm:px-6">
      <nav aria-label="Principal" className="flex h-16 items-center justify-between gap-6 border-b border-border">
        <Logo subtitle />
        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "text-sm font-medium text-muted-foreground hover:text-signal-strong",
                isActive(l.href) && "pb-0.5 text-foreground shadow-[inset_0_-2px_0_var(--sinal-500)]",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-5">
          <Link href="/entrar" className="hidden text-sm font-medium text-muted-foreground hover:text-signal-strong md:inline">
            Entrar
          </Link>
          <Button size="sm" render={<Link href="/contato" />}>
            Falar com a EGD
          </Button>
          <Sheet>
            <SheetTrigger
              render={<Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Abrir menu" />}
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="grid gap-1 px-4">
                {[...NAV_LINKS, { href: "/entrar", label: "Entrar" }].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={cn("rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted", isActive(l.href) && "bg-link-soft text-link")}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
