export const ANDROID_VERSIONS = [
  { api: 37, label: "Android 17" },
  { api: 36, label: "Android 16" },
  { api: 35, label: "Android 15" },
  { api: 34, label: "Android 14" },
  { api: 33, label: "Android 13" },
  { api: 32, label: "Android 12L" },
  { api: 31, label: "Android 12" },
  { api: 30, label: "Android 11" },
  { api: 29, label: "Android 10" },
  { api: 28, label: "Android 9" },
  { api: 27, label: "Android 8.1" },
  { api: 26, label: "Android 8.0" },
  { api: 25, label: "Android 7.1" },
  { api: 24, label: "Android 7.0" },
  { api: 23, label: "Android 6.0" },
  { api: 22, label: "Android 5.1" },
  { api: 21, label: "Android 5.0" },
] as const;

export function androidLabel(api: number | null | undefined): string {
  if (api == null) return "Unknown";
  return ANDROID_VERSIONS.find((v) => v.api === api)?.label ?? `API ${api}`;
}

export function isValidApi(api: number): boolean {
  return ANDROID_VERSIONS.some((v) => v.api === api);
}
