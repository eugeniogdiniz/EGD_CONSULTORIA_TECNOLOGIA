CREATE TABLE "portal_request_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"message_id" uuid,
	"file_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_request" ADD COLUMN "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "portal_request" ADD COLUMN "first_response_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "portal_request" ADD COLUMN "first_response_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "portal_request" ADD COLUMN "reminder_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_request" ADD COLUMN "last_reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "portal_request_message" ADD COLUMN "internal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_request_attachment" ADD CONSTRAINT "portal_request_attachment_request_id_portal_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."portal_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_request_attachment" ADD CONSTRAINT "portal_request_attachment_message_id_portal_request_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."portal_request_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_request_attachment" ADD CONSTRAINT "portal_request_attachment_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portal_request_attachment_request_idx" ON "portal_request_attachment" USING btree ("request_id");--> statement-breakpoint
ALTER TABLE "portal_request" ADD CONSTRAINT "portal_request_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;