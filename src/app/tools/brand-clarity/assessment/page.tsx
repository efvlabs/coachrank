import { BrandAssessment } from "@/components/BrandAssessment";

export const metadata = { title: "Your Brand Clarity Assessment", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" as const, alternates: { canonical: "/tools/brand-clarity/assessment" } };

export default function AssessmentPage() {
  return <div className="tools-shell"><BrandAssessment /></div>;
}
