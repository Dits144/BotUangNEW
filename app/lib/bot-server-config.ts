import { BOT_API_URL, TRUSTED_BOT_API_ORIGINS } from "./constants";
import { resolveTrustedBotApiUrl } from "./bot-api";

export function getServerBotApiUrl(candidate?: string | null) {
  return resolveTrustedBotApiUrl(candidate || process.env.BOT_API_URL || BOT_API_URL);
}

export function getServerBotApiUrls(candidate?: string | null) {
  const urls = [
    candidate,
    process.env.BOT_API_URL,
    BOT_API_URL,
    "https://api.dashboardits.tech",
  ]
    .map((item) => getServerBotApiUrl(item))
    .filter(Boolean);

  return Array.from(new Set(urls));
}

export function getServerBotToken(candidate?: string | null) {
  return (
    candidate ||
    process.env.BOT_API_TOKEN ||
    process.env.LOVABLE_API_KEY ||
    ""
  );
}

export function getTrustedBotOrigins() {
  return TRUSTED_BOT_API_ORIGINS;
}
