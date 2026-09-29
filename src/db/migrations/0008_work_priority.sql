CREATE TYPE "public"."work_priority" AS ENUM('urgent', 'high', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD COLUMN "priority" "work_priority" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_request" ADD COLUMN "priority" "work_priority" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_request" ADD COLUMN "deliverable_id" uuid;--> statement-breakpoint
ALTER TABLE "portal_request" ADD CONSTRAINT "portal_request_deliverable_id_project_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverable"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_deliverable_priority_idx" ON "project_deliverable" USING btree ("priority");