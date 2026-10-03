import { cn } from "cn";
import { formatDateTime } from "@/lib/format";
import { AttachmentList, type AttachmentRow } from "./attachment-list";

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string;
  authorRole: "admin" | "collaborator" | "client";
  internal?: boolean;
};

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

/** Conversa linear: primeira mensagem (o texto da solicitação) + respostas, cada uma com seus anexos. */
export function RequestThread({
  opener,
  messages,
  attachments = [],
  area = "portal",
}: {
  opener: { authorName: string; body: string; createdAt: Date };
  messages: ThreadMessage[];
  attachments?: AttachmentRow[];
  area?: "admin" | "portal";
}) {
  const all = [
    { id: "opener", authorName: opener.authorName, authorRole: "client" as const, body: opener.body, createdAt: opener.createdAt, internal: false },
    ...messages,
  ];
  const forMessage = (id: string) => attachments.filter((a) => (id === "opener" ? a.messageId === null : a.messageId === id));
  return (
    <ol className="grid gap-5">
      {all.map((m) => (
        <li key={m.id} className={cn("grid grid-cols-[32px_1fr] gap-3", m.internal && "rounded-r-md border-l-[3px] border-warning bg-warning-soft/40 py-2 pr-2")} data-testid={m.internal ? "nota-interna" : undefined}>
          <span
            aria-hidden
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-card",
              m.authorRole !== "client" ? "bg-foreground" : "bg-link",
              m.internal && "ml-2",
            )}
          >
            {initials(m.authorName)}
          </span>
          <div>
            <div className="flex flex-wrap items-baseline gap-2 text-sm">
              <b className="font-medium">{m.authorName}</b>
              {m.authorRole !== "client" && (
                <span className="rounded-sm border border-border bg-subtle px-1.5 text-[0.65rem] font-medium text-muted-foreground">
                  Equipe EGD
                </span>
              )}
              {m.internal && (
                <span className="rounded-sm border border-warning bg-warning-soft px-1.5 text-[0.65rem] font-medium text-warning">
                  Nota interna
                </span>
              )}
              <span className="type-data text-xs text-faint">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
            <AttachmentList items={forMessage(m.id)} area={area} />
          </div>
        </li>
      ))}
    </ol>
  );
}
