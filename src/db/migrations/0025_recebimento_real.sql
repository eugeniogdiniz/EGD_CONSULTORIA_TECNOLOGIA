ALTER TABLE "project_invoice" ADD COLUMN "received_cents" bigint;--> statement-breakpoint
-- parcelas já pagas: o recebido era o valor da parcela
UPDATE "project_invoice" SET "received_cents" = "amount_cents" WHERE "status" = 'paid' AND "received_cents" IS NULL;
