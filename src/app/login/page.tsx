import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { redirectTo } = await props.searchParams;
  const target = typeof redirectTo === "string" ? redirectTo : "/today";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-10 px-5 py-16">
      <div className="flex flex-col gap-1">
        <p className={EYEBROW_CLASSNAME}>Sport Coach</p>
        <h1 className={`${DISPLAY_HEADING_CLASSNAME} text-5xl`}>
          Iniciar
          <br />
          sesión
        </h1>
      </div>
      <LoginForm redirectTo={target} />
    </main>
  );
}
