import { BrandAssessment } from "@/components/BrandAssessment";
import { assessmentSession } from "@/lib/assessment-request";

export const metadata = { title: "Your Brand Clarity Assessment", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" as const, alternates: { canonical: "/tools/brand-clarity/assessment" } };

export default async function AssessmentPage({ searchParams }: PageProps<"/tools/brand-clarity/assessment">) {
  const preview = (await searchParams).preview === "true";
  const requestedOrder = (await searchParams).order;
  const orderId = typeof requestedOrder === "string" ? requestedOrder : preview ? undefined : (await assessmentSession())?.order.id;
  return <div className="tools-shell"><BrandAssessment key={preview ? "preview" : orderId ?? "purchase"} preview={preview} orderId={orderId} /></div>;
}
