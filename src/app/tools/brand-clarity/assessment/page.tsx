import { BrandAssessment } from "@/components/BrandAssessment";

export const metadata = { title: "Your Brand Clarity Assessment", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" as const, alternates: { canonical: "/tools/brand-clarity/assessment" } };

export default async function AssessmentPage({ searchParams }: PageProps<"/tools/brand-clarity/assessment">) {
  const preview = (await searchParams).preview === "true";
  return <div className="tools-shell"><BrandAssessment key={preview ? "preview" : "purchase"} preview={preview} /></div>;
}
