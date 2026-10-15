CREATE TABLE "project_deliverable_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_deliverable_attachment_fileId_unique" UNIQUE("file_id")
);
--> statement-breakpoint
ALTER TABLE "project_deliverable_attachment" ADD CONSTRAINT "project_deliverable_attachment_deliverable_id_project_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable_attachment" ADD CONSTRAINT "project_deliverable_attachment_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable_attachment" ADD CONSTRAINT "project_deliverable_attachment_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_deliverable_attachment_deliverable_idx" ON "project_deliverable_attachment" USING btree ("deliverable_id","created_at");--> statement-breakpoint
-- o arquivo único que a entrega já tinha vira o primeiro anexo
INSERT INTO "project_deliverable_attachment" ("deliverable_id", "file_id", "uploaded_by", "created_at")
SELECT d."id", d."file_id", coalesce(f."uploaded_by", d."owner_id"), coalesce(f."created_at", d."updated_at")
FROM "project_deliverable" d
JOIN "files" f ON f."id" = d."file_id"
WHERE d."file_id" IS NOT NULL
ON CONFLICT DO NOTHING;
