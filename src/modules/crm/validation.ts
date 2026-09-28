import { z } from "zod";
import { normalizeEmail } from "@/modules/auth/normalize-email";

const CURRENCY = ["BRL"] as const;

const optionalText = (max = 500) =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(max, `Máximo ${max} caracteres`))
    .transform((v) => (v === "" ? null : v));

const optionalEmail = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .transform((v) => (v === "" ? null : normalizeEmail(v)))
  .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido");

const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || z.url().safeParse(v.startsWith("http") ? v : `https://${v}`).success, "URL inválida");

const cnpj = z
  .string()
  .optional()
  .transform((v) => (v ?? "").replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 14, "CNPJ deve ter 14 dígitos")
  .transform((v) => (v === "" ? null : v));

const isoDate = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data no formato AAAA-MM-DD")
  .transform((v) => (v === "" ? null : v));

const isoDateTime = z.coerce.date({ error: "Data e hora inválidas" });

const valueCentsRequired = z.coerce
  .number({ error: "Valor obrigatório" })
  .int("Valor em centavos, sem casas decimais")
  .min(1, "Valor tem que ser maior que zero");

const valueCentsOptional = z
  .union([z.coerce.number().int(), z.literal("").transform(() => null), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || v >= 0, "Valor não pode ser negativo");

const currency = z.enum(CURRENCY).default("BRL");

export const companySchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(160, "Máximo 160 caracteres"),
  cnpj,
  website: optionalUrl,
  industry: optionalText(120),
  size: optionalText(60),
  source: z.enum(["site_contact", "referral", "event", "outbound", "other"]).default("outbound"),
  notes: optionalText(4000),
});
export type CompanyInput = z.input<typeof companySchema>;

export const contactSchema = z.object({
  companyId: z.uuid(),
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(160, "Máximo 160 caracteres"),
  email: optionalEmail,
  phone: optionalText(60),
  role: z.enum(["primary", "technical", "financial", "other"]).default("primary"),
  title: optionalText(120),
  notes: optionalText(4000),
});
export type ContactInput = z.input<typeof contactSchema>;

export const opportunitySchema = z.object({
  companyId: z.uuid(),
  primaryContactId: z.union([z.uuid(), z.literal("").transform(() => null), z.null()]).optional().transform((v) => (v === undefined || v === "" ? null : v)),
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  stage: z.enum(["new", "qualified", "meeting", "proposal", "won", "lost"]).default("new"),
  valueCents: valueCentsOptional,
  currency,
  expectedCloseAt: isoDate,
  nextStep: optionalText(500),
  nextStepAt: isoDate,
});
export type OpportunityInput = z.input<typeof opportunitySchema>;

export const changeStageSchema = z
  .object({
    to: z.enum(["new", "qualified", "meeting", "proposal", "won", "lost"]),
    lostReason: optionalText(1000),
  })
  .refine((v) => v.to !== "lost" || (v.lostReason ?? "").length >= 3, {
    error: "Diga em uma frase por que foi perdida.",
    path: ["lostReason"],
  });
export type ChangeStageInput = z.input<typeof changeStageSchema>;

export const interactionSchema = z
  .object({
    type: z.enum(["call", "email", "meeting", "note"]),
    at: isoDateTime,
    summary: z.string().trim().min(2, "Descreva em uma frase").max(200, "Máximo 200 caracteres"),
    body: optionalText(8000),
    companyId: z.union([z.uuid(), z.literal("").transform(() => null), z.null()]).optional().transform((v) => (v === undefined || v === "" ? null : v)),
    contactId: z.union([z.uuid(), z.literal("").transform(() => null), z.null()]).optional().transform((v) => (v === undefined || v === "" ? null : v)),
    opportunityId: z.union([z.uuid(), z.literal("").transform(() => null), z.null()]).optional().transform((v) => (v === undefined || v === "" ? null : v)),
  })
  .refine(
    (v) => v.companyId !== null || v.contactId !== null || v.opportunityId !== null,
    {
      error: "Informe pelo menos uma empresa, contato ou oportunidade.",
      path: ["companyId"],
    },
  );
export type InteractionInput = z.input<typeof interactionSchema>;

export const proposalSchema = z.object({
  opportunityId: z.uuid(),
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  valueCents: valueCentsRequired,
  currency,
  validUntil: isoDate,
});
export type ProposalInput = z.input<typeof proposalSchema>;

export const changeProposalStatusSchema = z.object({
  to: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
  decisionNotes: optionalText(2000),
  sentAt: isoDate,
  validUntil: isoDate,
});
export type ChangeProposalStatusInput = z.input<typeof changeProposalStatusSchema>;
