import { getServerBotApiUrls, getServerBotToken } from "./bot-server-config";

export async function fetchBotOwnerResource(path: string) {
  const token = getServerBotToken();
  if (!token) {
    return { ok: false as const, data: null, message: "Bot API belum dikonfigurasi" };
  }

  for (const apiUrl of getServerBotApiUrls()) {
    try {
      const response = await fetch(`${apiUrl}/api/owner/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      const data = await response.json().catch(() => null);
      if (response.ok) return { ok: true as const, data, message: "" };
    } catch {
      continue;
    }
  }

  return { ok: false as const, data: null, message: "Bot Runtime tidak tersedia" };
}
