ALTER TABLE "crm_proposal" ADD COLUMN "document" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_proposal" ADD COLUMN "document_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_proposal" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_proposal" ADD COLUMN "emailed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_proposal" ADD CONSTRAINT "crm_proposal_contact_id_crm_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contact"("id") ON DELETE set null ON UPDATE no action;