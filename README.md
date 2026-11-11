# GYM PRO – Phase 1 (core)

Next.js 14 + Tailwind + Supabase (Postgres, Auth, RLS) + Recharts.

## Setup
1. Create a Supabase project.
2. SQL editor → run `supabase/schema.sql`.
3. Auth → Users → add your trainer account (email + password), then run:
   `insert into profiles (id, role, full_name) values ('<AUTH_USER_UUID>', 'trainer', 'Your Name');`
4. `cp .env.example .env.local` and fill in the URL, anon key and service-role key.
5. `npm install && npm run dev`, open http://localhost:3000 and sign in.
6. Trainer → Clients → Add client creates the member's own login. Share the email and temporary password.

Deploy to Vercel with the same four env vars. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

## Included in Phase 1
- Email/password auth, trainer and client roles, middleware route protection
- RLS on every table; client medical notes in a trainer-only table
- Trainer dashboard with real stats, attendance chart and weekly volume chart
- Clients: add (creates login), search/filter, edit, deactivate, delete (with confirm)
- Attendance: daily marking, no duplicates (unique client+date), audit history, colour calendar, % excluding approved leave, streak
- Leave: client request, trainer approve/reject, manual leave, auto-sync to attendance, in-app notifications
- Weekly workout planner: per-day plans, add/edit/remove exercises, copy previous week
- Client workout logging: sets of weight × reps; volume = Σ(weight × reps), max weight shown separately; day/week/month totals; completion %

## Not yet built (next phases)
Progress measurements and photos, personal records and badges, memberships and payments, announcements, CSV/PDF reports, reusable templates, profile photo upload, monthly and progress charts, global search.

## Not tested
This was written without being able to install or run it. Expect to fix small type or runtime issues on first `npm run build`.
