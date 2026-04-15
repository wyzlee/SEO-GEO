ALTER TABLE "audit_phases" ALTER COLUMN "score" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "audit_phases" ALTER COLUMN "score_max" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "audits" ALTER COLUMN "score_total" SET DATA TYPE real;