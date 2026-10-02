CREATE TABLE "job_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"period_key" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"trigger" text NOT NULL,
	"actor_id" uuid,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "job_setting" (
	"job" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "weekly_digest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "job_run_period_uniq" ON "job_run" USING btree ("job","period_key","attempt") WHERE "job_run"."period_key" is not null;--> statement-breakpoint
CREATE INDEX "job_run_job_started_idx" ON "job_run" USING btree ("job","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_run_started_idx" ON "job_run" USING btree ("started_at" DESC NULLS LAST);