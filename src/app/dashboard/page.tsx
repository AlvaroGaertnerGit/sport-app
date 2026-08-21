import { getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Minimal protected route for this phase -- proves the full chain (Proxy
 * redirect -> requireUser() -> RLS-scoped profile read -> sign out) works
 * end to end. Not the real dashboard; that's a later phase.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Signed in as</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">User ID</dt>
          <dd className="font-mono break-all">{user.id}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Profile code</dt>
          <dd className="font-mono">{profile?.code ?? "— profile not found —"}</dd>
        </div>
      </dl>

      <form action={signOutAction}>
        <button
          type="submit"
          className="min-h-11 rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
