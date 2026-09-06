import Link from "next/link";
import { CustomerSignIn } from "@/components/CustomerSignIn";
import { customerReturnPath } from "@/lib/customer-links";

export const metadata = { title: "Sign in to CoachRank", robots: { index: false, follow: false }, referrer: "no-referrer" as const, alternates: { canonical: "/sign-in" } };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = customerReturnPath((await searchParams).next);
  return <div className="account-shell account-sign-in"><section className="account-introduction"><Link className="tool-back" href="/tools">← CoachRank Tools</Link><p className="journal-label">A little clarity. Always within reach.</p><h1>Your next chapter,<br /><em>saved for you.</em></h1><p>One place for the tools you own, the reports you keep and the progress you make.</p><div className="account-orbit" aria-hidden="true"><div className="account-orbit-ring"/><div className="account-orbit-ring"/><span>Yours to<br/>return to<span className="account-orbit-dot">.</span></span><i>01 / Reflect</i><i>02 / Act</i><i>03 / Return</i></div><ul className="account-benefits"><li><span>↗</span>Your tools on any device</li><li><span>◷</span>Saved progress and report history</li><li><span>∞</span>Lifetime access to the assessment you buy</li></ul></section><CustomerSignIn next={next}/></div>;
}
