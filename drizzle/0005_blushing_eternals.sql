ALTER TABLE "organizations" ALTER COLUMN "plan" SET DEFAULT 'discovery';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "audit_usage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");--> statement-breakpoint
-- Renommage des anciens plans vers les nouveaux identifiants S2.3
-- 'free' → 'discovery', 'pro' → 'studio' (agency inchangé)
UPDATE "organizations" SET "plan" = 'discovery' WHERE "plan" = 'free';--> statement-breakpoint
UPDATE "organizations" SET "plan" = 'studio'    WHERE "plan" = 'pro';