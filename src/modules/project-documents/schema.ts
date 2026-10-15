import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { files } from "@/modules/files/schema";
import { project } from "@/modules/projects/schema";

/**
 * GED do projeto: pastas por projeto (as padrão vêm com `systemKey`) e os
 * documentos enviados nelas. O cliente vê uma pasta inteira quando
 * `visibleToClient` está ligado; não há visibilidade por documento.
 */
export const projectDocumentFolder = pgTable(
  "project_document_folder",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** pastas padrão (proposta, contrato, administrativo, financeiro, tecnico, entregas); nulo = criada pela equipe */
    systemKey: text(),
    position: integer().default(0).notNull(),
    visibleToClient: boolean().default(false).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("project_document_folder_project_idx").on(t.projectId, t.position),
    uniqueIndex("project_document_folder_name_uniq").on(t.projectId, sql`lower(${t.name})`),
    uniqueIndex("project_document_folder_system_uniq")
      .on(t.projectId, t.systemKey)
      .where(sql`${t.systemKey} is not null`),
  ],
);

export const projectDocument = pgTable(
  "project_document",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    // sem cascade: pasta com documento não se apaga (a action recusa antes)
    folderId: uuid()
      .notNull()
      .references(() => projectDocumentFolder.id),
    fileId: uuid()
      .notNull()
      .unique()
      .references(() => files.id, { onDelete: "cascade" }),
    title: text().notNull(),
    notes: text(),
    uploadedBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("project_document_folder_idx").on(t.folderId, t.createdAt),
    index("project_document_project_idx").on(t.projectId),
  ],
);
