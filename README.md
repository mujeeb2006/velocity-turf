# Velocity Turf ⚡⚽

> Next-generation, real-time sports venue booking, community matchmaking, and turf operations management platform.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind / CSS](https://img.shields.io/badge/Design%20Tokens-Exo%202%20%7C%20Space%20Mono-1769E8?style=flat-square)](https://fonts.google.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-10B981?style=flat-square)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#license)

---

## 📖 Overview

**Velocity Turf** is an enterprise-grade turf arena booking and venue management web application tailored for high-energy amateur sports communities (Box Cricket, Football, Badminton, Tennis, Pickleball, and more).

Engineered with Next.js App Router and Supabase PostgreSQL with strict Row-Level Security (RLS), Velocity Turf provides three unified, real-time authenticated portals:
1. **Player Portal** (`/player`): Interactive 3D stadium experience, instant slot booking, group bill splitting, community matchmaking, tournament registration, and QR ticket check-ins.
2. **Turf Owner Portal** (`/owner`): Multi-venue management, walk-in reservations, automated dynamic peak/occupancy pricing, venue staff assignment, maintenance task tracking, and bank payout requests.
3. **Admin Console** (`/admin`): Platform-wide audit overview, venue approvals, dispute & refund resolution, user role management, tournament scoring moderation, and financial analytics.

---

## 🚀 Key Features

### 🏃 Player Experience
- **Interactive Venue Discovery**: Filter arenas by sport, amenities (floodlights, locker rooms, parking, cafeteria), ratings, and live real-time slot availability.
- **Side-Rotate Photo Carousel**: Multi-photo previews for venues with swipe/side navigation arrows and dot indicators.
- **3D Stadium Visualizer**: WebGL Three.js interactive stadium environment on the landing and discovery views.
- **Group Bookings & Bill Splitting**: Create group booking lobbies, split pitch costs equally or custom per player, with live payment tracking and automated slot locks.
- **Matchmaking & Community Games**: Browse and join public matches, fill team slots, and coordinate games with nearby sports enthusiasts.
- **Sports Passes & Memberships**: Purchase discounted multi-session turf pass packages.
- **Tournaments & League Hub**: Register teams, track fixtures, review match schedules, and monitor live round standings.
- **QR Ticket Check-In**: Instant digital attendance pass with high-contrast QR display for contactless gate scanning.
- **Loyalty & Referral Rewards**: Earn loyalty points on every game, unlock free slots, and refer friends with instant reward credits.

### 🏟️ Turf Owner & Venue Manager Portal
- **Dashboard & Slot Analytics**: Today's schedule timeline, live occupancy surge monitoring, and 7d/30d/90d revenue trend charts.
- **Flexible Dynamic Pricing Engine**: Base pricing, peak-hour bands, weekend premiums, holiday overrides, and automatic occupancy surge (>70% booking surge).
- **Fast Walk-in Booking Flow**: Record offline phone or on-site walk-in reservations in seconds with instant slot locks.
- **Real-Time QR Scanner**: In-browser camera QR code reader for instant player check-in and attendance recording.
- **Staff Access Delegation**: Invite venue attendants and managers with granular permission roles (Scanner, Front-desk, Manager).
- **Pitch Maintenance Scheduler**: Log floodlight, turf turfing, and facility repairs with task statuses and audit logs.
- **Financial Payouts & Statements**: Track pending balance, total earnings, bank payout history, and export booking records to Excel/CSV.

### 🛡️ System Admin Console
- **Venue Listing Approvals**: Review new turf submissions, gallery photos, pricing bands, and approve or reject with audit notes.
- **Dispute & Refund Resolution**: Handle customer cancellation claims, investigate match issues, and issue programmatic wallet credits or refunds.
- **User Role Management**: Safely elevate players to Turf Owners or Admins with automated active-booking conflict safeguards.
- **Game & Tournament Moderation**: Approve community-hosted matches and submit authoritative tournament scores.
- **Demo Data Seed Engine**: One-click synthetic demo generator to populate sample bookings, games, and reviews for platform demos.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | Hybrid SSR/CSR, React Server Components, Route Handlers |
| **UI Library** | **React 18** | Pure client components with zero hydration mismatch |
| **Styling** | **Custom Design System** | Scoped CSS with tokens (`Exo 2` body/headings, `Space Mono` numerals) |
| **Database & Auth** | **Supabase (PostgreSQL 15)** | Auth, Database RLS, Realtime Websockets, Storage, RPC functions |
| **3D Graphics** | **Three.js** | Interactive 3D stadium rendered on HTML5 Canvas |
| **Data Export** | **ExcelJS** | Native XLSX report generation for revenue and booking logs |
| **QR Code Engine** | **qrcode.react + html5-qrcode** | High-contrast SVG generation and camera scanner |
| **PWA** | **Progressive Web App** | Service workers, offline page, and multi-portal manifests |
| **Testing** | **Node.js Test Runner (`node:test`)**| 330+ unit tests covering policies, auth, pricing, and concurrency |
| **Monitoring** | **Sentry** | Production runtime error capture and performance telemetry |
| **Hosting** | **Vercel** | Edge deployment with automatic CI/CD from GitHub |

---

## 🏗️ Architecture & Security Model

```
velocity-turf/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login, signup, invite callbacks, password setup
│   ├── admin/                  # System Admin Console (Role Guarded)
│   ├── owner/                  # Turf Owner Dashboard (Role Guarded)
│   ├── player/                 # Player Experience & Discovery App
│   ├── settings/               # Account Settings & Password Updates
│   ├── privacy/                # Public Legal Policy
│   └── api/                    # 40+ RESTful Route Handlers with session auth
├── components/                 # Reusable UI & Dashboard Modules
│   ├── dashboard/              # Shared dashboard kit, modals, QR scanners
│   ├── home/                   # Cinematic landing visuals
│   └── ui/                     # Icons, badges, toast notifications, skeleton loaders
├── lib/                        # Business logic, services & database utilities
│   ├── auth/                   # Role normalization & authorization helpers
│   ├── booking/                # Policy enforcement, concurrency, time-slot math
│   ├── dashboard/              # Analytics, formatting, IST date helpers
│   ├── supabase/               # Browser, Server, and Service-Role Admin clients
│   └── turf/                   # Dynamic pricing engine and occupancy algorithms
├── public/                     # Icons, PWA manifests, and static assets
├── supabase/                   # Database schema, RPC functions, and migrations
│   ├── migrations/             # 25+ versioned SQL migration scripts
│   └── schema.sql              # Master bootstrap schema for new instances
└── test/                       # 35 test suites (330 passing unit tests)
```

### Security & Privacy Architecture
- **Row-Level Security (RLS)**: Enforced directly at the PostgreSQL layer. Turf Owners cannot access bookings from competing venues; Players can only query their own transactions.
- **Server-Side Token Isolation**: Elevated `SUPABASE_SERVICE_ROLE_KEY` is restricted strictly to Server Components and Route Handlers (`lib/supabase/admin.js`) and is never leaked to the client bundle.
- **Decoupled Privacy & Password Management**: Security policy, terms of service, and 256-bit encryption disclosures are isolated in a dedicated modal, while credential management is protected under authenticated account settings.
- **Deterministic Time-Zone Normalization**: Time and date aggregations are pinned to Indian Standard Time (`Asia/Kolkata` / UTC+05:30) to eliminate UTC-drift between client and server.

---

## 📦 Getting Started

### Prerequisites
- **Node.js**: `v18.18.0` or higher (`v20+` recommended)
- **Package Manager**: `npm` (comes with Node)
- **Supabase Account**: Free project on [supabase.com](https://supabase.com)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/velocity-turf.git
cd velocity-turf
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Fill in your project credentials from your **Supabase Dashboard → Project Settings → API**:

```env
# Public Supabase API configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Secret Service Role Key (NEVER expose to client side)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Sentry DSN for error telemetry
NEXT_PUBLIC_SENTRY_DSN=
```

### 3. Setup Supabase Database

1. Open your Supabase project's **SQL Editor**.
2. Run `supabase/schema.sql` to initialize the base tables, foreign keys, and RLS policies.
3. Sequentially apply the migrations from `supabase/migrations/` in chronological order to enable the pricing engine, tournament scoring, and group booking split features.
4. *(Optional)* Turn off "Confirm email" under **Authentication → Providers → Email** for instant development logins.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Automated Tests

The repository includes a comprehensive unit testing suite covering booking safety, concurrency, price calculations, group splitting, and role permissions:

```bash
npm test
```

*Results:* **330 tests passing, 0 failures.**

---

## 🚢 Deployment (Vercel)

1. Push your repository to **GitHub**.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the `velocity-turf` repository.
4. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**. Vercel will build the Next.js application and deploy it with worldwide CDN caching.

---

## 📱 Progressive Web App (PWA)

Velocity Turf is configured as an installable Progressive Web App across desktop and mobile devices:
- Specific standalone manifests for each portal: `manifest-player.webmanifest`, `manifest-owner.webmanifest`, and `manifest-admin.webmanifest`.
- Custom branded app icons with maskable support.
- Service workers with offline fallback screens (`/offline.html`).

---

## 📄 License

Proprietary Software. All rights reserved. Copyright © 2026 Velocity Turf.
