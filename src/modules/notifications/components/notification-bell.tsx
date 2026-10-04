"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/modules/notifications/kinds";

export type BellItem = { id: string; title: string; body: string | null; read: boolean; createdAt: string };

/**
 * Sino do topo: contagem de não lidas e as mais recentes. Os dados vêm do
 * layout (servidor); clicar num item passa pela rota `abrir`, que marca lida.
 * Só itens de menu dentro do menu, para leitores de tela e para o axe.
 */
export function NotificationBell({
  area,
  unread,
  items,
  now,
  markAllRead,
}: {
  area: "admin" | "portal";
  unread: number;
  items: BellItem[];
  now: string;
  markAllRead: () => Promise<void>;
}) {
  const router = useRouter();
  const nowDate = new Date(now);
  const label = unread === 0 ? "Notificações" : `Notificações: ${unread} não lida${unread === 1 ? "" : "s"}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={label}
            data-testid="sino"
            className="relative inline-flex size-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        }
      >
        <BellIcon className="size-5" aria-hidden />
        {unread > 0 && (
          <span
            data-testid="sino-contador"
            aria-hidden
            className="absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-signal px-1 text-[0.6875rem] font-semibold text-card"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-sm font-medium text-foreground">
            Notificações{unread > 0 && <span className="ml-1 font-normal text-muted-foreground">· {unread} não lida{unread === 1 ? "" : "s"}</span>}
          </DropdownMenuLabel>
          {items.length === 0 ? (
            <DropdownMenuItem disabled className="justify-center py-5 text-muted-foreground">
              Nada por aqui.
            </DropdownMenuItem>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                render={<Link href={`/${area}/notificacoes/${n.id}/abrir`} />}
                className={cn("grid grid-cols-[10px_1fr] items-start gap-2 px-2 py-2", !n.read && "bg-link-soft/40")}
              >
                <span aria-hidden className={cn("mt-1.5 size-2 rounded-full", n.read ? "bg-transparent" : "bg-signal")} />
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm", !n.read && "font-medium")}>{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-muted-foreground">{n.body}</span>}
                  <span className="type-data block text-[0.6875rem] text-faint">
                    {relativeTime(new Date(n.createdAt), nowDate)}
                    {!n.read && <span className="sr-only"> · não lida</span>}
                  </span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/${area}/notificacoes`} />} className="justify-center text-link">
          Ver todas
        </DropdownMenuItem>
        {unread > 0 && (
          <DropdownMenuItem
            className="justify-center text-muted-foreground"
            onClick={async () => {
              await markAllRead();
              router.refresh();
            }}
          >
            Marcar todas como lidas
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
