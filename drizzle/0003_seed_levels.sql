-- Level table rows (mirrors LEVELS in src/lib/config.ts). Seeded here because Cloudflare Workers open a new
-- connection per request, so the app can't upsert them at startup like it does under Node.
INSERT INTO "levels" ("level", "active_slots", "completions_required") VALUES
  (1, 12, 0),
  (2, 14, 10),
  (3, 16, 25),
  (4, 18, 50),
  (5, 20, 100)
ON CONFLICT ("level") DO UPDATE SET "active_slots" = EXCLUDED."active_slots", "completions_required" = EXCLUDED."completions_required";
