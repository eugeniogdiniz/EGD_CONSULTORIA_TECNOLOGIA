import { z } from "zod";
import { PRIORITIES } from "@/modules/projects/priority";
import { parseExternalParticipants, parseLocalDateTime } from "./rules";

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(max, `Máximo ${max} caracteres`))
    .transform((v) => (v === "" ? null : v));

const optionalUuid = z
  .union([z.uuid(), z.literal("").transform(() => null), z.null()])
  .optional()
  .transform((v) => v ?? null);

export const meetingSchema = z
  .object({
    companyId: optionalUuid,
    projectId: optionalUuid,
    title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
    heldAt: z
      .string()
      .trim()
      .min(1, "Data e hora obrigatórias")
      .transform((v, ctx) => {
        const d = parseLocalDateTime(v);
        if (!d) {
          ctx.addIssue({ code: "custom", message: "Data/hora inválida" });
          return z.NEVER;
        }
        return d;
      }),
    location: optionalText(200),
    agenda: optionalText(20_000),
    discussion: optionalText(20_000),
    decisions: optionalText(20_000),
    teamIds: z.array(z.uuid()).max(50).default([]),
    externals: z
      .string()
      .optional()
      .transform((v) => parseExternalParticipants(v ?? ""))
      .refine((l) => l.length <= 50, "No máximo 50 participantes externos")
      .refine((l) => l.every((p) => p.name.length <= 160 && (p.organization ?? "").length <= 160), "Nome ou empresa longos demais"),
  })
  .refine((v) => v.companyId !== null || v.projectId !== null, {
    error: "Escolha o projeto ou a empresa da reunião.",
    path: ["projectId"],
  });
export type MeetingInput = z.input<typeof meetingSchema>;

export const actionItemSchema = z.object({
  meetingId: z.uuid(),
  projectId: z.uuid({ error: "Escolha o projeto." }),
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  assigneeId: optionalUuid,
  dueAt: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data no formato AAAA-MM-DD")
    .transform((v) => (v === "" ? null : v)),
  priority: z.enum(PRIORITIES).default("medium"),
  visibleToClient: z.boolean().default(false),
});
export type ActionItemInput = z.input<typeof actionItemSchema>;
