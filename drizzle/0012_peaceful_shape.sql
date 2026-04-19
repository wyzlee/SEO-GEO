CREATE TABLE "org_admin_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"granted_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "org_admin_grants" ADD CONSTRAINT "org_admin_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_admin_grants" ADD CONSTRAINT "org_admin_grants_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_admin_grants" ADD CONSTRAINT "org_admin_grants_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_admin_grants_user_org_uniq" ON "org_admin_grants" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "org_admin_grants_user_idx" ON "org_admin_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_admin_grants_org_idx" ON "org_admin_grants" USING btree ("org_id");