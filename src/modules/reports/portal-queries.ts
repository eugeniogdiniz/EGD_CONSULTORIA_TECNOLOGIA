import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { meeting, projectDeliverable, projectTimeEntry } from "@/db/schema";
import type { PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { slugify } from "@/modules/tenancy/slug";
import {
  getPortalProject,
  listPortalDeliverables,
  listPortalMilestones,
  listPortalPhases,
} from "@/modules/portal-projects/queries";
import type { ClientReportInput } from "./build";

/**
 * Relatório do cliente. Parte de `getPortalProject`, que já aplica o escopo
 * (empresa da organização ativa, projeto não arquivado): se ele não achar,
 * nada mais é lido. Entregas vêm só as visíveis; atas, só as compartilhadas.
 */
export async function loadClientReport(ctx: PortalContext, id: string): Promise<{ input: ClientReportInput; slug: string } | null> {
  if (!isUuid(id)) return null;
  const p = await getPortalProject(ctx, id);
  if (!p) return null;

  const [phases, milestones, deliverables, meetings, minutesByPhase] = await Promise.all([
    listPortalPhases(ctx, id),
    listPortalMilestones(ctx, id),
    listPortalDeliverables(ctx, id),
    db
      .select({ id: meeting.id, title: meeting.title, heldAt: meeting.heldAt, decisions: meeting.decisions })
      .from(meeting)
      .where(and(eq(meeting.projectId, id), eq(meeting.sharedWithClient, true)))
      .orderBy(desc(meeting.heldAt)),
    p.showHoursToClient
      ? db
          .select({ phaseId: projectDeliverable.phaseId, minutes: sql<number>`coalesce(sum(${projectTimeEntry.minutes}), 0)::int` })
          .from(projectTimeEntry)
          .innerJoin(projectDeliverable, eq(projectTimeEntry.deliverableId, projectDeliverable.id))
          .where(and(eq(projectDeliverable.projectId, id), isNotNull(projectTimeEntry.endedAt)))
          .groupBy(projectDeliverable.phaseId)
      : Promise.resolve([]),
  ]);

  return {
    slug: slugify(p.title) || "projeto",
    input: {
      project: {
        title: p.title,
        companyName: p.companyName,
        startedAt: p.startedAt,
        endedAt: p.endedAt,
        ownerName: p.ownerName,
        showHoursToClient: p.showHoursToClient,
      },
      phases: phases.map((ph) => ({ id: ph.id, name: ph.name, position: ph.position, startedAt: ph.startedAt, endedAt: ph.endedAt })),
      milestones: milestones.map((m) => ({ id: m.id, name: m.name, dueAt: m.dueAt, completedAt: m.completedAt, phaseId: m.phaseId })),
      deliverables: deliverables.map((x) => ({
        id: x.id,
        title: x.title,
        status: x.status,
        dueAt: x.dueAt,
        completedAt: x.completedAt,
        phaseId: x.phaseId,
      })),
      meetings,
      minutesByPhase,
    },
  };
}
