CREATE TABLE "crm_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"proposal_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"document" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"document_version" integer DEFAULT 0 NOT NULL,
	"file_id" uuid,
	"issued_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contract_number_unique" UNIQUE("number"),
	CONSTRAINT "crm_contract_proposalId_unique" UNIQUE("proposal_id")
);
--> statement-breakpoint
ALTER TABLE "crm_company" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "crm_company" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "crm_company" ADD COLUMN "representative_name" text;--> statement-breakpoint
ALTER TABLE "crm_company" ADD COLUMN "representative_role" text;--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD COLUMN "acceptance_file_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_contract" ADD CONSTRAINT "crm_contract_proposal_id_crm_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."crm_proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contract" ADD CONSTRAINT "crm_contract_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contract" ADD CONSTRAINT "crm_contract_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_contract_status_idx" ON "crm_contract" USING btree ("status");--> statement-breakpoint
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_acceptance_file_id_files_id_fk" FOREIGN KEY ("acceptance_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION crm_next_contract_number(y int) RETURNS text AS $$
DECLARE seq_name text := 'crm_contract_seq_' || y; n bigint;
BEGIN
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', seq_name);
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO n;
  RETURN 'CT-' || lpad((y % 100)::text, 2, '0') || '-' || lpad(n::text, 3, '0');
END; $$ LANGUAGE plpgsql;
