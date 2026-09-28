"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/modules/auth/actions";
import { SidebarNav, type NavItem } from "./sidebar";

export function UserMenu({ name, email, accountHref }: { name: string; email: string; accountHref: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="flex items-center gap-3 rounded-sm text-sm text-muted-foreground hover:text-foreground" aria-label="Menu do usuário" />}
      >
        <span className="hidden sm:inline">{name}</span>
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-[0.75rem] font-semibold text-card">{initials}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-medium text-foreground">{name}</div>
          <div className="type-data text-faint">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={accountHref} />}>Minha conta</DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOutAction()}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Menu lateral em Sheet para telas estreitas. */
export function MobileNav({ nav, footer }: { nav: NavItem[]; footer: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Abrir menu" />}>
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col bg-paper p-3">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <SidebarNav nav={nav} footer={footer} />
      </SheetContent>
    </Sheet>
  );
}
