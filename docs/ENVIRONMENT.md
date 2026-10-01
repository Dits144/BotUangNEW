# Environment Variables

## Public Browser Variables

These values are bundled into the browser and must only contain public Supabase
project information.

```text
NEXT_PUBLIC_SUPABASE_URL=https://xauwlfhlrtwblstgptyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_qBDNFMAgvB_MjhgqF8PCGg_rO-9bo42
```

Do not put `sb_secret_...` values in `NEXT_PUBLIC_*` variables.

## Server-Only Variables

These are only for Vercel/server runtime.

```text
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_or_service_role_key
BOT_API_URL=https://shoppers-rebates-font-headphones.trycloudflare.com
BOT_API_TOKEN=your_bot_api_token
LOVABLE_API_KEY=your_bot_api_token
OWNER_EMAILS=dits144@gmail.com
```

Never expose server-only keys to client components or browser bundles.
