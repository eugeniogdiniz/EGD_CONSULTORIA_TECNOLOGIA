import { z } from "zod";

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
