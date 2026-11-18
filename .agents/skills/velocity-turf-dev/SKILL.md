---
name: velocity-turf-dev
description: Specialized development skill for the Velocity Turf Next.js, React and Supabase application. Use when debugging, fixing bugs, modifying Player, Owner or Admin dashboards, working with bookings, group bookings, bill splitting, pricing, payments, rewards, staff, maintenance, authentication, database migrations, testing or deployment.
---

# Velocity Turf Development Skill

Specialized development skill and operating instructions for the Velocity Turf platform.

## 1. Project Understanding
- Work strictly with the existing Velocity Turf architecture.
- Inspect `package.json`, relevant routes, components, libraries, and Supabase structure only when needed.
- Never assume a file, function, table, or column exists; verify before referencing or importing.
- Reuse existing utilities, design tokens, error handlers, and architectural patterns.

## 2. Token Efficiency — Highest Priority
- Use minimal tokens and provide concise, to-the-point reports.
- Never scan the entire project for a localized bug or task.
- Search only relevant files and directly related dependencies.
- Avoid repeatedly reading files already inspected in the current task.
- Avoid unnecessary explanations, duplicate analysis, and large conversational outputs.
- Do not rewrite entire components or files when a small targeted change is sufficient.
- Run targeted tests first; run the full test suite (`npm test`) and production build (`npm run build`) only when appropriate or requested.
- Do not generate lengthy prose reports unless explicitly asked by the user.

## 3. Bug Fixing Protocol
- Identify the actual root cause before making any edits.
- Trace the affected frontend, API, service, and database layers when necessary.
- Fix the underlying issue directly—never just hide error messages or suppress warnings.
- Check for similar bugs or undefined variables in directly related code paths.
- Preserve existing working functionality at all times.

## 4. Supabase Safety & Database Rules
- Inspect existing schema and migration files before proposing or drafting SQL.
- Never invent table names, columns, foreign keys, or enum types.
- Never create duplicate migrations for existing changes.
- Never execute destructive SQL (e.g. `DROP`, `TRUNCATE`, cascade deletes) without explicit user permission.
- Never modify RLS (Row Level Security) or authorization rules casually.
- Clearly explain any SQL that must be executed manually in the Supabase SQL editor.
- Never claim a migration or schema update was applied unless explicitly verified.

## 5. Critical Features to Protect
Do not regress, rewrite, or break the following core features:
- Player, Owner, and Admin authentication and role-based routing.
- Turf creation, approval workflow, archiving, and management.
- Slot availability calculation and booking conflict prevention (double-booking protection).
- Group booking, team invites, and bill splitting.
- Payments, refunds, payouts, wallets, and reward points.
- Dynamic pricing, peak-hour bands, weekend rates, and custom slot overrides.
- Walk-in booking creation and payment recording.
- Staff invitations, permissions, and maintenance task schedules.
- Community games, matches, and match participants.
- Push/in-app notifications and Supabase Realtime subscriptions.

## 6. Error Handling & Runtime Stability
- Prevent React runtime crashes (e.g. Minified React Error #31, missing variables, unhandled nulls).
- Safely handle undefined variables, null states, empty arrays, and unexpected API responses.
- Never render raw JavaScript objects directly inside JSX children.
- Prevent infinite rendering loops and unnecessary repeated API requests.
- Always clean up realtime subscriptions, event listeners, and timers in `useEffect`.
- Isolate optional dashboard features (e.g. rewards, weather, analytics widgets) using Error Boundaries so failures do not crash the core dashboard.

## 7. Development & Implementation Rules
- Make minimal, focused, surgical changes.
- Preserve existing UI styles, branding, and mobile responsiveness unless redesign is requested.
- Do not introduce unnecessary third-party dependencies or packages.
- Never replace working business logic or database queries with mock/fake data.
- Do not alter environment variables, API keys, or credentials.
- Never expose Supabase service-role keys in client-side code.

## 8. Verification & Testing
- Run relevant targeted unit/integration tests before finalizing.
- Run `npm run build` when changes affect compilation, static page generation, or imports.
- Report actual command outputs and test counts—never assumed results.
- Identify any remaining errors and specify if manual SQL or migration is required.
- Never claim production readiness or deployment success without actual verification.

## 9. Response Format
After completing each task, report strictly:
1. **Root cause:** (1-2 sentences on what failed and why)
2. **Files changed:** (clickable links to modified files)
3. **Fix implemented:** (brief summary of exact change)
4. **Tests/build results:** (actual test count, pass/fail status, build exit code)
5. **SQL or deployment action required:** (state "None" or list explicit manual steps)

Keep reports short and actionable.

---

### Final Rule
Prioritize correctness, stability, minimal code changes, and low token usage over unnecessary refactoring.
