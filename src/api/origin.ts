import { headers } from "next/headers";

/** The site's own origin, for absolute links such as friend invites. */
export async function getOrigin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
