const PACKAGE = "[a-zA-Z][a-zA-Z0-9_]*(?:\\.[a-zA-Z][a-zA-Z0-9_]*)+";

// "Join on web":  https://play.google.com/apps/testing/<package>
const WEB_LINK = new RegExp(`^(?:https?://)?play\\.google\\.com/apps/(?:internaltest|testing)/(${PACKAGE})/?(?:[?#].*)?$`);
// "Join on Android": https://play.google.com/store/apps/details?id=<package>
const ANDROID_LINK = new RegExp(`^(?:https?://)?play\\.google\\.com/store/apps/details\\?(?:.*&)?id=(${PACKAGE})(?:&.*)?$`);
const PACKAGE_ONLY = new RegExp(`^${PACKAGE}$`);

export type TestingLinks = { packageName: string; joinWebLink: string; joinAndroidLink: string };

export function webLink(packageName: string) {
  return `https://play.google.com/apps/testing/${packageName}`;
}

export function androidLink(packageName: string) {
  return `https://play.google.com/store/apps/details?id=${packageName}`;
}

/** Accepts either Play testing link and returns the package name plus both canonical links. */
export function parseTestingLink(input: string): TestingLinks | null {
  const value = input.trim();
  const match = value.match(WEB_LINK) ?? value.match(ANDROID_LINK);
  if (!match) return null;
  const packageName = match[1];
  return { packageName, joinWebLink: webLink(packageName), joinAndroidLink: androidLink(packageName) };
}

export function isPackageName(value: string) {
  return PACKAGE_ONLY.test(value);
}
