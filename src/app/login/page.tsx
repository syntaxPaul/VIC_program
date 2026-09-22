import { redirect } from "next/navigation";
import { authenticate, createSession, getSession } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";
import { LogoFull } from "@/components/logo";

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
    /*
     * Four people sign in here, so there is nothing to sell and no reason for
     * a marketing panel. What the page can do is look like it belongs to this
     * church: the card is shaped like a chapel window, and it stays light in
     * both themes so the logo is always shown in its own colours rather than
     * knocked out to fit a dark panel.
     */
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(70rem 40rem at 50% -10%, rgba(199,168,109,0.22) 0%, transparent 60%)," +
            "radial-gradient(50rem 30rem at 50% 115%, rgba(122,92,46,0.10) 0%, transparent 65%)",
        }}
      />

      <main className="relative w-full max-w-[400px]">
        {/* `data-theme="light"` keeps the window and the form inside it light
            even when the rest of the page is in dark mode. */}
        <div
          data-theme="light"
          className="relative rounded-t-[999px] rounded-b-2xl border border-bronze-100 bg-white px-9 pt-16 pb-9 shadow-[0_24px_70px_-30px_rgba(47,42,36,0.45)]"
        >
          {/* the window's inner glazing bar */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-2.5 rounded-t-[999px] rounded-b-xl border border-bronze-300/35"
          />

          <div className="relative flex flex-col items-center">
            <LogoFull width={176} />

            <div className="mt-7 h-px w-10 bg-bronze-300" />

            <h1 className="mt-6 font-serif text-[21px] leading-none font-semibold text-sand-900">
              Sign in
            </h1>
            <p className="mt-2 text-center text-[13px] text-sand-500">
              Use the account your administrator set up for you.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="relative mt-6 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5 text-center text-[13px] text-danger"
            >
              That email and password combination didn&rsquo;t work.
            </p>
          ) : null}

          <form action={signIn} className="relative mt-7 space-y-4">
            <Field label="Email">
              <Input
                name="email"
                type="email"
                required
                autoFocus
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
        </div>

        <p className="relative mt-8 text-center font-serif text-[13.5px] leading-relaxed text-sand-500 italic">
          &ldquo;Moreover it is required in stewards, that a man be found
          faithful.&rdquo;
          <span className="mt-1 block text-[11.5px] tracking-[0.14em] text-sand-500/80 not-italic uppercase">
            1 Corinthians 4:2
          </span>
        </p>

        <div className="relative mt-8 rounded-xl border border-dashed bg-[var(--card)]/70 p-3.5 text-center text-[12.5px] text-[var(--text-muted)]">
          <p className="mb-1.5 font-medium text-[var(--text)]">Demo accounts</p>
          <p>admin@vic.org · treasurer@vic.org · secretary@vic.org · pastor@vic.org</p>
          <p className="mt-1">
            Password for all:{" "}
            <span className="font-medium text-[var(--text)]">vic2026</span>
          </p>
        </div>
      </main>
    </div>
  );
}
