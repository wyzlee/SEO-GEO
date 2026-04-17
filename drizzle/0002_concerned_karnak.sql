-- La colonne `upload_path` existait déjà en prod (ajoutée via push direct au
-- Sprint 06, jamais tracée en migration). Elle est désormais dans le snapshot
-- 0002 — aligné sur la réalité de la base. On saute la ligne `ADD COLUMN
-- upload_path` pour éviter l'erreur "column already exists" en prod.
ALTER TABLE "audits" ADD COLUMN IF NOT EXISTS "upload_path" text;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "previous_audit_id" uuid;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_previous_audit_id_audits_id_fk" FOREIGN KEY ("previous_audit_id") REFERENCES "public"."audits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audits_previous_idx" ON "audits" USING btree ("previous_audit_id");