# Velocity Turf

A turf-booking platform with three real, database-backed logins:

- **Player** — the booking app (`/player`)
- **Turf Owner** — manage turfs, bookings, payouts (`/owner`)
- **Admin** — platform-wide approvals, users, disputes (`/admin`)

Auth and accounts are handled by **Supabase** (free tier is enough). Hosting is on **Vercel** (free tier, one click from GitHub).

> Turfs, bookings, payouts, disputes on the dashboards are currently mock data so
> you can see the UI working end-to-end. Auth, roles, and routing are fully real.
> Wiring real turf/booking tables is the natural next step (see bottom of this file).

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier).
2. Once it's created, open **SQL Editor** and paste in the contents of
   `supabase/schema.sql` from this repo, then click **Run**.
   This creates the `profiles` table (with a `role` column: player / owner / admin)
   and a trigger that auto-creates a profile row whenever someone signs up.
3. Go to **Authentication → Providers → Email** and, for quick testing,
   turn **off** "Confirm email" (so signup logs you in immediately instead of
   waiting on a confirmation email). Turn it back on before going fully live.
4. Go to **Settings → API** and copy three values:
   - Project URL
   - `anon` `public` key
   - `service_role` key (keep this one secret)

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the three values from above:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on `/login`.

- Sign up once as a **Player** and once as a **Turf Owner** using the role picker
  on the signup page, to see both portals.
- To create an **Admin** account: sign up normally (as anything), then in
  Supabase's SQL Editor run:
  ```sql
  update public.profiles set role = 'admin' where email = 'you@example.com';
  ```
  Sign out and back in — you'll now land on `/admin`.

Signing in always redirects to the right portal automatically based on the
account's role — there's no manual portal switcher anymore.

## 4. Deploy (Vercel)

1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import that repo.
3. Under **Environment Variables**, add the same three variables from your
   `.env.local` (Vercel won't read the `.env.local` file — you paste them into
   its dashboard).
4. Click **Deploy**. Done — you'll get a live `https://your-app.vercel.app` URL.

Anyone can now sign up and get routed to the portal that matches their role.

---

## Project structure

```
app/
  page.js              → redirects to /login or the right portal based on role
  login/page.js         → sign in
  signup/page.js        → sign up (choose Player or Turf Owner)
  admin/                → admin-only, redirects non-admins to /unauthorized
  owner/                → owner-only
  player/                → player-only
  unauthorized/page.js  → shown if you hit a portal that isn't yours
lib/supabase/
  client.js             → browser Supabase client
  server.js             → server Supabase client + getProfile() helper
  admin.js              → service-role client, server-only, for admin-wide reads
middleware.js           → keeps the auth session cookie fresh
supabase/schema.sql     → run this once in Supabase's SQL editor
```

## Next steps (optional)

Right now turfs/bookings/payouts are mock arrays inside the dashboard components
so the UI is fully functional to click through. To make it fully real:

1. Add `turfs`, `bookings`, and `payouts` tables in Supabase (with RLS policies
   scoped to the owning `owner_id` / `player_id`).
2. Replace the mock arrays in `app/admin/AdminDashboardClient.js`,
   `app/owner/OwnerDashboardClient.js`, and `app/player/PlayerAppClient.js`
   with real Supabase queries (`createClient()` from `lib/supabase/client.js`
   inside a `useEffect`, or fetch them server-side in the corresponding `page.js`
   and pass down as props).
3. For anything admin-only that needs to read *all* rows regardless of owner
   (e.g. the Users table, All Turfs table), use `createAdminClient()` from
   `lib/supabase/admin.js` inside `app/admin/page.js` (a Server Component) —
   never import it into a Client Component, since it holds the service role key.
