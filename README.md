# World Cup 2026 Sweepstake — Session 1

Name + password accounts, a holding screen while people join, then a one-time
random equal draw of all 48 teams. This session gets you a **runnable app** with
sign-up, login, the holding screen, and the tab shell. Your Teams / Other Teams /
Admin (results, bracket, route-to-final) come in Session 2.

## Stack
Vite + React · Supabase (Postgres + RLS + RPC). No Supabase Auth — accounts are
name+password, hashed with bcrypt inside the database.

## Setup — do this in order

### 1. Create a new Supabase project
Dashboard → New project. Wait for it to finish provisioning.

### 2. Run the SQL (SQL Editor → New query)
1. Paste all of **`supabase_schema.sql`** and run it.
2. Paste all of **`supabase_seed.sql`** and run it. (48 teams, 72 group
   fixtures, full knockout skeleton.)

### 3. Wire up credentials
- Project Settings → API. Copy the **Project URL** and the **anon / public** key.
- Copy `.env.example` to `.env` and paste both values in.
  (Or edit the fallbacks directly in `src/lib/supabase.js`.)

### 4. Run it
```bash
npm install
npm run dev
```
Open the local URL Vite prints.

### 5. Make yourself admin
Sign up in the app with your name (e.g. "Joe"). The first sign-up becomes admin
automatically — but to be safe, run **`make_me_admin.sql`** in the SQL Editor
(edit the name first).

## How it behaves right now
- **Sign-ups open** → anyone can register; everyone lands on the holding screen.
- Holding screen shows a live-ish player count (polls every 8s).
- **Draw not yet run** → everyone (including you) sees the holding screen.
- Once the draw runs (Session 2 admin button, or call the `run_allocation`
  RPC manually), `allocation_locked` flips on and the main tabs appear.

## The allocation rule (already built into the DB)
`run_allocation` shuffles players and teams, then deals teams round-robin:
everyone gets `floor(48 / players)`, and the first `48 mod players` get one
extra. So with 16 players everyone gets 3; with 14 players, 6 people get 4 and
8 people get 3. Every team is allocated; sizes differ by at most one.

## Results → bracket (the design decision)
There's no free reliable live World Cup results feed, so **you (admin) enter
results**. The R16→Final bracket then auto-advances winners. The Round of 32
pairings depend on which third-placed teams qualify, so you'll set those 16
pairings once the group stage ends (from the official bracket) — wired up in
Session 2.

## Files
```
supabase_schema.sql   tables, RLS, RPC functions
supabase_seed.sql     48 teams + fixtures + knockout skeleton
make_me_admin.sql     promote your account to admin
src/lib/supabase.js   client + API wrappers
src/lib/logic.js       standings + bracket resolution (used in Session 2)
src/App.jsx           routing: auth → holding → tabs
src/components/Auth.jsx
src/components/Holding.jsx
```

## Next (Session 2)
Admin panel (open/close sign-ups, run the draw, enter results, set R32 pairings),
then Your Teams (allocated teams, fixtures, live standings, your highlighted
knockout route with others greyed), then Other Teams (filter by player, trace
their route), then the fixture/group/match detail modal (BST kickoff, UK channel).
```
