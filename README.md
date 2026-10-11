# Velocity Turf

A turf-booking platform with three real, database-backed logins:

- **Player** — the booking app (`/player`)
- **Turf Owner** — manage turfs, bookings, payouts (`/owner`)
- **Admin** — platform-wide approvals, users, disputes (`/admin`)

Auth and accounts are handled by **Supabase** (free tier is enough). Hosting is on **Vercel** (free tier, one click from GitHub).

> Player bookings are confirmed instantly; turf owners and admins can reject a
> booking afterward, which reopens its slot and notifies the player. Checkout is
> still a demo flow and does not process payments.
> `supabase/schema.sql` creates the marketplace tables and their row-level security
> policies for a new Supabase project. The initial schema's seven-day booking
> cleanup is replaced by `20261011_booking_safety.sql`, which archives eligible
> old bookings after 90 days. Turf listings are archived rather than hard-deleted
> so historical bookings and financial records remain intact.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier).
2. Once it's created, open **SQL Editor** and paste in the contents of
  `supabase/schema.sql` from this repo, then click **Run**. This creates the
  profiles, marketplace, booking, review, match, notification, and payout tables,
  their access policies, slot/booking database functions, signup trigger, and a
  daily job that removes past bookings older than seven days. Bookings referenced
  by reviews or disputes are retained.
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

Open [http://localhost:3000](http://localhost:3000) to browse venues and open
matches without signing in. An account is only needed to book a turf, join a
match, or access player-specific dashboard and loyalty features.

- Sign up as a **Player**. To test the **Turf Owner** portal, sign in as the
  admin and invite an owner from the Admin dashboard.
- To create an **Admin** account: sign up as a player, then in
  Supabase's SQL Editor run:
  ```sql
  update public.profiles set role = 'admin' where email = 'you@example.com';
  ```
  Sign out and back in — you'll now land on `/admin`.

Signing in always redirects to the right portal automatically based on the
account's role. Guests can browse the player experience at `/` or `/player`;
there's no manual portal switcher.

## 4. Deploy (Vercel)

1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import that repo.
3. Under **Environment Variables**, add the same three variables from your
   `.env.local` (Vercel won't read the `.env.local` file — you paste them into
   its dashboard).
4. Click **Deploy**. Done — you'll get a live `https://your-app.vercel.app` URL.

Anyone can sign up as a player and access the player portal. Admins can invite
turf owners from the Admin dashboard.

---

## Project structure

```
app/
  page.js              → guest player browsing, or the signed-in portal by role
  login/page.js         → sign in
  signup/page.js         → public player signup; owners are invited by admins
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

The `supabase/schema.sql` file is intended **only for new Supabase projects**.
For existing projects, apply only the numbered files in `supabase/migrations/` using the Supabase SQL Editor. Do not run `schema.sql` on a live project — it will silently skip existing tables but will still re-run functions, triggers, and grants.

---

## Database migration guide

### New project setup
1. Open Supabase SQL Editor → paste `supabase/schema.sql` → Run.
2. Then apply **all** migration files in order (see below). They are idempotent.
3. Record each applied migration in `public._migrations` (the preflight script creates this table).

### Existing project upgrade
Apply **only the migrations you have not yet applied**, in filename order:

```
20261006_add_notify_admins.sql
20261007_player_only_public_signup.sql
20261009_expire_old_bookings.sql
20261009_instant_booking_rejection.sql
20261011_booking_safety.sql          ← adds audit log, idempotency, soft-archive
20261011_turf_archiving_a.sql        ← adds owner/admin-authorized turf archiving
```

Before applying any migration:
1. Run `preflight_validation.sql` (read-only) and review all outputs.
2. Verify no slot conflicts, orphaned FKs, or invalid status values exist.
3. Create a manual backup (Supabase Dashboard → Settings → Database → Backups).

After applying each migration, record it:
```sql
insert into public._migrations (filename, notes)
values ('20261011_turf_archiving_a.sql', 'Applied manually')
on conflict (filename) do nothing;
```

To archive the verified T Turf record in the configured project, first apply
`20261011_turf_archiving_a.sql`, then run
`supabase/scripts/archive_t_turf.sql` in **Supabase Dashboard → SQL Editor**.
The script checks the turf and owner UUIDs and changes only that turf's
`archived_at`; its confirmed booking and related history are retained.

### Migration naming convention
All migration files use the format `YYYYMMDD_short_description.sql`. When two migrations share the same date prefix, append `_a`, `_b` etc. to guarantee deterministic sort order. **Never rename a migration that has already been applied to any environment.**

### Rollback
Each migration has a matching rollback script in the artifacts directory. Read the safety checks at the top of each rollback file before executing. Prefer forward-fix migrations over rollback when audit data already exists.

### What is never stored in Git
- Database dumps (`pg_dump` output)
- Production connection strings or service-role keys
- `.env.local` files
- Any file containing real user PII

Add these patterns to `.gitignore` if not already present:
```
*.dump
*.sql.gz
.env.local
.env.production
```

For anything admin-only that needs to read *all* rows regardless of owner
(e.g. the Users table, All Turfs table), use `createAdminClient()` from
`lib/supabase/admin.js` inside `app/admin/page.js` (a Server Component) —
never import it into a Client Component, since it holds the service role key.
