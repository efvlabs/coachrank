import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { recentAssessmentOrders, reportCount } from "@/lib/domain/assessments";
import { isAssessmentCheckoutConfigured } from "@/lib/dodo";
import { formatCents } from "@/lib/money";
import { AssessmentPreviewButton } from "@/components/admin/AssessmentPreviewButton";

export default async function AdminToolsPage() {
  if (!await getAdminUser()) return null;
  const orders = await recentAssessmentOrders();
  const paid = orders.filter(order => !order.preview && order.status === "paid");
  const ready = isAssessmentCheckoutConfigured();
  const metrics = [
    { label: "Assessment sales", value: paid.length, detail: "Paid orders in the latest 100" },
    { label: "Product revenue", value: formatCents(paid.reduce((sum,order) => sum+order.priceCents,0)), detail: "Before tax and processing fees" },
    { label: "Completed reports", value: paid.reduce((total,order) => total + reportCount(order),0), detail: "Saved reports across these paid orders" },
    { label: "Buyer feedback", value: paid.filter(order => order.feedback).length, detail: "Preview runs are excluded" },
  ];
  return <div>
    <div className="admin-page-heading"><div><p className="journal-label">Tools &amp; feedback</p><h1>Turn insight into action.</h1><p>Brand Clarity Assessment · $9 USD · lifetime access and unlimited retakes.</p></div><AssessmentPreviewButton /></div>
    <div className="admin-metrics">{metrics.map(item => <div className="admin-metric" key={item.label}><p>{item.label}</p><strong>{item.value}</strong><span>{item.detail}</span></div>)}</div>
    <div className="admin-board-summary"><span className={`admin-status-dot ${ready ? "is-ready" : ""}`} /><p>{ready ? "Live checkout is configured" : "Checkout needs its Dodo product and payment configuration"}</p><Link href="/tools/brand-clarity" className="tool-text-link">Product page ↗</Link><Link href="/tools/brand-clarity/sample" className="tool-text-link">Sample report ↗</Link></div>
    <section className="admin-recent"><div className="admin-section-heading"><h2>Orders &amp; the people behind them</h2><span className="text-sm text-ink-3">Latest 100 orders · previews labeled</span></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Order","Created","Status","Reports","Feedback"].map(label => <th key={label} className="border-b border-line px-5 py-4 font-medium text-ink-3">{label}</th>)}</tr></thead><tbody>{orders.map(order => <tr key={order.id}><td className="border-b border-line p-5 font-mono">{order.id.slice(0,12)}{order.preview ? <span className="mt-1 block font-sans text-xs text-ink-3">Admin preview</span> : null}</td><td className="border-b border-line p-5 whitespace-nowrap">{new Date(order.createdAtMs).toLocaleDateString("en-US", { month:"short",day:"numeric",year:"numeric",timeZone:"UTC" })}</td><td className="border-b border-line p-5"><span className={`admin-badge ${order.status === "paid" ? "is-published" : ""}`}>{order.status}</span></td><td className="border-b border-line p-5 whitespace-nowrap">{reportCount(order)}</td><td className="max-w-sm border-b border-line p-5">{order.feedback ? <><strong>{order.feedback.helpful}/5</strong><p className="mt-1 whitespace-pre-wrap">{order.feedback.comment}</p></> : <span className="text-ink-3">Awaiting feedback</span>}</td></tr>)}</tbody></table></div>{!orders.length ? <div className="admin-empty"><h3>Your first customer starts here.</h3><p className="mt-2">Use the preview to experience all 24 questions, your personalized report and the PDF download. No charge is made.</p></div> : null}</section>
  </div>;
}
