CREATE TYPE "public"."project_deliverable_status" AS ENUM('todo', 'doing', 'review', 'done', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'on_hold', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"budget_cents" bigint,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"started_at" date,
	"ended_at" date,
	"owner_id" uuid NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_opportunityId_unique" UNIQUE("opportunity_id")
);
--> statement-breakpoint
CREATE TABLE "project_deliverable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "project_deliverable_status" DEFAULT 'todo' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"assignee_id" uuid,
	"due_at" date,
	"completed_at" timestamp with time zone,
	"file_id" uuid,
	"visible_to_client" boolean DEFAULT false NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase_id" uuid,
	"name" text NOT NULL,
	"due_at" date NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_phase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"started_at" date,
	"ended_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_opportunity_id_crm_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_company_id_crm_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_phase_id_project_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phase"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone" ADD CONSTRAINT "project_milestone_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone" ADD CONSTRAINT "project_milestone_phase_id_project_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phase"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phase" ADD CONSTRAINT "project_phase_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_company_idx" ON "project" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "project_owner_idx" ON "project" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "project_archived_idx" ON "project" USING btree ("updated_at") WHERE "project"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "project_deliverable_project_idx" ON "project_deliverable" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_deliverable_status_position_idx" ON "project_deliverable" USING btree ("project_id","status","position");--> statement-breakpoint
CREATE INDEX "project_deliverable_due_idx" ON "project_deliverable" USING btree ("due_at") WHERE "project_deliverable"."status" <> 'done';--> statement-breakpoint
CREATE INDEX "project_deliverable_assignee_idx" ON "project_deliverable" USING btree ("assignee_id") WHERE "project_deliverable"."status" <> 'done';--> statement-breakpoint
CREATE INDEX "project_milestone_project_due_idx" ON "project_milestone" USING btree ("project_id","due_at");--> statement-breakpoint
CREATE INDEX "project_milestone_pending_idx" ON "project_milestone" USING btree ("due_at") WHERE "project_milestone"."completed_at" is null;--> statement-breakpoint
CREATE INDEX "project_phase_project_idx" ON "project_phase" USING btree ("project_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "project_phase_position_uniq" ON "project_phase" USING btree ("project_id","position");