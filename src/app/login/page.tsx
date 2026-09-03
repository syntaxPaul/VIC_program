import { redirect } from "next/navigation";
import { authenticate, createSession, getSession } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");
  const { error } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const user = await authenticate(email, password);
    if (!user) redirect("/login?error=1");
    await createSession(user);
    redirect("/");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sand-900 p-12 text-sand-100 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #C7A86D 0, transparent 45%), radial-gradient(circle at 80% 70%, #C7A86D 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bronze-500 text-lg font-bold text-white">
            ✝
          </div>
          <span className="text-[15px] font-semibold">Victory in Christ</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-serif text-[42px] leading-[1.1] font-semibold text-white">
            Steward the house well.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-sand-300">
            Members, offerings, funds, assets and the church calendar — kept in
            one place, with the records your council and accounting officer
            expect.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-[12.5px]">
            {["Fund accounting", "Asset register", "Baptism certificates", "A4 reports"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border border-sand-700 px-3 py-1 text-sand-300"
                >
                  {t}
                </span>
              ),
            )}
          </div>
        </div>

        <p className="relative text-[12px] text-sand-500">
          &ldquo;Moreover it is required in stewards, that a man be found faithful.&rdquo;
          &nbsp;· 1 Corinthians 4:2
        </p>
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-bronze-600 text-lg font-bold text-white">
              ✝
            </div>
            <p className="text-[15px] font-semibold">Victory in Christ</p>
          </div>

          <h2 className="text-[22px] font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 mb-6 text-[13.5px] text-[var(--text-muted)]">
            Use the account your administrator set up for you.
          </p>

          {error ? (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
              That email and password combination didn&rsquo;t work.
            </div>
          ) : null}

          <form action={signIn} className="space-y-4">
            <Field label="Email">
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@church.org"
              />
            </Field>
            <Field label="Password">
              <Input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" variant="primary" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-lg border bg-[var(--card)] p-3 text-[12.5px] text-[var(--text-muted)]">
            <p className="mb-1.5 font-medium text-[var(--text)]">Demo accounts</p>
            <p className="tnum">admin@vic.org · treasurer@vic.org · secretary@vic.org · pastor@vic.org</p>
            <p className="mt-1">Password for all: <span className="font-medium text-[var(--text)]">vic2026</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
