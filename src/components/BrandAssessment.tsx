"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BRAND_DIMENSIONS, BRAND_QUESTIONS, type BrandAnswers } from "@/lib/brand-assessment";
import type { AssessmentView } from "@/lib/domain/assessments";
import { BrandReport } from "./BrandReport";

export function BrandAssessment() {
  const [order, setOrder] = useState<AssessmentView | null>(null);
  const [answers, setAnswers] = useState<BrandAnswers>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accessLink, setAccessLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [helpful, setHelpful] = useState("");
  const [comment, setComment] = useState("");
  const [reportIndex, setReportIndex] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    async function load() {
      try {
        const response = await fetch("/api/assessment", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Your assessment could not be loaded.");
        if (controller.signal.aborted) return;
        setOrder(data.order);
        setAnswers(data.order.answers || {});
        const next = BRAND_QUESTIONS.findIndex(question => data.order.answers?.[question.id] === undefined);
        setStep(next < 0 ? 5 : Math.floor(next / 4));
        if (data.accessLink) setAccessLink(new URL(data.accessLink, window.location.origin).href);
        if ((data.order.status === "pending" || data.order.status === "failed") && ++checks < 40) timer = setTimeout(load, 3000);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Please reload your assessment.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  async function save(action: string, payload: unknown) {
    if (!order || busy) return null;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: order.revision, action, payload }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your answers could not be saved.");
      setOrder(data.order);
      return data.order as AssessmentView;
    } catch (error) { setError(error instanceof Error ? error.message : "Please try saving again."); return null; }
    finally { setBusy(false); }
  }

  async function nextSection() {
    const result = await save(step === 5 ? "complete" : "save", answers);
    if (result && step < 5) { setStep(step + 1); requestAnimationFrame(() => heading.current?.focus()); }
    if (result && step === 5) { setReportIndex(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  if (loading) return <div className="tool-state" role="status"><p className="journal-label">CoachRank Tools</p><h1>Opening your assessment…</h1><p>We’re checking your private access.</p></div>;
  if (!order || order.status !== "paid") return <div className="tool-state"><p className="journal-label">Brand Clarity Assessment</p><h1>{order?.status === "pending" ? "Confirming your payment." : order?.status === "reversed" ? "This purchase has been reversed." : order?.status === "failed" ? "Payment is not confirmed yet." : "Let’s find your assessment."}</h1><p>{order?.status === "pending" ? "Your assessment will open once Dodo sends verified payment confirmation. This can take a moment. There is no need to pay again." : order?.status === "reversed" ? "Access closes when a payment is refunded or reversed. Contact us if you need help." : "If you already purchased, open the private access link you saved or return in the browser you used at checkout."}</p>{error ? <p className="tool-error" role="alert">{error}</p> : null}<div className="tool-state-actions"><button className="tool-button" type="button" onClick={() => window.location.reload()}>Check access again</button><Link href="/tools/brand-clarity" className="tool-text-link">Back to the assessment</Link></div><p className="tool-tax-note">Need help? Email <a href="mailto:contact@coachrank.lol">contact@coachrank.lol</a> with your Dodo receipt. Never send card details.</p></div>;

  const dimension = BRAND_DIMENSIONS[step];
  const questions = BRAND_QUESTIONS.filter(question => question.dimension === dimension.id);
  const completeSection = questions.every(question => answers[question.id] !== undefined);
  const completedCount = Object.keys(answers).length;
  const selectedReport = reportIndex ?? order.completed.length - 1;
  const finished = order.answers === null || (order.completed.length > 0 && order.retakeExpired);

  return <div className="assessment-workspace">
    {order.preview ? <div className="tool-sample-banner no-print"><p><strong>Admin preview.</strong> This is a test assessment. It creates no payment or sales revenue.</p><Link href="/admin/tools" className="tool-text-link">Back to admin ↗</Link></div> : null}
    <details className="assessment-access no-print"><summary>Save your private access link</summary><p>Use this link to return on another device. Anyone with it can view your answers and report. Keep it private.</p><div><input aria-label="Private assessment access link" value={accessLink} readOnly onFocus={event => event.target.select()} /><button type="button" className="tool-button tool-button-small" onClick={async () => { try { await navigator.clipboard.writeText(accessLink); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copied" : "Copy link"}</button></div><p className="tool-tax-note">Order reference: {order.id}</p></details>
    {error ? <div className="tool-error no-print" role="alert"><p>{error}</p><button type="button" className="tool-text-link" onClick={() => window.location.reload()}>Reload saved version</button></div> : null}
    {finished ? <>
      {order.completed.length > 1 ? <div className="report-selector no-print"><label>View report <select value={selectedReport} onChange={event => setReportIndex(Number(event.target.value))}><option value={0}>First assessment</option><option value={1}>Reassessment &amp; comparison</option></select></label></div> : null}
      <BrandReport run={selectedReport} answers={order.completed[selectedReport].answers} previous={selectedReport > 0 ? order.completed[0].answers : undefined} completedAtMs={order.completed[selectedReport].completedAtMs} />
      <section className="assessment-followup no-print"><div><p className="journal-label">Build on what you learned</p><h2>{order.completed.length === 1 ? "Return with new evidence." : "Keep your progress in perspective."}</h2><p>{order.completed.length === 1 ? "Your purchase includes one reassessment within 30 days of your first report. Use it after putting your plan to work. Starting it keeps your original report saved." : "Both included reports are saved. Compare the evidence behind your answers as well as the scores."}</p>{order.canRetake && order.retakeUntilMs ? <><p className="tool-tax-note">Complete your reassessment by {new Date(order.retakeUntilMs).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} (UTC).</p><button type="button" className="tool-button" disabled={busy} onClick={async () => { const result = await save("retake", null); if (result) { setAnswers({}); setStep(0); setReportIndex(null); window.scrollTo({ top: 0, behavior: "smooth" }); } }}>Start included reassessment ↗</button></> : null}</div><form onSubmit={async event => { event.preventDefault(); await save("feedback", { helpful: Number(helpful), comment }); }}><p className="journal-label">Help us make this more useful</p>{order.feedbackSubmitted ? <p role="status">Thank you. Your feedback is saved for the CoachRank team.</p> : <><label>How useful was your report?<select required value={helpful} onChange={event => setHelpful(event.target.value)}><option value="">Choose a rating</option>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} / 5{value === 1 ? " (Not useful yet)" : value === 5 ? " (Very useful)" : ""}</option>)}</select></label><label>What would help you put the advice into practice?<textarea value={comment} maxLength={1000} onChange={event => setComment(event.target.value)} rows={4} /></label><button className="tool-button" disabled={busy} type="submit">Send feedback</button></>}</form></section>
    </> : <section className="assessment-quiz"><header><p className="journal-label">Brand Clarity Assessment · {order.completed.length ? "Your reassessment" : "Your first assessment"}</p><div className="assessment-progress-label"><span>Section {step + 1} of 6</span><span>{completedCount} / 24 answered</span></div><progress value={completedCount} max={24} aria-label="Assessment completion" /></header><div className="assessment-quiz-layout"><aside><span className="assessment-section-number">0{step + 1}</span><h1>{dimension.label}</h1><p>{dimension.subtitle}</p><p className="tool-tax-note">Choose the answer closest to your current evidence. If two answers fit, use the earlier stage. Your progress saves after each section.</p><ol>{BRAND_DIMENSIONS.map((item,index)=><li key={item.id} aria-current={index === step ? "step" : undefined}><span>{String(index+1).padStart(2,"0")}</span>{item.label}</li>)}</ol></aside><div><h2 tabIndex={-1} ref={heading} className="assessment-section-title">{dimension.subtitle}</h2>{questions.map((question,index)=><fieldset disabled={busy} className="assessment-question" key={question.id}><legend><span>{String(step*4+index+1).padStart(2,"0")}</span>{question.prompt}</legend>{question.options.map((option,optionIndex)=><label key={option} className={answers[question.id] === optionIndex ? "is-selected" : ""}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers({...answers,[question.id]:optionIndex})} value={optionIndex} /><span>{option}</span></label>)}</fieldset>)}<div className="assessment-quiz-actions"><button type="button" className="tool-text-link" disabled={busy || step === 0} onClick={() => { setStep(step-1); requestAnimationFrame(() => heading.current?.focus()); }}>← Previous</button><button type="button" className="tool-button" disabled={busy || !completeSection} onClick={nextSection}>{busy ? "Saving…" : step === 5 ? "Create my report ↗" : "Save & continue →"}</button></div><button type="button" disabled={busy} className="tool-text-link assessment-save-exit" onClick={async () => { if (await save("save", answers)) window.location.assign(new URL("/tools/brand-clarity", window.location.origin).href); }}>Save &amp; exit</button>{order.completed.length ? <p className="tool-tax-note">Your original report remains saved. <a href="/api/assessment/report?run=0" className="tool-text-link">Download your first report ↗</a> Complete this reassessment before your 30-day window ends.</p> : null}</div></div></section>}
  </div>;
}
