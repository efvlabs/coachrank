"use client";

import Link from "next/link";
import { brandActionPlan, brandReport, type BrandAnswers } from "@/lib/brand-assessment";

function radarPoint(index: number, value: number) {
  const angle = -Math.PI / 2 + index * Math.PI / 3;
  return `${220 + Math.cos(angle) * 123 * value},${183 + Math.sin(angle) * 123 * value}`;
}

export function BrandReport({ answers, previous, sample = false, preview = false, orderId, completedAtMs, previousAtMs, run = 0, compareRun = -1 }: { answers: BrandAnswers; previous?: BrandAnswers; sample?: boolean; preview?: boolean; orderId?: string; completedAtMs?: number; previousAtMs?: number; run?: number; compareRun?: number }) {
  const report = brandReport(answers);
  const baseline = previous ? brandReport(previous) : null;
  const days = brandActionPlan(report);

  return <article className="brand-report" id="brand-report">
    <header className="report-heading">
      <div><p className="journal-label">CoachRank Tools · {sample ? "Illustrative sample" : "Your Brand Clarity Report"}</p><h1>{report.established ? "Keep your clarity sharp." : <>A clearer view.<br />A better next step.</>}</h1><p>{sample ? "These fictional answers show what a report looks like. Your priorities and plan follow your own answers." : "Your answers show where you have evidence today, and where a small, specific change could help."}</p></div>
      <div className="report-edition"><span>BRAND<br />CLARITY</span><p>Edition 01{completedAtMs ? <><br />{new Date(completedAtMs).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</> : null}</p><a className="tool-text-link no-print" href={sample ? "/api/assessment/report?sample=true" : `/api/assessment/report?run=${run}&compare=${compareRun}${preview ? "&preview=true" : orderId ? `&order=${encodeURIComponent(orderId)}` : ""}`}>Download PDF ↓</a></div>
    </header>

    <section className="report-overview" aria-label="Your six brand dimensions">
      <div className="report-radar">
        <p className="journal-label">Your brand at a glance</p>
        <svg viewBox="0 0 440 375" role="img" aria-label="Radar chart of six brand dimensions; exact scores are listed alongside it.">
          {[0.25, 0.5, 0.75, 1].map(level => <polygon key={level} points={report.dimensions.map((_, index) => radarPoint(index, level)).join(" ")} fill="none" stroke="var(--line-2)" />)}
          {report.dimensions.map((_, index) => <line key={index} x1="220" y1="183" x2={radarPoint(index, 1).split(",")[0]} y2={radarPoint(index, 1).split(",")[1]} stroke="var(--line)" />)}
          {baseline ? <polygon points={baseline.dimensions.map((dimension, index) => radarPoint(index, dimension.score / 100)).join(" ")} fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="5 5" /> : null}
          <polygon points={report.dimensions.map((dimension, index) => radarPoint(index, dimension.score / 100)).join(" ")} fill="var(--accent)" fillOpacity="0.16" stroke="var(--accent)" strokeWidth="2.5" />
          {report.dimensions.map((dimension, index) => <circle key={dimension.id} cx={radarPoint(index, dimension.score / 100).split(",")[0]} cy={radarPoint(index, dimension.score / 100).split(",")[1]} r="4" fill="var(--accent)" />)}
          {[{x:220,y:32},{x:371,y:102},{x:375,y:271},{x:220,y:346},{x:64,y:271},{x:64,y:102}].map((position, index) => <text key={index} x={position.x} y={position.y} textAnchor="middle" fill="var(--ink-2)" fontSize="13" fontFamily="inherit">{report.dimensions[index].label}</text>)}
        </svg>
        <p className="report-chart-note">{baseline ? "Solid: this assessment · Dashed: comparison report" : "Six independent dimensions. No single score defines your brand."}</p>
      </div>
      <div className="report-bars">{report.dimensions.map((dimension, index) => <div className="report-bar" key={dimension.id}>
        <div><span>{dimension.label}</span><strong>{dimension.score}<small>/100</small>{baseline ? <em>{dimension.score - baseline.dimensions[index].score >= 0 ? "+" : ""}{dimension.score - baseline.dimensions[index].score} pts</em> : null}</strong></div>
        <div className="report-track"><span style={{ width: `${dimension.score}%` }} /></div>
        <p>{dimension.band}</p>
      </div>)}</div>
    </section>

    {baseline ? <section className="report-comparison" aria-label="Side-by-side report comparison"><div className="tool-section-heading"><p className="journal-label">Two snapshots. A clearer picture.</p><h2>Compare the evidence.</h2><p>Scores describe what you reported at each point. A change is a prompt to investigate, not proof of business performance.</p></div><div className="report-comparison-scroll"><table><thead><tr><th scope="col">Dimension</th><th scope="col">Comparison report{previousAtMs ? <small>{new Date(previousAtMs).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})}</small> : null}</th><th scope="col">This report{completedAtMs ? <small>{new Date(completedAtMs).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})}</small> : null}</th><th scope="col">Change</th></tr></thead><tbody>{report.dimensions.map((dimension,index)=>{const change=dimension.score-baseline.dimensions[index].score;return <tr key={dimension.id}><th scope="row">{dimension.label}</th><td>{baseline.dimensions[index].score}<small>/100</small></td><td>{dimension.score}<small>/100</small></td><td className={change>0?"is-improved":""}>{change>0?"+":""}{change} pts</td></tr>;})}</tbody></table></div></section> : null}

    <section className="report-priorities"><div className="tool-section-heading"><p className="journal-label">Your next moves</p><h2>{report.established ? "Three areas to keep testing." : "Start with these three."}</h2><p>{report.established ? "Your answers indicate established practices. These areas are useful starting points for testing whether the evidence still holds." : "Your lowest-scoring dimensions come first. When scores tie, we start with the foundations: audience, offer, difference, proof, message, then visibility."}</p></div>
      <div className="report-priority-grid">{report.priorities.map((dimension, index) => <section className="report-priority" key={dimension.id}><span className="report-priority-number">0{index + 1}</span><p className="journal-label">{dimension.score}/100 · {dimension.band}</p><h3>{dimension.label}</h3><p>{dimension.insight}</p><div className="report-evidence"><p><strong>One answer behind this priority</strong></p><p>{dimension.question}</p><blockquote>{dimension.answer}</blockquote></div><p><strong>Your next action</strong><br />{dimension.action}</p><Link href={`/blog/${dimension.article}`} className="tool-text-link no-print">A useful perspective ↗</Link></section>)}</div>
    </section>

    <section className="report-plan"><div className="tool-section-heading"><p className="journal-label">Put it to work</p><h2>Your seven-day clarity plan.</h2><p>Use these as seven work sessions if a week is too compressed. The aim is better evidence and useful artifacts.</p></div><ol>{days.map(day => <li key={day.day}><span>{day.day}</span><div><h3>{day.title}</h3><p>{day.task}</p><p className="report-deliverable"><strong>Leave with:</strong> {day.outcome}</p></div><span className="report-check" aria-hidden="true" /></li>)}</ol></section>

    <details className="report-method"><summary>How to read your scores</summary><p>Each answer receives 0–3 points, progressing from untested assumptions to documented practices and customer evidence. Each dimension contains four equally weighted questions. Its score is the points earned divided by 12, multiplied by 100 and rounded. Dimensions are equally weighted; they are not percentiles or a prediction of revenue.</p><p>The bands (below 40, 40–69 and 70–100) are CoachRank’s editorial guide to prioritization, not validated clinical or psychometric thresholds. This is an original business self-assessment. It reflects your answers rather than an independent audit. A higher score means you reported more established practices; it does not guarantee better commercial results.</p><p>Version 1 · CoachRank Brand Clarity Assessment. Keep this report private if your answers reveal sensitive business information.</p></details>
    <p className="report-print-footer">CoachRank · Celebrating greatness. Understanding what builds it. · coachrank.lol</p>
  </article>;
}
