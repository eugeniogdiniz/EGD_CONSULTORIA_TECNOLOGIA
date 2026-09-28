CREATE TYPE "public"."project_expense_kind" AS ENUM('travel', 'service', 'equipment', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_time_source" AS ENUM('timer', 'manual');--> statement-breakpoint
CREATE TABLE "project_deliverable_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_deliverable_dependency" (
	"predecessor_id" uuid NOT NULL,
	"successor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_deliverable_dependency_predecessor_id_successor_id_pk" PRIMARY KEY("predecessor_id","successor_id"),
	CONSTRAINT "dep_no_self" CHECK ("project_deliverable_dependency"."predecessor_id" <> "project_deliverable_dependency"."successor_id")
);
--> statement-breakpoint
CREATE TABLE "project_expense" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"kind" "project_expense_kind" DEFAULT 'other' NOT NULL,
	"date_at" date NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_amount_positive" CHECK ("project_expense"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "project_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_template_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "project_template_deliverable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"phase_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_template_phase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "project_time_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"minutes" integer,
	"source" "project_time_source" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_end_after_start" CHECK ("project_time_entry"."ended_at" is null or "project_time_entry"."ended_at" > "project_time_entry"."started_at")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hourly_rate_cents" bigint;--> statement-breakpoint
ALTER TABLE "project_deliverable_comment" ADD CONSTRAINT "project_deliverable_comment_deliverable_id_project_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable_comment" ADD CONSTRAINT "project_deliverable_comment_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable_dependency" ADD CONSTRAINT "project_deliverable_dependency_predecessor_id_project_deliverable_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."project_deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable_dependency" ADD CONSTRAINT "project_deliverable_dependency_successor_id_project_deliverable_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."project_deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_expense" ADD CONSTRAINT "project_expense_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_expense" ADD CONSTRAINT "project_expense_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_template" ADD CONSTRAINT "project_template_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_template_deliverable" ADD CONSTRAINT "project_template_deliverable_template_id_project_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_template_deliverable" ADD CONSTRAINT "project_template_deliverable_phase_id_project_template_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_template_phase"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_template_phase" ADD CONSTRAINT "project_template_phase_template_id_project_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_time_entry" ADD CONSTRAINT "project_time_entry_deliverable_id_project_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_time_entry" ADD CONSTRAINT "project_time_entry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_deliverable_created_idx" ON "project_deliverable_comment" USING btree ("deliverable_id","created_at");--> statement-breakpoint
CREATE INDEX "dep_successor_idx" ON "project_deliverable_dependency" USING btree ("successor_id");--> statement-breakpoint
CREATE INDEX "expense_project_date_idx" ON "project_expense" USING btree ("project_id","date_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "template_deliverable_template_idx" ON "project_template_deliverable" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "template_phase_position_uniq" ON "project_template_phase" USING btree ("template_id","position");--> statement-breakpoint
CREATE INDEX "time_deliverable_idx" ON "project_time_entry" USING btree ("deliverable_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "time_user_open_uniq" ON "project_time_entry" USING btree ("user_id") WHERE "project_time_entry"."ended_at" is null;--> statement-breakpoint
-- FK auto-referente do comentário (parent_id → id da mesma tabela)
ALTER TABLE "project_deliverable_comment" ADD CONSTRAINT "project_deliverable_comment_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "project_deliverable_comment"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Trigger que bloqueia comentário-neto (thread limitada a 2 níveis)
CREATE OR REPLACE FUNCTION project_comment_no_grandchild() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM project_deliverable_comment p WHERE p.id = NEW.parent_id AND p.parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'project_comment_no_grandchild';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER project_comment_no_grandchild_trg
BEFORE INSERT OR UPDATE ON project_deliverable_comment
FOR EACH ROW EXECUTE PROCEDURE project_comment_no_grandchild();