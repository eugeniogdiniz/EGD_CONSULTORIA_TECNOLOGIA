CREATE TYPE "public"."project_expense_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."project_expense_kind" ADD VALUE 'software' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."project_expense_kind" ADD VALUE 'tax' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."project_expense_kind" ADD VALUE 'payroll' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "project_expense" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_expense" ADD COLUMN "supplier" text;--> statement-breakpoint
ALTER TABLE "project_expense" ADD COLUMN "due_at" date;--> statement-breakpoint
ALTER TABLE "project_expense" ADD COLUMN "status" "project_expense_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_expense" ADD COLUMN "paid_at" date;--> statement-breakpoint
-- Despesas já lançadas eram gastos realizados: viram contas pagas na data da despesa.
UPDATE "project_expense" SET "due_at" = "date_at", "status" = 'paid', "paid_at" = "date_at" WHERE "due_at" IS NULL;--> statement-breakpoint
ALTER TABLE "project_expense" ALTER COLUMN "due_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "expense_status_due_idx" ON "project_expense" USING btree ("status","due_at");