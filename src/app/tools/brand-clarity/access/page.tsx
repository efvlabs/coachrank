import { AssessmentAccess } from "@/components/AssessmentAccess";
export const metadata = { title: "Restore assessment access", robots: { index: false, follow: false }, referrer: "no-referrer" as const, alternates: { canonical: "/tools/brand-clarity/access" } };
export default function AccessPage() { return <div className="tools-shell"><AssessmentAccess /></div>; }
