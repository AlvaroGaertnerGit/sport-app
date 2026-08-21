# src/lib — architecture so far

```
src/lib/
  supabase/
    client.ts   Browser Supabase client (Client Components only)
    server.ts   Server Supabase client (Server Components/Actions/Route Handlers)
    proxy.ts    updateSession() — session refresh + optimistic redirect, used by src/proxy.ts
  auth/
    dal.ts      getCurrentUser() / getCurrentProfile() / requireUser()
  domain/
    plans.ts     getActivePlan(), getNextPlanItem(), pickNextPlanItem()
    sessions.ts  getInProgressSession()
    routines.ts  getRoutineExerciseCount()
    today.ts     getTodayRecommendation() — composes the above for /today
    types.ts     ActivePlan, InProgressSession, NextPlanItem, TodayRecommendation
```

## Layering (current and intended)

```
UI (Server/Client Components)
  -> src/lib/auth/dal.ts        "who is the current user?"
  -> src/lib/domain/*.ts        Sport Coach domain reads/writes
       -> src/lib/supabase/server.ts (or client.ts from a Client Component)
            -> Supabase (RLS-enforced)
```

Components should never call `supabase.from(...)` directly for anything
beyond the most trivial, obviously-owner-scoped read. Domain functions
(`getActivePlan()`, `getNextPlanItem()`, `getTodayRecommendation()`,
`createWorkoutSession()`, `completeWorkoutSession()`, `logSet()`,
`createActivity()`, ...) belong in `src/lib/domain/` — write-side
functions are not built yet, only the reads Today needs. Each domain
function calls `requireUser()`/receives `userId` from a caller that
already did, rather than re-deriving auth state itself, and uses the
server Supabase client — RLS still does the actual authorization; the
domain layer's job is centralizing *how* data is fetched/shaped, not
re-checking ownership by hand.

`src/lib/supabase/*` has zero Sport Coach-specific logic — it only knows
how to construct a client and refresh a session. `src/lib/auth/dal.ts`
knows about `profiles`; it does not know about routines, plans, or
sessions.

## Why `code` is never used for authorization

`profiles.code` (and every other entity's `code`) is a public, non-secret
label — safe to put in a URL or show to the Coach IA, exactly like a
username. It is never treated as a capability token and never appears in
any `WHERE` clause that decides access. Authorization is always
`user_id = auth.uid()` (RLS) plus, where needed, `requireUser()` in this
layer — never "does the caller know this code."
