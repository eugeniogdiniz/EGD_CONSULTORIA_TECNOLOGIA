CREATE TABLE "project_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_document_fileId_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "project_document_folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"system_key" text,
	"position" integer DEFAULT 0 NOT NULL,
	"visible_to_client" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_document" ADD CONSTRAINT "project_document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document" ADD CONSTRAINT "project_document_folder_id_project_document_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."project_document_folder"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document" ADD CONSTRAINT "project_document_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document" ADD CONSTRAINT "project_document_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document_folder" ADD CONSTRAINT "project_document_folder_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_document_folder_idx" ON "project_document" USING btree ("folder_id","created_at");--> statement-breakpoint
CREATE INDEX "project_document_project_idx" ON "project_document" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_document_folder_project_idx" ON "project_document_folder" USING btree ("project_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_folder_name_uniq" ON "project_document_folder" USING btree ("project_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_folder_system_uniq" ON "project_document_folder" USING btree ("project_id","system_key") WHERE "project_document_folder"."system_key" is not null;--> statement-breakpoint
-- pastas padrão para os projetos que já existem (mesma lista de src/modules/project-documents/folders.ts)
INSERT INTO "project_document_folder" ("project_id", "name", "system_key", "position", "visible_to_client")
SELECT p."id", f."name", f."system_key", f."position", f."visible_to_client"
FROM "project" p
CROSS JOIN (VALUES
  ('Proposta', 'proposta', 0, true),
  ('Contrato', 'contrato', 1, true),
  ('Administrativo', 'administrativo', 2, false),
  ('Financeiro', 'financeiro', 3, false),
  ('Técnico', 'tecnico', 4, false),
  ('Entregas', 'entregas', 5, true)
) AS f("name", "system_key", "position", "visible_to_client")
ON CONFLICT DO NOTHING;
