// shadcn/ui components import `cn` (clsx + tailwind-merge in one package) straight from "cn"; app code imports it from here,
// next to the app's own small helpers. See https://ui.shadcn.com/docs/installation/manual#add-a-cn-helper
export { cn } from "cn";

/** A stable non-negative hash, for picking a colour from a name. */
export function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** `value` as a whole percentage of `max`, clamped to 0–100 (for <Progress value>). */
export function percent(value: number, max: number) {
  return max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
}
