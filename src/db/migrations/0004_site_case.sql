CREATE TYPE "public"."site_case_size" AS ENUM('micro', 'small', 'medium', 'large');--> statement-breakpoint
CREATE TABLE "site_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sector" text NOT NULL,
	"size" "site_case_size" NOT NULL,
	"systems" integer DEFAULT 0 NOT NULL,
	"automations" integer DEFAULT 0 NOT NULL,
	"savings_cents" bigint DEFAULT 0 NOT NULL,
	"capex_cents" bigint DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_case_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "site_case_published_idx" ON "site_case" USING btree ("published","savings_cents");
--> statement-breakpoint
-- Dados iniciais: os cases que estavam fixos em src/content/cases.ts
INSERT INTO "site_case" ("slug", "name", "sector", "size", "systems", "automations", "savings_cents", "capex_cents", "featured", "published", "deliverables", "status_note") VALUES
	('bjmm', 'Consórcio BJMM', 'Habitação e engenharia', 'medium', 3, 15, 45948280, 2665600, true, true, '["GED corporativo","Sistema de vistoria em campo","15 relatórios automatizados"]'::jsonb, NULL),
	('habita-gerencial', 'Consórcio HABITA GERENCIAL', 'Habitação social', 'medium', 3, 4, 22800400, 9520000, true, true, '["SIGD de gerenciamento","Controle de recibos","Sistema de campo"]'::jsonb, NULL),
	('urbhis', 'Consórcio URBHIS', 'Urbanismo e habitação', 'large', 4, 12, 19972750, 5307400, true, true, '["Power Apps integrados","Atendimento de plantão","Power BI com mapa de conteúdo"]'::jsonb, NULL),
	('macae', 'Macaé Petrobras', 'Petróleo e gás', 'medium', 1, 12, 4866000, 3094000, false, true, '["Gerenciamento de Cabiúnas","Compensação de inquilinos","12 relatórios automatizados"]'::jsonb, NULL),
	('vinci', 'Vinci Notificações', 'Notificações e compliance', 'micro', 2, 2, 2877000, 428400, false, true, '["App de notificações","Relatório geral automatizado"]'::jsonb, NULL),
	('bggk', 'Consórcio BGGK', 'Engenharia', 'small', 2, 3, 1668625, 190400, false, true, '["SIGD dedicado","Sistema de campo"]'::jsonb, NULL),
	('bgpi', 'Consórcio BGPI', 'Engenharia', 'medium', 2, 2, 1668625, 190400, false, true, '["SIGD e sistema de campo"]'::jsonb, NULL),
	('habita-social', 'Consórcio HABITA SOCIAL', 'Habitação social', 'large', 3, 3, 1659375, 1047200, false, true, '["Lançamento de KM","Controle de frotas","Planejamento"]'::jsonb, NULL),
	('cohab', 'COHAB Santos', 'Habitação pública', 'micro', 2, 3, 1148750, 71400, false, true, '["Sistema web dedicado","App Android de arrolamento"]'::jsonb, NULL),
	('cosan', 'Cosan', 'Energia e logística', 'micro', 3, 2, 0, 0, false, true, '["SIGD","Controle de arquivos","Sistema de campo"]'::jsonb, 'Em desenvolvimento'),
	('reurbsp', 'Consórcio REURBSP', 'Regularização fundiária', 'large', 0, 4, 0, 0, false, true, '["4 automações em homologação"]'::jsonb, 'Em desenvolvimento'),
	('eletrobras', 'Eletrobras', 'Energia', 'micro', 1, 0, 0, 0, false, true, '["Gestão de documentos (GED)"]'::jsonb, NULL),
	('habita-reurbsp', 'Consórcio Habita REURBSP', 'Regularização e habitação', 'large', 1, 0, 0, 0, false, true, '["Sistema GED em produção"]'::jsonb, NULL)
ON CONFLICT ("slug") DO NOTHING;
