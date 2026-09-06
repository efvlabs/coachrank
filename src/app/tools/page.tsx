import Link from "next/link";
import { ReportPreview } from "@/components/ReportPreview";

export const metadata = { title: "Tools for your next move", description: "Practical tools for ambitious people. Get your next three brand moves, a seven-day clarity plan and a visual report. $9 once with lifetime access.", alternates: { canonical: "/tools" } };

export default function ToolsPage() {
  return <div className="tools-shell">
    <header className="tools-masthead"><p className="journal-label">CoachRank Tools</p><h1>A little clarity.<br /><span>A better next move.</span></h1><p>Useful tools that turn reflection into something you can act on. Start here, then return as your work grows.</p></header>
    <section className="tools-featured-product">
      <div className="tools-product-copy">
        <p className="journal-label">01 / Business &amp; Branding</p><h2>Brand Clarity<br />Assessment<span>.</span></h2>
        <p className="tools-product-dek">Get your next three moves and a seven-day clarity plan, with a visual report of where you are.</p>
        <p className="tools-product-detail">Pay once. Retake as often as you like. Keep your reports and compare them side by side.</p>
        <ul className="tools-benefits" aria-label="What is included">
          <li><span aria-hidden="true">?</span><div><strong>24 guided questions</strong><small>A hint for every answer</small></div></li>
          <li><span aria-hidden="true">↓</span><div><strong>Visual PDF reports</strong><small>Download and keep</small></div></li>
          <li><span aria-hidden="true">↻</span><div><strong>Lifetime access</strong><small>Retake and compare</small></div></li>
        </ul>
        <div className="tools-purchase-row"><p className="tools-purchase-price">$9 <span>USD</span></p><p>One-time purchase<br /><span>No subscription</span></p></div>
        <div className="tools-product-actions"><Link href="/tools/brand-clarity" className="tool-button">Find your next three moves ↗</Link><Link href="/tools/brand-clarity/sample" className="tool-text-link">Explore a full sample report <span aria-hidden="true">↗</span></Link></div>
      </div>
      <ReportPreview compact />
    </section>
    <p className="tools-footnote">Built by CoachRank. No subscription. Your report stays yours to download.</p>
  </div>;
}
