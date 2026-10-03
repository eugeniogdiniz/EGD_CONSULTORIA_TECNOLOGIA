import Link from "next/link";
import { cn } from "cn";
import { Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { getKind, isKind } from "@/modules/notifications/kinds";
import type { NotificationRow } from "@/modules/notifications/queries";

/** Lista da página de notificações (admin e portal). */
export function NotificationList({
  area,
  items,
  unreadOnly,
  unread,
  markAllRead,
}: {
  area: "admin" | "portal";
  items: NotificationRow[];
  unreadOnly: boolean;
  unread: number;
  markAllRead: () => Promise<void>;
}) {
  const basePath = `/${area}/notificacoes`;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 border-b border-border" aria-label="Filtro">
          {[
            { href: basePath, label: "Todas", active: !unreadOnly },
            { href: `${basePath}?filtro=nao-lidas`, label: `Só não lidas${unread ? ` (${unread})` : ""}`, active: unreadOnly },
          ].map((f) => (
            <Link
              key={f.href}
              href={f.href}
              aria-current={f.active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
                f.active && "border-foreground text-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        {unread > 0 && (
          <form action={markAllRead}>
            <Button type="submit" variant="outline" size="sm">Marcar todas como lidas</Button>
          </form>
        )}
      </div>
      <Block title="Notificações" aside={`${items.length} mais recentes`} padded={false}>
        {items.length === 0 ? (
          <EmptyState
            title={unreadOnly ? "Nenhuma notificação não lida." : "Nenhuma notificação ainda."}
            text={area === "admin" ? "Solicitações, comentários de clientes, leads e propostas expiradas aparecem aqui." : "Respostas da equipe, entregas concluídas, comentários e atas compartilhadas aparecem aqui."}
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`${basePath}/${n.id}/abrir`}
                  className={cn("grid grid-cols-[10px_1fr_auto] items-start gap-3 px-5 py-3 text-sm hover:bg-subtle", !n.readAt && "bg-link-soft/30")}
                >
                  <span aria-hidden className={cn("mt-1.5 size-2 rounded-full", n.readAt ? "bg-transparent" : "bg-signal")} />
                  <span className="min-w-0">
                    <span className={cn("block", !n.readAt && "font-medium")}>
                      {n.title}
                      {!n.readAt && <span className="sr-only"> (não lida)</span>}
                    </span>
                    {n.body && <span className="block truncate text-muted-foreground">{n.body}</span>}
                    <span className="type-micro text-faint">{isKind(n.kind) ? getKind(n.kind).label : n.kind}</span>
                  </span>
                  <span className="type-data text-xs whitespace-nowrap text-faint">{formatDateTime(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}
