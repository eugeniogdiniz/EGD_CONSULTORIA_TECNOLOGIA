import { z } from "zod";
import { normalizeEmail } from "@/modules/auth/normalize-email";

// Opcional; aceita pontuação; vazio ou ausente vira null. (No Zod 4, .default() não passa
// pelas transformações, por isso o undefined é tratado dentro da cadeia.)
const cnpj = z
  .string()
  .optional()
  .transform((v) => (v ?? "").replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 14, "CNPJ deve ter 14 dígitos")
  .transform((v) => (v === "" ? null : v));

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  cnpj,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen")
    .max(80)
    .optional(),
  /** Andamento semanal por e-mail aos membros (Fase 13). */
  weeklyDigest: z.boolean().optional(),
});
export type OrganizationInput = z.input<typeof organizationSchema>;

export const inviteSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email("E-mail inválido")),
  organizationId: z.uuid(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(20),
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  password: z.string().min(10, "Mínimo 10 caracteres").max(128),
});
