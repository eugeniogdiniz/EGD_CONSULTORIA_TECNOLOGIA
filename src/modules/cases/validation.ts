import { z } from "zod";
import { parseDeliverables, reaisToCents } from "./public";

const checkbox = z
  .union([z.literal("on"), z.literal("off"), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on");

const count = z.coerce.number().int("Somente número inteiro.").min(0, "Não pode ser negativo.").max(100000, "Valor alto demais.");

const money = z
  .string()
  .optional()
  .transform((v) => reaisToCents(v ?? ""))
  .refine((n) => !Number.isNaN(n), "Valor inválido. Ex.: 1.234,56");

export const caseSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(160, "Máximo 160 caracteres"),
  sector: z.string().trim().min(2, "Mínimo 2 caracteres").max(160, "Máximo 160 caracteres"),
  size: z.enum(["micro", "small", "medium", "large"]),
  systems: count,
  automations: count,
  savings: money,
  capex: money,
  featured: checkbox,
  published: checkbox,
  deliverables: z
    .string()
    .optional()
    .transform((v) => parseDeliverables(v ?? ""))
    .refine((l) => l.length <= 12, "No máximo 12 entregas.")
    .refine((l) => l.every((x) => x.length <= 200), "Cada entrega até 200 caracteres."),
  statusNote: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(80, "Máximo 80 caracteres"))
    .transform((v) => (v === "" ? null : v)),
});
export type CaseInput = z.input<typeof caseSchema>;
