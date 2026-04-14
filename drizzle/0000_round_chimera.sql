CREATE TABLE "audit_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"phase_key" text NOT NULL,
	"phase_order" integer NOT NULL,
	"score" integer,
	"score_max" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"summary" text,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"input_type" text NOT NULL,
	"target_url" text,
	"upload_id" uuid,
	"github_repo" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"score_total" integer,
	"score_breakdown" jsonb,
	"client_name" text,
	"consultant_name" text,
	"mode" text DEFAULT 'full' NOT NULL,
	"queued_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"phase_key" text NOT NULL,
	"severity" text NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"recommendation" text NOT NULL,
	"location_url" text,
	"location_file" text,
	"location_line" integer,
	"metric_value" text,
	"metric_target" text,
	"points_lost" integer DEFAULT 0 NOT NULL,
	"effort" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"branding" jsonb,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"format" text NOT NULL,
	"language" text DEFAULT 'fr' NOT NULL,
	"template_version" text NOT NULL,
	"content_md" text,
	"content_html" text,
	"pdf_storage_key" text,
	"share_slug" text,
	"share_expires_at" timestamp,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reports_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"claim" text NOT NULL,
	"url" text NOT NULL,
	"consulted_at" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_phases" ADD CONSTRAINT "audit_phases_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_phases_uniq" ON "audit_phases" USING btree ("audit_id","phase_key");--> statement-breakpoint
CREATE INDEX "audit_phases_audit_idx" ON "audit_phases" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "audits_org_status_idx" ON "audits" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "audits_queued_idx" ON "audits" USING btree ("status","queued_at");--> statement-breakpoint
CREATE INDEX "findings_audit_idx" ON "findings" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "findings_severity_idx" ON "findings" USING btree ("audit_id","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_org_uniq" ON "memberships" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "reports_audit_idx" ON "reports" USING btree ("audit_id");