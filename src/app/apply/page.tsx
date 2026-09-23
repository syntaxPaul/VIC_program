import { db } from "@/lib/db";
import { LogoFull } from "@/components/logo";
import { ApplyForm } from "@/components/apply-form";

export const metadata = { title: "Membership form" };

// Read the settings on every request. Prerendered, the page would carry
// whatever the church name and the open/closed switch were at build time, and
// closing the form would need a redeploy.
export const dynamic = "force-dynamic";

/**
 * The public membership form.
 *
 * Outside the signed-in area on purpose: anyone with the link can open it.
 * It writes to MembershipApplication, never to the member register, and it
 * reads nothing back — no member details are exposed here, and the page
 * cannot be used to test whether somebody is already a member.
 */
export default async function ApplyPage() {
  const s = await db.settings.findFirst();
  const churchName = s?.churchName ?? "Victory in Christ";
  const open = s?.publicFormOpen ?? true;

  return (
    <div data-theme="light" className="min-h-screen bg-sand-50 px-5 py-10 text-sand-900">
      <main className="mx-auto max-w-[680px]">
        <header className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <LogoFull width={190} alt={churchName} />
          </div>
          <h1 className="font-serif text-[26px] leading-tight font-semibold">
            Membership form
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-sand-600">
            Fill this in and the church office will add you to the register.
            Only your name and surname are required — the rest helps us care
            for you properly.
          </p>
        </header>

        <div className="rounded-2xl border border-bronze-100 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(47,42,36,0.4)] sm:p-8">
          {open ? (
            <ApplyForm churchName={churchName} />
          ) : (
            <div className="py-10 text-center">
              <h2 className="font-serif text-[20px] font-semibold">The form is closed</h2>
              <p className="mx-auto mt-2 max-w-sm text-[14px] text-sand-600">
                Please speak to the church office{s?.phone ? ` on ${s.phone}` : ""} and
                they will take your details.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[12px] text-sand-500">{churchName}</p>
      </main>
    </div>
  );
}
