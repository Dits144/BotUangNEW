import { BOT_API_URL, TRUSTED_BOT_API_ORIGINS } from "./constants";

export function resolveTrustedBotApiUrl(candidate?: string | null) {
  const fallback = BOT_API_URL.replace(/\/$/, "");
  if (!candidate) return fallback;

  try {
    const parsed = new URL(candidate);
    const origin = parsed.origin.replace(/\/$/, "");
    if (TRUSTED_BOT_API_ORIGINS.includes(origin)) {
      return origin;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
