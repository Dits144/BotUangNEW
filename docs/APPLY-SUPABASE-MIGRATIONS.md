# Apply Supabase Migrations

The new Supabase project must have the BotUang base tables before the dashboard
can load.

Project:

```text
xauwlfhlrtwblstgptyk
https://xauwlfhlrtwblstgptyk.supabase.co
```

Apply these files in order from the Supabase SQL Editor:

1. `supabase/migrations/202610020000_base_schema.sql`
2. `supabase/migrations/202610020001_multi_group_access.sql`

The first migration fixes errors such as:

```text
Could not find the table 'public.transactions' in the schema cache
```

The second migration enables the new multi-group account access model.

After applying the SQL, refresh the dashboard and reconnect the WhatsApp group.

## Required Vercel Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL=https://xauwlfhlrtwblstgptyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_qBDNFMAgvB_MjhgqF8PCGg_rO-9bo42
SUPABASE_SERVICE_ROLE_KEY=your_server_only_secret_key
```

Do not put `sb_secret_...` in any `NEXT_PUBLIC_*` variable.
