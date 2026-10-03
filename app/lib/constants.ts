export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://xauwlfhlrtwblstgptyk.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_qBDNFMAgvB_MjhgqF8PCGg_rO-9bo42";

export const BOT_API_URL =
  process.env.BOT_API_URL ??
  "https://shoppers-rebates-font-headphones.trycloudflare.com";
export const BOT_API_TOKEN = process.env.BOT_API_TOKEN ?? "";

export const TRUSTED_BOT_API_ORIGINS = [
  "https://shoppers-rebates-font-headphones.trycloudflare.com",
  "https://api.dashboardits.tech",
];

export const DASHBOARD_SESSION_KEY = "botuang.dashboard.session";
export const AUTH_REDIRECT_KEY = "botuang.auth.redirect";
