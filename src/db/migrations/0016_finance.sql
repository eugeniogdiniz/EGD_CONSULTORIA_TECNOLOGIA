CREATE TYPE "public"."project_invoice_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "project_invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"description" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"due_at" date NOT NULL,
	"status" "project_invoice_status" DEFAULT 'pending' NOT NULL,
	"paid_at" date,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_amount_positive" CHECK ("project_invoice"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "project_rate" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"hourly_rate_cents" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_rate_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD COLUMN "estimate_minutes" integer;--> statement-breakpoint
ALTER TABLE "project_time_entry" ADD COLUMN "rate_cents" bigint;--> statement-breakpoint
ALTER TABLE "project_invoice" ADD CONSTRAINT "project_invoice_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invoice" ADD CONSTRAINT "project_invoice_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_rate" ADD CONSTRAINT "project_rate_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_rate" ADD CONSTRAINT "project_rate_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_project_due_idx" ON "project_invoice" USING btree ("project_id","due_at");--> statement-breakpoint
CREATE INDEX "invoice_status_due_idx" ON "project_invoice" USING btree ("status","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_project_number_uniq" ON "project_invoice" USING btree ("project_id","number");