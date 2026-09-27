import { pgTable, text, timestamp, uuid, bigint, index } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { organizations } from "@/modules/tenancy/schema";

export const files = pgTable(
  "files",
  {
    id: uuid().primaryKey().defaultRandom(),
    bucketKey: text().notNull().unique(),
    originalName: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: bigint({ mode: "number" }).notNull(),
    // null = arquivo interno do admin, sem organização dona
    organizationId: uuid().references(() => organizations.id, { onDelete: "cascade" }),
    uploadedBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("files_org_idx").on(t.organizationId)],
);
