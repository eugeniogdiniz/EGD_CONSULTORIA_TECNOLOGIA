CREATE TYPE "public"."portal_request_status" AS ENUM('open', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TABLE "portal_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" "portal_request_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_request_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_request" ADD CONSTRAINT "portal_request_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_request" ADD CONSTRAINT "portal_request_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_request" ADD CONSTRAINT "portal_request_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_request_message" ADD CONSTRAINT "portal_request_message_request_id_portal_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."portal_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_request_message" ADD CONSTRAINT "portal_request_message_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portal_request_org_updated_idx" ON "portal_request" USING btree ("organization_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "portal_request_status_idx" ON "portal_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portal_request_message_request_idx" ON "portal_request_message" USING btree ("request_id","created_at");