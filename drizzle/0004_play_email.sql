ALTER TABLE "users" ADD COLUMN "play_email" text;--> statement-breakpoint
-- Everyone so far signed in with Google (or a demo account), so their sign-in email is their Play account.
UPDATE "users" SET "play_email" = "google_email";
