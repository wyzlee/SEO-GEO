CREATE TABLE "scheduled_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"target_url" text NOT NULL,
	"mode" text DEFAULT 'standard' NOT NULL,
	"frequency" text NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"last_run_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_audits" ADD CONSTRAINT "scheduled_audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_audits" ADD CONSTRAINT "scheduled_audits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_audits_org_idx" ON "scheduled_audits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scheduled_audits_next_run_idx" ON "scheduled_audits" USING btree ("next_run_at","is_active");