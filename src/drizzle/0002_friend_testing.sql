CREATE TYPE "public"."handshake_kind" AS ENUM('exchange', 'friend');--> statement-breakpoint
ALTER TABLE "handshakes" ALTER COLUMN "app_a_id" DROP NOT NULL;--> statement-breakpoint
-- Existing apps get a random invite code before the column becomes NOT NULL.
ALTER TABLE "apps" ADD COLUMN "invite_code" text;--> statement-breakpoint
UPDATE "apps" SET "invite_code" = substr(md5(random()::text || "id"::text), 1, 12);--> statement-breakpoint
ALTER TABLE "apps" ALTER COLUMN "invite_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "handshakes" ADD COLUMN "kind" "handshake_kind" DEFAULT 'exchange' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "apps_invite_code_key" ON "apps" USING btree ("invite_code");
