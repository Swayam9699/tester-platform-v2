import { ArrowRight, CalendarCheck, Handshake, ShieldCheck, Smartphone, Upload, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoMark, Sparkle } from "@/components/ui";
import { APP_NAME, LEVELS, RULES } from "@/lib/config";
import { getSessionUser } from "@/server/auth";

export default async function Landing() {
  if (await getSessionUser()) redirect("/dashboard");

  const steps = [
    { icon: Users, title: "Join the group", body: "Join our one shared Google Group and add it to your closed testing track." },
    { icon: Upload, title: "List your app", body: "Paste your Play testing link. We read the package and show it to compatible testers." },
    { icon: Handshake, title: "Handshake", body: "Request to test someone's app and offer yours. Once they accept, you both opt in." },
    { icon: CalendarCheck, title: "Check in daily", body: `Open the app every day for ${RULES.durationDays} days. Complete it and level up.` },
  ];
  const faqs = [
    {
      q: "Why 16 testers and 16 days?",
      a: "Google requires 12 testers opted in for 14 continuous days before you can apply for production. 16 × 16 gives you 4 spare testers and 2 spare days.",
    },
    { q: "Is it free?", a: "Yes. You pay with your time: for every tester you get, you test one app back." },
    {
      q: "What if my partner stops testing?",
      a: "If they miss 3 days in a row, they're blocked and lose reliability. You keep your completion credit and your app is boosted to find a replacement.",
    },
    { q: "Which apps will I see?", a: "Only apps whose minimum Android version your phone can run, from developers who aren't blocked." },
  ];

  return (
    <div className="min-h-dvh p-3 sm:p-6">
      <div className="glass-shell mx-auto max-w-[1240px] overflow-hidden rounded-[28px]">
        <header className="flex items-center justify-between px-5 py-5 sm:px-10">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="text-[17px] font-semibold tracking-tight">{APP_NAME.toUpperCase()}</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#rules" className="hover:text-ink">Rules</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <Link href="/login" className="btn btn-dark btn-sm">
            Sign in
          </Link>
        </header>

        <section className="flex flex-col items-center px-5 pb-20 pt-12 text-center sm:px-10">
          <Sparkle size={140} className="sparkle-float" />
          <span className="mt-6 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-2 shadow-sm">Free handshake testing for Google Play</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            12 testers. 14 days.
            <br />
            <span className="bg-gradient-to-r from-[#ef7b5b] via-[#e08aa0] to-[#a78bdb] bg-clip-text text-transparent">You test theirs, they test yours.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] text-muted">
            Swap closed testing one-to-one with other Android developers until you meet Google Play&apos;s production requirement, with daily check-ins that keep everyone honest.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn btn-dark h-12 px-6 text-[15px]">
              Get started free <ArrowRight size={16} />
            </Link>
            <a href="#how" className="btn btn-soft h-12 px-6 text-[15px]">
              How it works
            </a>
          </div>
          <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [`${RULES.testerSlots}`, "tester slots per app"],
              [`${RULES.durationDays} days`, "per campaign"],
              ["1 : 1", "fair handshakes"],
              ["48 h", "to accept & opt in"],
            ].map(([v, l]) => (
              <div key={l} className="card p-4">
                <p className="text-2xl font-semibold tracking-tight">{v}</p>
                <p className="text-xs text-muted">{l}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-t border-black/5 bg-white/50 px-5 py-16 sm:px-10">
          <h2 className="text-center text-3xl font-semibold tracking-tight">How it works</h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fde8de] text-coral">
                    <s.icon size={18} />
                  </span>
                  <span className="text-xs font-medium text-faint">0{i + 1}</span>
                </div>
                <p className="mt-5 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="rules" className="px-5 py-16 sm:px-10">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Fair by design</h2>
              <ul className="mt-6 space-y-4 text-sm text-ink-2">
                <li className="flex gap-3">
                  <Smartphone className="mt-0.5 shrink-0 text-coral" size={18} />
                  You only see apps your phone can actually run, based on your Android version.
                </li>
                <li className="flex gap-3">
                  <CalendarCheck className="mt-0.5 shrink-0 text-coral" size={18} />
                  Both sides check in every day. Miss 2 and you get a warning. Miss 3 and the handshake breaks.
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-coral" size={18} />
                  Skippers are blocked from new handshakes (7 days, longer for repeat offenders). The partner who did their part keeps full credit.
                </li>
              </ul>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-left text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Level</th>
                    <th className="px-5 py-3 font-medium">Active handshakes</th>
                    <th className="px-5 py-3 font-medium">Completions needed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {LEVELS.map((l) => (
                    <tr key={l.level}>
                      <td className="px-5 py-3 font-medium">{l.level}</td>
                      <td className="px-5 py-3">{l.activeSlots}</td>
                      <td className="px-5 py-3">{l.completionsRequired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-black/5 bg-white/50 px-5 py-16 sm:px-10">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Questions</h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-medium">
                  <span className="flex items-center justify-between">
                    {f.q}
                    <span className="text-muted transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-5 py-16 text-center sm:px-10">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to ship to production?</h2>
          <Link href="/login" className="btn btn-dark mt-6 h-12 px-6 text-[15px]">
            Sign in with Google <ArrowRight size={16} />
          </Link>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 px-5 py-6 text-xs text-muted sm:px-10">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <span>Not affiliated with Google. Google Play is a trademark of Google LLC.</span>
        </footer>
      </div>
    </div>
  );
}
