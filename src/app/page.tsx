import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/dal";

/** No UI of its own -- just routes to the right front door based on auth state, using the same DAL check every protected page already relies on. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/today" : "/login");
}
