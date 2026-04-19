CREATE TABLE "benchmark_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benchmark_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"is_reference" boolean DEFAULT false NOT NULL,
	"audit_id" uuid
);
--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "citation_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"query" text NOT NULL,
	"tool" text NOT NULL,
	"is_cited" boolean DEFAULT false NOT NULL,
	"competitor_domains_cited" text[] DEFAULT '{}' NOT NULL,
	"raw_response" text,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"target_keyword" text NOT NULL,
	"search_intent" text NOT NULL,
	"content_type" text NOT NULL,
	"word_count_target" integer NOT NULL,
	"outline" jsonb NOT NULL,
	"eeat_angle" text,
	"semantic_keywords" text[] DEFAULT '{}' NOT NULL,
	"brief_md" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"accepted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_email_from_name" text;--> statement-breakpoint
ALTER TABLE "scheduled_audits" ADD COLUMN "alert_threshold" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_audits" ADD COLUMN "last_alert_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "benchmark_urls" ADD CONSTRAINT "benchmark_urls_benchmark_id_benchmarks_id_fk" FOREIGN KEY ("benchmark_id") REFERENCES "public"."benchmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_urls" ADD CONSTRAINT "benchmark_urls_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_checks" ADD CONSTRAINT "citation_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "benchmark_urls_benchmark_idx" ON "benchmark_urls" USING btree ("benchmark_id");--> statement-breakpoint
CREATE INDEX "benchmarks_org_idx" ON "benchmarks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "benchmarks_status_idx" ON "benchmarks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "citation_checks_org_idx" ON "citation_checks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "citation_checks_domain_idx" ON "citation_checks" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "content_briefs_audit_idx" ON "content_briefs" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "content_briefs_org_idx" ON "content_briefs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_org_idx" ON "invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_custom_domain_unique" UNIQUE("custom_domain");