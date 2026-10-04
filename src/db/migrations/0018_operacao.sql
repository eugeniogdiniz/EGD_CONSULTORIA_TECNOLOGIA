CREATE TABLE "app_error" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"path" text,
	"method" text,
	"route_kind" text,
	"digest" text,
	"user_id" uuid,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "rate_limit_bucket" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_bucket_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_error_fingerprint_uniq" ON "app_error" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "app_error_last_seen_idx" ON "app_error" USING btree ("last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "rate_limit_bucket_window_idx" ON "rate_limit_bucket" USING btree ("window_start");