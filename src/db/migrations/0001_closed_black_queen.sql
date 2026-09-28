CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."crm_company_source" AS ENUM('site_contact', 'referral', 'event', 'outbound', 'other');--> statement-breakpoint
CREATE TYPE "public"."crm_contact_role" AS ENUM('primary', 'technical', 'financial', 'other');--> statement-breakpoint
CREATE TYPE "public"."crm_interaction_type" AS ENUM('call', 'email', 'meeting', 'note');--> statement-breakpoint
CREATE TYPE "public"."crm_opportunity_stage" AS ENUM('new', 'qualified', 'meeting', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."crm_proposal_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired');--> statement-breakpoint
ALTER TYPE "public"."lead_status" ADD VALUE 'converted';--> statement-breakpoint
CREATE TABLE "crm_company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"cnpj" text,
	"website" text,
	"industry" text,
	"size" text,
	"source" "crm_company_source" DEFAULT 'outbound' NOT NULL,
	"owner_id" uuid NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"linked_organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_company_slug_unique" UNIQUE("slug"),
	CONSTRAINT "crm_company_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "crm_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" "crm_contact_role" DEFAULT 'primary' NOT NULL,
	"title" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_interaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "crm_interaction_type" NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"by_user_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"body" text,
	"company_id" uuid,
	"contact_id" uuid,
	"opportunity_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_interaction_has_anchor" CHECK (coalesce("crm_interaction"."company_id", "crm_interaction"."opportunity_id", "crm_interaction"."contact_id") is not null)
);
--> statement-breakpoint
CREATE TABLE "crm_opportunity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"primary_contact_id" uuid,
	"title" text NOT NULL,
	"stage" "crm_opportunity_stage" DEFAULT 'new' NOT NULL,
	"value_cents" bigint,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"expected_close_at" date,
	"next_step" text,
	"next_step_at" date,
	"owner_id" uuid NOT NULL,
	"won_at" timestamp with time zone,
	"lost_at" timestamp with time zone,
	"lost_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_proposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"title" text NOT NULL,
	"value_cents" bigint NOT NULL,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"status" "crm_proposal_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"valid_until" date,
	"decided_at" timestamp with time zone,
	"decision_notes" text,
	"file_id" uuid,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_proposal_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_company_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_contact_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_opportunity_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_by" uuid;--> statement-breakpoint
ALTER TABLE "crm_company" ADD CONSTRAINT "crm_company_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_company" ADD CONSTRAINT "crm_company_linked_organization_id_organizations_id_fk" FOREIGN KEY ("linked_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact" ADD CONSTRAINT "crm_contact_company_id_crm_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact" ADD CONSTRAINT "crm_contact_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interaction" ADD CONSTRAINT "crm_interaction_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interaction" ADD CONSTRAINT "crm_interaction_company_id_crm_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interaction" ADD CONSTRAINT "crm_interaction_contact_id_crm_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interaction" ADD CONSTRAINT "crm_interaction_opportunity_id_crm_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity" ADD CONSTRAINT "crm_opportunity_company_id_crm_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity" ADD CONSTRAINT "crm_opportunity_primary_contact_id_crm_contact_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."crm_contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity" ADD CONSTRAINT "crm_opportunity_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposal" ADD CONSTRAINT "crm_proposal_opportunity_id_crm_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposal" ADD CONSTRAINT "crm_proposal_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposal" ADD CONSTRAINT "crm_proposal_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_company_owner_idx" ON "crm_company" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "crm_company_archived_idx" ON "crm_company" USING btree ("updated_at") WHERE "crm_company"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "crm_company_name_trgm" ON "crm_company" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "crm_contact_company_idx" ON "crm_contact" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "crm_contact_email_trgm" ON "crm_contact" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "crm_contact_name_trgm" ON "crm_contact" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "crm_contact_primary_uniq" ON "crm_contact" USING btree ("company_id") WHERE "crm_contact"."role" = 'primary' and "crm_contact"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "crm_interaction_company_at_idx" ON "crm_interaction" USING btree ("company_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crm_interaction_opportunity_at_idx" ON "crm_interaction" USING btree ("opportunity_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crm_interaction_contact_at_idx" ON "crm_interaction" USING btree ("contact_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crm_opportunity_stage_idx" ON "crm_opportunity" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "crm_opportunity_company_idx" ON "crm_opportunity" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "crm_opportunity_owner_idx" ON "crm_opportunity" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "crm_opportunity_next_step_idx" ON "crm_opportunity" USING btree ("next_step_at") WHERE "crm_opportunity"."stage" not in ('won', 'lost');--> statement-breakpoint
CREATE INDEX "crm_proposal_opportunity_idx" ON "crm_proposal" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "crm_proposal_status_idx" ON "crm_proposal" USING btree ("status");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_company_id_crm_company_id_fk" FOREIGN KEY ("converted_company_id") REFERENCES "public"."crm_company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_contact_id_crm_contact_id_fk" FOREIGN KEY ("converted_contact_id") REFERENCES "public"."crm_contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_opportunity_id_crm_opportunity_id_fk" FOREIGN KEY ("converted_opportunity_id") REFERENCES "public"."crm_opportunity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_by_users_id_fk" FOREIGN KEY ("converted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_converted_at_idx" ON "leads" USING btree ("converted_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION crm_next_proposal_number(y int) RETURNS text AS $$
DECLARE
  seq_name text := 'crm_proposal_seq_' || y;
  n bigint;
BEGIN
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', seq_name);
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO n;
  RETURN 'PROP-' || lpad((y % 100)::text, 2, '0') || '-' || lpad(n::text, 3, '0');
END;
$$ LANGUAGE plpgsql;