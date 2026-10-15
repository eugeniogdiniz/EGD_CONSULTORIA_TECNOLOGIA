import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}: máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const folderSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à pasta").max(80, "Máximo 80 caracteres"),
  visibleToClient: z.boolean().default(false),
});
export type FolderInput = z.input<typeof folderSchema>;

export const documentSchema = z.object({
  folderId: z.uuid("Escolha uma pasta"),
  title: z.string().trim().min(1, "Dê um título ao documento").max(200, "Máximo 200 caracteres"),
  notes: optionalText(2000, "Observações"),
});
export type DocumentInput = z.input<typeof documentSchema>;
