import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { redirectTo } = await props.searchParams;
  const target = typeof redirectTo === "string" ? redirectTo : "/today";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <LoginForm redirectTo={target} />
    </main>
  );
}
