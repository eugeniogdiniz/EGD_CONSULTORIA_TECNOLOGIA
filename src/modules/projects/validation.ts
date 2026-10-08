import { z } from "zod";
import { isIsoDate } from "@/lib/iso-date";
import { PRIORITIES } from "./priority";

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
  .refine((v) => v === "" || isIsoDate(v), "Data inválida (AAAA-MM-DD)")
  .transform((v) => (v === "" ? null : v));

const isoDateRequired = z
  .string()
  .trim()
  .refine(isIsoDate, "Data obrigatória (AAAA-MM-DD)");

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
  showHoursToClient: z
    .union([z.literal("on"), z.literal(""), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "on"),
});
export type ProjectInput = z.input<typeof projectSchema>;

export const createProjectFromOpportunitySchema = z.object({
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  copyValue: z
    .union([z.literal("on"), z.literal("off"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "on"),
  templateId: optionalUuid,
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
  priority: z.enum(PRIORITIES).default("medium"),
  /** horas decimais digitadas ("1,5"); vazio = sem estimativa */
  estimateHours: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim().replace(",", "."))
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 10000), "Estimativa inválida")
    .transform((v) => (v === "" ? null : Math.round(Number(v) * 60))),
});
export type DeliverableInput = z.input<typeof deliverableSchema>;

export const prioritySchema = z.enum(PRIORITIES);

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

// ── Fase 3.5 (extras) ───────────────────────────────────────────────────────

const isoDateTimeRequired = z
  .string()
  .trim()
  .min(1, "Data e hora obrigatórias")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data/hora inválida")
  .transform((v) => new Date(v));

export const dependencySchema = z
  .object({
    predecessorId: z.uuid(),
    successorId: z.uuid(),
  })
  .refine((v) => v.predecessorId !== v.successorId, {
    error: "Entrega não pode depender de si mesma.",
    path: ["successorId"],
  });
export type DependencyInput = z.input<typeof dependencySchema>;

export const commentSchema = z.object({
  deliverableId: z.uuid(),
  parentId: optionalUuid,
  body: z.string().trim().min(1, "Comentário vazio.").max(4000, "Máximo 4000 caracteres"),
});
export type CommentInput = z.input<typeof commentSchema>;

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1, "Comentário vazio.").max(4000, "Máximo 4000 caracteres"),
});
export type UpdateCommentInput = z.input<typeof updateCommentSchema>;

export const startTimerSchema = z.object({
  deliverableId: z.uuid(),
  notes: optionalText(1000),
});
export type StartTimerInput = z.input<typeof startTimerSchema>;

export const manualTimeSchema = z
  .object({
    deliverableId: z.uuid(),
    startedAt: isoDateTimeRequired,
    endedAt: isoDateTimeRequired,
    notes: optionalText(1000),
  })
  .refine((v) => v.endedAt.getTime() > v.startedAt.getTime(), {
    error: "Fim precisa ser depois do início.",
    path: ["endedAt"],
  })
  .refine((v) => v.endedAt.getTime() <= Date.now(), {
    error: "Fim não pode estar no futuro.",
    path: ["endedAt"],
  });
export type ManualTimeInput = z.input<typeof manualTimeSchema>;

const EXPENSE_KINDS = ["travel", "service", "equipment", "software", "tax", "payroll", "other"] as const;

/** Conta a pagar: projeto opcional (vazio = custo geral da EGD); competência vazia = vencimento. */
export const expenseSchema = z.object({
  projectId: z
    .union([z.uuid(), z.literal("").transform(() => null), z.null(), z.undefined().transform(() => null)])
    .transform((v) => v ?? null),
  supplier: optionalText(200),
  description: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  amountCents: z.coerce
    .number()
    .int("Somente valor inteiro em centavos.")
    .min(0, "Valor não pode ser negativo."),
  kind: z.enum(EXPENSE_KINDS).default("other"),
  dueAt: isoDateRequired,
  dateAt: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || isIsoDate(v), "Data inválida (AAAA-MM-DD)")
    .transform((v) => (v === "" ? null : v)),
  notes: optionalText(2000),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

export const templateSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  description: optionalText(4000),
});
export type TemplateInput = z.input<typeof templateSchema>;

export const createTemplateFromProjectSchema = templateSchema;
export type CreateTemplateFromProjectInput = z.input<typeof createTemplateFromProjectSchema>;

export const reorderDeliverableSchema = z.object({
  deliverableId: z.uuid(),
  toStatus: z.enum(["todo", "doing", "review", "done", "blocked"]),
  toPosition: z.coerce.number().int().min(0),
  blockReason: optionalText(1000),
});
export type ReorderDeliverableInput = z.input<typeof reorderDeliverableSchema>;

export const updateAccountRateSchema = z.object({
  hourlyRateCents: z
    .union([z.literal("").transform(() => null), z.null(), z.coerce.number().int().min(0)])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});
export type UpdateAccountRateInput = z.input<typeof updateAccountRateSchema>;

export const invoiceSchema = z.object({
  projectId: z.uuid(),
  description: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  amountCents: z.coerce.number().int("Somente valor inteiro em centavos.").min(0, "Valor não pode ser negativo."),
  dueAt: isoDateRequired,
  notes: optionalText(2000),
});
export type InvoiceInput = z.input<typeof invoiceSchema>;

export const markPaidSchema = z.object({ paidAt: isoDateRequired });

export const projectRateSchema = z.object({
  projectId: z.uuid(),
  userId: z.uuid(),
  /** vazio remove o rate do projeto (volta ao da pessoa) */
  hourlyRateCents: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || /^\d+$/.test(v), "Informe o valor em centavos")
    .transform((v) => (v === "" ? null : Number(v))),
});
export type ProjectRateInput = z.input<typeof projectRateSchema>;
