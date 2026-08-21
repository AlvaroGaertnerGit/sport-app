import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-10 px-5 py-16">
      <div className="flex flex-col gap-1">
        <p className={EYEBROW_CLASSNAME}>Sport Coach</p>
        <h1 className={`${DISPLAY_HEADING_CLASSNAME} text-5xl`}>
          Crear
          <br />
          cuenta
        </h1>
      </div>
      <RegisterForm />
    </main>
  );
}
