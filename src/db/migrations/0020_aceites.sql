CREATE TABLE "crm_proposal_decision" (
	"proposal_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"ip_hash" text,
	"user_agent" text,
	"file_id" uuid,
	"document_version" integer DEFAULT 0 NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_deliverable_acceptance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_proposal_decision" ADD CONSTRAINT "crm_proposal_decision_proposal_id_crm_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."crm_proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposal_decision" ADD CONSTRAINT "crm_proposal_decision_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposal_decision" ADD CONSTRAINT "crm_proposal_decision_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable_acceptance" ADD CONSTRAINT "project_deliverable_acceptance_deliverable_id_project_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverable_acceptance" ADD CONSTRAINT "project_deliverable_acceptance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliverable_acceptance_idx" ON "project_deliverable_acceptance" USING btree ("deliverable_id","created_at" DESC NULLS LAST);