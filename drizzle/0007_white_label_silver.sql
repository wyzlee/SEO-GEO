ALTER TABLE "organizations" ADD COLUMN "custom_domain" text UNIQUE;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_email_from_name" text;
