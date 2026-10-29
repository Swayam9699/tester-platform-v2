-- Supabase exposes the public schema through its REST API with the anon key.
-- All data access goes through the Next.js server's direct Postgres connection, so lock the API out:
-- RLS enabled with no policies = no rows visible to anon/authenticated roles.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "apps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "handshakes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "handshake_sides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_checkins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "disputes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
