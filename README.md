# Velocity Turf

A turf-booking platform with three real, database-backed logins:

- **Player** — the booking app (`/player`)
- **Turf Owner** — manage turfs, bookings, payouts (`/owner`)
- **Admin** — platform-wide approvals, users, disputes (`/admin`)

Auth and accounts are handled by **Supabase** (free tier is enough). Hosting is on **Vercel** (free tier, one click from GitHub).

> Booking requests, owner payout/review records, player reviews, and disputes use
> Supabase queries. Checkout is still a demo flow and does not process payments.
> `supabase/schema.sql` creates the marketplace tables and their row-level security
> policies for a new Supabase project.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier).
2. Once it's created, open **SQL Editor** and paste in the contents of
  `supabase/schema.sql` from this repo, then click **Run**. This creates the
  profiles, marketplace, booking, review, match, notification, and payout tables,
  their access policies, slot/booking database functions, and the signup trigger.
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

- Sign up as a **Player**. To test the **Turf Owner** portal, sign in as the
  admin and invite an owner from the Admin dashboard.
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

## Deployment notes

The checked-in schema is intended for a new Supabase project. If marketplace tables
already exist, review and migrate their data and policies before applying this
schema; `create table if not exists` does not modify existing table definitions.
Checkout remains a demo flow and does not connect to a payment provider.

For anything admin-only that needs to read *all* rows regardless of owner
   (e.g. the Users table, All Turfs table), use `createAdminClient()` from
   `lib/supabase/admin.js` inside `app/admin/page.js` (a Server Component) —
   never import it into a Client Component, since it holds the service role key.
