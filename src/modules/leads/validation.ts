import { z } from "zod";
import { normalizeEmail } from "@/modules/auth/normalize-email";

/** Campo de texto opcional: vazio ou ausente vira null. */
const optionalText = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .pipe(z.string().max(120, "Máximo 120 caracteres"))
  .transform((v) => (v === "" ? null : v));

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120, "Máximo 120 caracteres"),
  email: z.string().transform(normalizeEmail).pipe(z.email("E-mail inválido")),
  company: optionalText,
  phone: optionalText,
  message: z.string().trim().min(10, "Conte um pouco mais").max(4000, "Máximo de 4000 caracteres"),
});

export type LeadInput = z.input<typeof leadSchema>;
