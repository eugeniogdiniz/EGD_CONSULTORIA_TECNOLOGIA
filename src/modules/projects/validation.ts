import { z } from "zod";

const optionalText = (max = 500) =>
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

const isoDateOptional = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data no formato AAAA-MM-DD")
  .transform((v) => (v === "" ? null : v));

const isoDateRequired = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data obrigatória no formato AAAA-MM-DD");

const valueCentsOptional = z
  .union([z.coerce.number().int(), z.literal("").transform(() => null), z.null()])
  .optional()
  .transform((v) => v ?? null)
  .refine((v) => v === null || v >= 0, "Valor não pode ser negativo");

const currency = z.enum(["BRL"]).default("BRL");

export const projectSchema = z.object({
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  budgetCents: valueCentsOptional,
  currency,
  startedAt: isoDateOptional,
  endedAt: isoDateOptional,
  notes: optionalText(4000),
});
export type ProjectInput = z.input<typeof projectSchema>;

export const createProjectFromOpportunitySchema = z.object({
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  copyValue: z
    .union([z.literal("on"), z.literal("off"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "on"),
});
export type CreateProjectFromOpportunityInput = z.input<typeof createProjectFromOpportunitySchema>;

export const changeProjectStatusSchema = z.object({
  to: z.enum(["planning", "active", "on_hold", "delivered", "cancelled"]),
});
export type ChangeProjectStatusInput = z.input<typeof changeProjectStatusSchema>;

export const phaseSchema = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(160, "Máximo 160 caracteres"),
  startedAt: isoDateOptional,
  endedAt: isoDateOptional,
  notes: optionalText(2000),
});
export type PhaseInput = z.input<typeof phaseSchema>;

export const milestoneSchema = z.object({
  projectId: z.uuid(),
  phaseId: optionalUuid,
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  dueAt: isoDateRequired,
  notes: optionalText(2000),
});
export type MilestoneInput = z.input<typeof milestoneSchema>;

export const deliverableSchema = z.object({
  projectId: z.uuid(),
  phaseId: optionalUuid,
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  description: optionalText(8000),
  assigneeId: optionalUuid,
  dueAt: isoDateOptional,
});
export type DeliverableInput = z.input<typeof deliverableSchema>;

export const changeDeliverableStatusSchema = z
  .object({
    to: z.enum(["todo", "doing", "review", "done", "blocked"]),
    blockReason: optionalText(1000),
  })
  .refine((v) => v.to !== "blocked" || (v.blockReason ?? "").length >= 3, {
    error: "Descreva o motivo do bloqueio.",
    path: ["blockReason"],
  });
export type ChangeDeliverableStatusInput = z.input<typeof changeDeliverableStatusSchema>;
