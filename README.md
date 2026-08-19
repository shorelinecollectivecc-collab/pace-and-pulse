# pace & pulse

a calm, audhd-friendly workspace for two separate annotation jobs:
music annotation and video annotation.

## run locally

```powershell
npm install
npm run dev
```

open `http://127.0.0.1:5174/`.

## private settings

copy `.env.example` to `.env.local` and add only the values you use.
never upload or commit `.env.local`.

- `vite_spotify_client_id` connects the floating spotify player.
- `vite_spotify_redirect_uri` must exactly match a spotify redirect uri.
- `azure_translator_key` and `azure_translator_region` power translation
  through the server function.
- `vite_supabase_url` and `vite_supabase_anon_key` enable optional
  password-free account sync.
- `vite_support_email` adds the public shoreline collective support link.

## account sync

1. create a supabase project.
2. open its sql editor and run `supabase/schema.sql`.
3. add the local and live app urls to authentication redirect urls.
4. add the two public supabase values to `.env.local` and the live host.

each signed-in person can only read and update their own workspace row.
spotify tokens and translation caches are excluded from backup and sync.

## background nudges

the installed app supports web push for signed-in users. create a vapid key
pair with `npx web-push generate-vapid-keys`, then add the public key to
`vite_vapid_public_key` and the server values listed in `.env.example`.

`supabase_service_role_key`, `vapid_private_key` and `cron_secret` are private
server values. never prefix them with `vite_` and never put them in client code.
the included schedule checks every 15 minutes, matching the shortest nudge
interval.

## production

the project includes `vercel.json` for the vite app and the translation
function at `api/translate.ts`.

before going live:

1. add the environment variables in the host dashboard.
2. add the final live url to spotify redirect uris.
3. add the final live url to supabase authentication redirect urls.
4. rotate any key that has ever been included in a shared zip.
5. run `npm run build` and `npm run lint`.

## data safety

the settings page can export and restore a complete json workspace backup.
monthly music and video csv/pdf exports remain separate because they are
different jobs with different earnings.
