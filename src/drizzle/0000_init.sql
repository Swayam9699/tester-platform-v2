CREATE TYPE "public"."app_status" AS ENUM('draft', 'in_review', 'open', 'full', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."handshake_status" AS ENUM('requested', 'accepted', 'rejected', 'active', 'completed', 'broken', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."side_status" AS ENUM('pending', 'joined', 'active', 'completed', 'skipped');--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"package_name" text NOT NULL,
	"description" text,
	"join_android_link" text NOT NULL,
	"join_web_link" text NOT NULL,
	"logo_url" text,
	"min_android_api" integer NOT NULL,
	"group_added_confirmed" boolean DEFAULT false NOT NULL,
	"countries_all_confirmed" boolean DEFAULT false NOT NULL,
	"release_sent_confirmed" boolean DEFAULT false NOT NULL,
	"tester_slots" integer DEFAULT 16 NOT NULL,
	"duration_days" integer DEFAULT 16 NOT NULL,
	"status" "app_status" DEFAULT 'draft' NOT NULL,
	"priority_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"handshake_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"side_id" uuid NOT NULL,
	"date" date NOT NULL,
	"proof_url" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"handshake_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"side_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"bugs" text,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_rating_range" CHECK ("feedback"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "handshake_sides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handshake_id" uuid NOT NULL,
	"tester_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"joined_at" timestamp with time zone,
	"optin_proof_url" text,
	"proof_rejected" boolean DEFAULT false NOT NULL,
	"last_checkin_date" date,
	"checkin_count" integer DEFAULT 0 NOT NULL,
	"missed_streak" integer DEFAULT 0 NOT NULL,
	"status" "side_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handshakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" uuid NOT NULL,
	"app_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"app_b_id" uuid NOT NULL,
	"status" "handshake_status" DEFAULT 'requested' NOT NULL,
	"message" text,
	"ended_reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	CONSTRAINT "handshakes_distinct_users" CHECK ("handshakes"."user_a_id" <> "handshakes"."user_b_id")
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"level" integer PRIMARY KEY NOT NULL,
	"active_slots" integer NOT NULL,
	"completions_required" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"device_android_api" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"completed_handshakes" integer DEFAULT 0 NOT NULL,
	"failed_handshakes" integer DEFAULT 0 NOT NULL,
	"reliability_score" integer DEFAULT 100 NOT NULL,
	"blocked_until" timestamp with time zone,
	"joined_google_group" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_email_unique" UNIQUE("google_email")
);
--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_handshake_id_handshakes_id_fk" FOREIGN KEY ("handshake_id") REFERENCES "public"."handshakes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_side_id_handshake_sides_id_fk" FOREIGN KEY ("side_id") REFERENCES "public"."handshake_sides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_handshake_id_handshakes_id_fk" FOREIGN KEY ("handshake_id") REFERENCES "public"."handshakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_side_id_handshake_sides_id_fk" FOREIGN KEY ("side_id") REFERENCES "public"."handshake_sides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handshake_sides" ADD CONSTRAINT "handshake_sides_handshake_id_handshakes_id_fk" FOREIGN KEY ("handshake_id") REFERENCES "public"."handshakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handshake_sides" ADD CONSTRAINT "handshake_sides_tester_id_users_id_fk" FOREIGN KEY ("tester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handshake_sides" ADD CONSTRAINT "handshake_sides_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handshakes" ADD CONSTRAINT "handshakes_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handshakes" ADD CONSTRAINT "handshakes_app_a_id_apps_id_fk" FOREIGN KEY ("app_a_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handshakes" ADD CONSTRAINT "handshakes_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handshakes" ADD CONSTRAINT "handshakes_app_b_id_apps_id_fk" FOREIGN KEY ("app_b_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "apps_package_name_key" ON "apps" USING btree ("package_name");--> statement-breakpoint
CREATE INDEX "apps_status_idx" ON "apps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blocks_user_idx" ON "blocks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checkins_side_date_key" ON "daily_checkins" USING btree ("side_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_side_key" ON "feedback" USING btree ("side_id");--> statement-breakpoint
CREATE UNIQUE INDEX "handshake_sides_direction_key" ON "handshake_sides" USING btree ("handshake_id","tester_id");--> statement-breakpoint
CREATE INDEX "handshake_sides_app_idx" ON "handshake_sides" USING btree ("app_id","status");--> statement-breakpoint
CREATE INDEX "handshake_sides_tester_idx" ON "handshake_sides" USING btree ("tester_id","status");--> statement-breakpoint
CREATE INDEX "handshakes_user_a_idx" ON "handshakes" USING btree ("user_a_id","status");--> statement-breakpoint
CREATE INDEX "handshakes_user_b_idx" ON "handshakes" USING btree ("user_b_id","status");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");