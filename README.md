# Strong vAida

A two-sided training app (Strong-style logging + a trainer relationship). A
**client** logs workouts; their **trainer** programs those workouts and reviews
them afterward, including async technique-video feedback. Built with Expo (React
Native + TypeScript) and Supabase. Runs on your iPhone via **Expo Go** — no Apple
Developer account needed.

> **Status: Phase 1 complete** — scaffold, Supabase wiring, email/password auth
> with role selection, full SQL schema + RLS, trainer↔client linking (invite code
> or email), and ~35 seeded exercises. Phases 2–4 (programming/logging, video +
> feedback, progress/polish) come next.

---

## What you need to provide

1. **Node.js 18+** and **npm** on your computer.
2. The **Expo Go** app on your iPhone (App Store).
3. A free **Supabase** project (supabase.com).

That's it. No paid services, no Apple Developer account.

---

## 1. Set up Supabase

### a. Create the project
Create a new project at [supabase.com](https://supabase.com). Wait for it to
finish provisioning.

### b. Run the SQL migrations
Open **SQL Editor** in the Supabase dashboard and run these files **in order**
(copy/paste the contents of each, run, then the next):

1. `supabase/migrations/0001_init.sql` — tables, RLS policies, helper functions,
   the new-user trigger, and the linking RPCs.
2. `supabase/migrations/0002_seed_exercises.sql` — ~35 common exercises.
3. `supabase/migrations/0003_storage.sql` — the `technique-videos` storage bucket
   and its policies. (Videos are used in Phase 3, but setting it up now means you
   only configure Supabase once.)

Each file is safe to re-run.

### c. Turn off email confirmation (for testing)
By default Supabase requires users to confirm their email before they get a
session, which is awkward for solo testing. Go to **Authentication → Sign In /
Providers → Email** (or **Authentication → Settings**) and **disable "Confirm
email"**. Now signing up logs you straight in.

> Leaving confirmation on still works — the profile is created by a DB trigger
> regardless — you'd just have to confirm via the email link before signing in.

### d. Grab your API credentials
In **Project Settings → API**, copy:
- **Project URL** (e.g. `https://abcd1234.supabase.co`)
- **anon public** key

---

## 2. Configure the app

From the project root:

```bash
cp .env.example .env
```

Edit `.env` and paste in your values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is meant to be shipped in client apps — **Row Level Security is what
protects your data**, not the secrecy of this key. `.env` is gitignored regardless.

---

## 3. Install and run

```bash
npm install
npx expo start
```

A QR code appears in the terminal. On your iPhone:
1. Open the **Camera** app and point it at the QR code (or open Expo Go → "Scan QR code").
2. Tap the banner to open the project in **Expo Go**.

Your phone and computer must be on the **same Wi-Fi**. If that's blocked (some
networks isolate clients), run `npx expo start --tunnel` instead.

---

## 4. Test Phase 1

1. **Sign up as a trainer** — choose "I'm a trainer", create the account. You land
   on the trainer **Dashboard**.
2. Tap **Generate invite code** — note the 6-character code.
3. **Sign out**, then **sign up as a client** (use a different email) — choose
   "I'm a client". You land on the client **Home** with a "Connect with your
   trainer" card.
4. Tap **Enter invite code**, type the code from step 2, tap **Connect**. You're
   now linked — Home shows your trainer's name.
5. **Sign out**, sign back in as the trainer — the client now appears under **Your
   clients** as Active.

You can also test **Add by email** on the trainer dashboard: enter the client's
email to link them directly (the client must already have a client account).

---

## Project structure

```
app/                      # Expo Router screens (file-based routing)
  _layout.tsx             #   providers + auth gate (redirects by session)
  index.tsx               #   routes to trainer/client home by role
  (auth)/                 #   sign-in, sign-up (with role selection)
  (app)/                  #   trainer dashboard, client home, link-trainer
src/
  api/coach.ts            # React Query hooks for linking + roster
  components/ui.tsx       # shared UI primitives (Button, TextField, Card, …)
  lib/supabase.ts         # typed Supabase client (AsyncStorage session)
  lib/auth.tsx            # AuthProvider: session + profile + sign in/up/out
  lib/queryClient.ts      # TanStack Query client
  theme/theme.ts          # colors, spacing, typography tokens
  types/database.ts       # TS types mirroring the SQL schema
supabase/migrations/      # SQL you run in the Supabase SQL Editor
```

## Tech choices (brief)

- **Expo Router** — file-based navigation, Expo Go compatible.
- **Supabase JS client** with **AsyncStorage** for session persistence.
- **TanStack Query** for server-state caching over the Supabase client.
- **Charts (Phase 4): `react-native-gifted-charts`** — pure JS/RN on top of
  `react-native-svg` (Expo-supported), so no custom native build is needed,
  unlike `victory-native`'s newer Skia backend.
- **RLS everywhere.** Relationship checks live in `SECURITY DEFINER` helper
  functions (`is_my_client`, `can_access_workout`, …) so policies stay readable
  and avoid recursion. See comments in `0001_init.sql`.

## Notes on security

- Clients can only read/write their own rows; trainers can additionally access
  data for clients **actively** linked to them. This is enforced at the database
  level, so it holds no matter what the client app does.
- The "surface the latest coach cue next time" query lives in
  `latest_cue_for_exercise()` (runs as the caller, respecting RLS).
- One trainer per client is enforced when redeeming an invite code.
