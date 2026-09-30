import Link from "next/link";
import { EmptyState } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/format";

/** Lista de atas (admin e portal). */
export function MeetingList({
  items,
  hrefFor,
  empty,
}: {
  items: {
    id: string;
    title: string;
    heldAt: Date;
    location: string | null;
    projectTitle: string | null;
    companyName?: string;
    participantCount?: number;
    actionItemCount?: number;
    sharedWithClient?: boolean;
  }[];
  hrefFor: (id: string) => string;
  empty: { title: string; text: string; action?: React.ReactNode };
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {items.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((m) => {
            const where = [m.companyName, m.projectTitle ?? (m.companyName ? "sem projeto" : null), m.location].filter(Boolean).join(" · ");
            const counts = [
              m.participantCount !== undefined && `${m.participantCount} participante${m.participantCount === 1 ? "" : "s"}`,
              m.actionItemCount !== undefined && `${m.actionItemCount} ite${m.actionItemCount === 1 ? "m" : "ns"} de ação`,
            ].filter(Boolean).join(" · ");
            return (
              <li key={m.id}>
                <Link href={hrefFor(m.id)} className="grid gap-1 px-5 py-3.5 hover:bg-subtle md:grid-cols-[1fr_auto] md:items-center md:gap-4">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.title}</span>
                    {where && <span className="type-micro block text-muted-foreground">{where}</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    {counts && <span className="type-micro text-muted-foreground">{counts}</span>}
                    {m.sharedWithClient && (
                      <span className="inline-flex h-[22px] items-center rounded-sm border border-link bg-link-soft px-2 text-xs font-medium text-link">Compartilhada</span>
                    )}
                    <span className="type-data text-xs text-faint">{formatDateTime(m.heldAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Pauta, discussão e decisões, no formato de documento (também na impressão). */
export function MeetingText({ agenda, discussion, decisions }: { agenda: string | null; discussion: string | null; decisions: string | null }) {
  const sections = [
    { title: "Pauta", text: agenda },
    { title: "Discussão", text: discussion },
    { title: "Decisões", text: decisions },
  ].filter((s) => s.text);
  if (sections.length === 0) return <p className="text-sm text-muted-foreground">Ata sem pauta, discussão ou decisões registradas.</p>;
  return (
    <div className="grid gap-5">
      {sections.map((s) => (
        <section key={s.title} className="grid gap-1.5 break-inside-avoid">
          <h3 className="text-sm font-semibold">{s.title}</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{s.text}</p>
        </section>
      ))}
    </div>
  );
}

export function ParticipantList({ participants }: { participants: { name: string; organization: string | null }[] }) {
  if (participants.length === 0) return <p className="text-sm text-muted-foreground">Nenhum participante registrado.</p>;
  return (
    <ul className="grid gap-1 text-sm">
      {participants.map((p, i) => (
        <li key={`${p.name}-${i}`}>
          {p.name}
          {p.organization && <span className="text-muted-foreground"> · {p.organization}</span>}
        </li>
      ))}
    </ul>
  );
}
