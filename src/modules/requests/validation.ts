import { z } from "zod";
import { isIsoDate } from "@/lib/iso-date";
import { PRIORITIES } from "@/modules/projects/priority";

const optionalUuid = z
  .union([z.uuid(), z.literal("").transform(() => null), z.null()])
  .optional()
  .transform((v) => v ?? null);

export const requestSchema = z.object({
  title: z.string().trim().min(3, "Mínimo 3 caracteres").max(160, "Máximo 160 caracteres"),
  body: z.string().trim().min(10, "Conte um pouco mais (mínimo 10 caracteres)").max(4000, "Máximo 4000 caracteres"),
  projectId: optionalUuid,
});
export type RequestInput = z.input<typeof requestSchema>;

export const messageSchema = z.object({
  requestId: z.uuid(),
  body: z.string().trim().min(1, "Mensagem vazia.").max(4000, "Máximo 4000 caracteres"),
});
export type MessageInput = z.input<typeof messageSchema>;

const optionalIsoDate = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .refine((v) => v === "" || isIsoDate(v), "Data inválida (AAAA-MM-DD)")
  .transform((v) => (v === "" ? null : v));

export const convertRequestSchema = z.object({
  projectId: z.uuid("Escolha o projeto."),
  assigneeId: optionalUuid,
  dueAt: optionalIsoDate,
  priority: z.enum(PRIORITIES),
  visibleToClient: z
    .union([z.literal("on"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "on"),
});
export type ConvertRequestInput = z.input<typeof convertRequestSchema>;
