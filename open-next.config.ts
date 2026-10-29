import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Only used for the optional Cloudflare deployment (`npm run build:cf`). Every page is rendered per
// request, so no incremental cache is needed.
export default defineCloudflareConfig({});
