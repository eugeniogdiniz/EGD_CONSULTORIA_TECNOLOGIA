CREATE TABLE "meeting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"held_at" timestamp with time zone NOT NULL,
	"location" text,
	"agenda" text,
	"discussion" text,
	"decisions" text,
	"shared_with_client" boolean DEFAULT false NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_action_item" (
	"meeting_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_action_item_meeting_id_deliverable_id_pk" PRIMARY KEY("meeting_id","deliverable_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"organization" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_company_id_crm_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_item" ADD CONSTRAINT "meeting_action_item_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_item" ADD CONSTRAINT "meeting_action_item_deliverable_id_project_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD CONSTRAINT "meeting_participant_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD CONSTRAINT "meeting_participant_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_project_held_idx" ON "meeting" USING btree ("project_id","held_at");--> statement-breakpoint
CREATE INDEX "meeting_company_held_idx" ON "meeting" USING btree ("company_id","held_at");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_action_item_deliverable_uniq" ON "meeting_action_item" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "meeting_participant_meeting_idx" ON "meeting_participant" USING btree ("meeting_id","position");