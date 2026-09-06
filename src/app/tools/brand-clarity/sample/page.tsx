import Link from "next/link";
import { BrandReport } from "@/components/BrandReport";
import { SAMPLE_ANSWERS } from "@/lib/brand-assessment";

export const metadata = { title: "Sample Brand Clarity Report", description: "Preview an illustrative Brand Clarity Assessment report before buying.", robots: { index: false, follow: true }, alternates: { canonical: "/tools/brand-clarity/sample" } };

export default function SampleReportPage() {
  return <div className="tools-shell"><div className="tool-sample-banner no-print"><p><strong>A sample, not a real customer.</strong> Explore the format before you buy.</p><Link href="/tools/brand-clarity" className="tool-text-link">Get your own report · $9 ↗</Link></div><BrandReport answers={SAMPLE_ANSWERS} sample /></div>;
}
