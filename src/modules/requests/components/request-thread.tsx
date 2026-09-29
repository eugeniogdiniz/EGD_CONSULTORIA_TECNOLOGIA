import { cn } from "cn";
import { formatDateTime } from "@/lib/format";

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string;
  authorRole: "admin" | "client";
};

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

/** Conversa linear: primeira mensagem (o texto da solicitação) + respostas. */
export function RequestThread({
  opener,
  messages,
}: {
  opener: { authorName: string; body: string; createdAt: Date };
  messages: ThreadMessage[];
}) {
  const all = [
    { id: "opener", authorName: opener.authorName, authorRole: "client" as const, body: opener.body, createdAt: opener.createdAt },
    ...messages,
  ];
  return (
    <ol className="grid gap-5">
      {all.map((m) => (
        <li key={m.id} className="grid grid-cols-[32px_1fr] gap-3">
          <span
            aria-hidden
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-card",
              m.authorRole === "admin" ? "bg-foreground" : "bg-link",
            )}
          >
            {initials(m.authorName)}
          </span>
          <div>
            <div className="flex flex-wrap items-baseline gap-2 text-sm">
              <b className="font-medium">{m.authorName}</b>
              {m.authorRole === "admin" && (
                <span className="rounded-sm border border-border bg-subtle px-1.5 text-[0.65rem] font-medium text-muted-foreground">
                  Equipe EGD
                </span>
              )}
              <span className="type-data text-xs text-faint">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
