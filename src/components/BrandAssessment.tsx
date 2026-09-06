"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND_DIMENSIONS, BRAND_QUESTIONS, type BrandAnswers } from "@/lib/brand-assessment";
import type { AssessmentRun, AssessmentView } from "@/lib/domain/assessments";
import { BrandReport } from "./BrandReport";
import { DimensionIcon } from "./DimensionIcon";

const dateLabel = (run: AssessmentRun) => `Report ${run.index+1} · ${new Date(run.completedAtMs).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})}`;
const mergeReports = (old: AssessmentRun[], next: AssessmentRun[]) => [...new Map([...old,...next].map(run=>[run.index,run])).values()].sort((a,b)=>a.index-b.index);

export function BrandAssessment({ preview = false }: { preview?: boolean }) {
  const endpoint = `/api/assessment${preview ? "?preview=true" : ""}`;
  const router=useRouter();
  const [order,setOrder]=useState<AssessmentView|null>(null);
  const [answers,setAnswers]=useState<BrandAnswers>({});
  const [runs,setRuns]=useState<AssessmentRun[]>([]);
  const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);
  const [accessLink,setAccessLink]=useState("");
  const [copied,setCopied]=useState(false);
  const [helpful,setHelpful]=useState("");
  const [comment,setComment]=useState("");
  const [reportIndex,setReportIndex]=useState<number|null>(null);
  const [compareIndex,setCompareIndex]=useState<number|null>(null);
  const [viewHistory,setViewHistory]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);

  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let checks=0;
    async function load(){
      try{
        const response=await fetch(endpoint,{cache:"no-store",signal:controller.signal});const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Your assessment could not be loaded.");if(controller.signal.aborted)return;
        setOrder(data.order);setRuns(data.order.completed);setAnswers(data.order.answers||{});
        const next=BRAND_QUESTIONS.findIndex(question=>data.order.answers?.[question.id]===undefined);setStep(next<0?5:Math.floor(next/4));
        if(data.accessLink)setAccessLink(new URL(data.accessLink,window.location.origin).href);
        if((data.order.status==="pending"||data.order.status==="failed")&&++checks<40)timer=setTimeout(load,3000);
      }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Please reload your assessment.");}
      finally{if(!controller.signal.aborted)setLoading(false);}
    }
    void load();return()=>{controller.abort();clearTimeout(timer);};
  },[endpoint]);

  async function save(action:string,payload:unknown){
    if(!order||busy)return null;setBusy(true);setError("");
    try{
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:order.revision,action,payload})});const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Your answers could not be saved.");
      const next=data.order as AssessmentView;setOrder(next);setRuns(old=>mergeReports(old,next.completed));setSaved(true);return next;
    }catch(error){setError(error instanceof Error?error.message:"Please try saving again.");return null;}finally{setBusy(false);}
  }
  function moveTo(index:number){setStep(index);requestAnimationFrame(()=>heading.current?.focus());}
  async function nextSection(){const result=await save(step===5?"complete":"save",answers);if(!result)return;if(step<5)moveTo(step+1);else{setReportIndex(null);setCompareIndex(null);setViewHistory(false);window.scrollTo({top:0,behavior:"smooth"});}}
  async function olderReports(){if(!runs.length||busy)return;setBusy(true);setError("");try{const response=await fetch(`/api/assessment/history?before=${runs[0].index}${preview ? "&preview=true" : ""}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error);setRuns(old=>mergeReports(old,data.reports));}catch(error){setError(error instanceof Error?error.message:"Could not load earlier reports.");}finally{setBusy(false);}}

  if(loading)return <div className="tool-state" role="status"><p className="journal-label">CoachRank Tools</p><h1>Opening your assessment…</h1><p>Your next chapter starts with a little clarity.</p></div>;
  if(!order||order.status!=="paid")return <div className="tool-state"><p className="journal-label">Brand Clarity Assessment</p><h1>{preview ? "Open your admin preview." : order?.status==="pending"?"Confirming your payment.":order?.status==="reversed"?"This purchase has been reversed.":"Let’s find your assessment."}</h1><p>{preview ? "Sign in to CoachRank Studio and choose Open admin preview. Your saved preview reports will be there." : order?.status==="pending"?"Your assessment will open after Dodo confirms payment. This can take a moment. There is no need to pay again.":order?.status==="reversed"?"Access closes when a payment is refunded or reversed. Contact us if you need help.":"Already purchased? Open your saved private access link, or return in the browser you used at checkout."}</p>{error?<p className="tool-error" role="alert">{error}</p>:null}<div className="tool-state-actions"><button className="tool-button" onClick={()=>window.location.reload()}>Check access again</button><Link href={preview ? "/admin/tools" : "/tools/brand-clarity"} className="tool-text-link">{preview ? "Open CoachRank Studio" : "Explore the assessment"}</Link></div><p className="tool-tax-note">Need help? Email <a href="mailto:contact@coachrank.lol">contact@coachrank.lol</a> with your Dodo receipt. Never send card details.</p></div>;

  const dimension=BRAND_DIMENSIONS[step],questions=BRAND_QUESTIONS.filter(question=>question.dimension===dimension.id);
  const completeSection=questions.every(question=>answers[question.id]!==undefined),completedCount=Object.keys(answers).length;
  const selected=runs.find(run=>run.index===(reportIndex??order.completedCount-1));
  const baseline=selected?runs.find(run=>run.index===(compareIndex??selected.index-1)):undefined;
  const finished=order.answers===null||viewHistory;
  return <div className="assessment-workspace">
    {order.preview?<div className="tool-sample-banner no-print"><p><strong>Admin preview.</strong> You are testing the assessment. No payment is recorded for this preview.</p><div className="assessment-preview-actions"><Link href="/tools/brand-clarity#get-assessment" className="tool-text-link">Leave preview · View checkout ↗</Link><Link href="/admin/tools" className="tool-text-link">Back to admin ↗</Link></div></div>:null}
    <div className="assessment-owner-bar no-print"><span>{order.preview ? "Preview access · Saved separately from purchases" : "✓ Lifetime access · Unlimited retakes"}</span><span>{order.completedCount} saved {order.completedCount===1?"report":"reports"}</span></div>
    <details className="assessment-access no-print"><summary>{order.preview ? "Keep your admin preview link." : "Keep your access. Save your private link."}</summary><p>{order.preview ? "Your preview reports stay saved. This link requires a signed-in CoachRank administrator and does not provide customer purchase access." : "Return on another device with this link. Anyone with it can view your answers and reports, so keep it private."}</p><div><input aria-label="Private assessment access link" value={accessLink} readOnly onFocus={event=>event.target.select()}/><button className="tool-button tool-button-small" onClick={async()=>{try{await navigator.clipboard.writeText(accessLink);setCopied(true);}catch{setCopied(false);}}}>{copied?"Copied":"Copy link"}</button></div><p className="tool-tax-note">Order reference: {order.id}</p></details>
    {error?<div className="tool-error no-print" role="alert"><p>{error}</p><button className="tool-text-link" onClick={()=>window.location.reload()}>Reload saved version</button></div>:null}
    {finished&&selected?<>
      <section className="report-history-toolbar no-print" aria-label="Your report history"><div><p className="journal-label">Your clarity, over time</p><h2>See what changed.</h2><p>Choose any two saved reports. Compare your evidence as well as your scores.</p></div><div className="report-history-controls"><label>View report<select value={selected.index} onChange={event=>{setReportIndex(Number(event.target.value));setCompareIndex(null);}}>{[...runs].reverse().map(run=><option key={run.index} value={run.index}>{dateLabel(run)}</option>)}</select></label><label>Compare with<select value={baseline?.index??-1} onChange={event=>setCompareIndex(Number(event.target.value))}><option value={-1}>View on its own</option>{[...runs].reverse().filter(run=>run.index!==selected.index).map(run=><option key={run.index} value={run.index}>{dateLabel(run)}</option>)}</select></label>{runs[0]?.index>0?<button className="tool-text-link" disabled={busy} onClick={olderReports}>Load earlier reports</button>:null}</div></section>
      <BrandReport preview={preview} run={selected.index} compareRun={baseline?.index??-1} answers={selected.answers} previous={baseline?.answers} completedAtMs={selected.completedAtMs} previousAtMs={baseline?.completedAtMs}/>
      <section className="assessment-followup no-print"><div><p className="journal-label">Yours to return to</p><h2>New evidence. A new perspective.</h2><p>{order.preview ? "Your preview reports stay in this admin session. Retake the assessment to test how answers affect the report and comparisons. No payment is recorded." : "Your $9 purchase includes lifetime access and unlimited retakes. Every completed report stays in your history. Try again after making a meaningful change, then compare the two."}</p>{order.answers!==null?<button className="tool-button" onClick={()=>setViewHistory(false)}>Resume your current assessment →</button>:<button className="tool-button" disabled={busy} onClick={async()=>{const result=await save("retake",null);if(result){setAnswers({});setStep(0);setReportIndex(null);setCompareIndex(null);setViewHistory(false);setSaved(false);window.scrollTo({top:0,behavior:"smooth"});}}}>Start a new assessment ↗</button>}</div><form onSubmit={async event=>{event.preventDefault();await save("feedback",{helpful:Number(helpful),comment});}}><p className="journal-label">Make the next edition better</p>{order.feedbackSubmitted?<p role="status">Thank you. Your feedback is saved for the CoachRank team.</p>:<><label>How useful was your report?<select required value={helpful} onChange={event=>setHelpful(event.target.value)}><option value="">Choose a rating</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value} / 5{value===1?" (Not useful yet)":value===5?" (Very useful)":""}</option>)}</select></label><label>What would make your next move easier?<textarea value={comment} maxLength={1000} onChange={event=>setComment(event.target.value)} rows={4}/></label><button className="tool-button" disabled={busy}>Send feedback</button></>}</form></section>
    </>:<section className="assessment-quiz"><header><p className="journal-label">Brand Clarity Assessment · Report {order.completedCount+1}</p><div className="assessment-progress-label"><span>Section {step+1} of 6</span><span>{completedCount} / 24 answered</span></div><progress value={completedCount} max={24} aria-label="Assessment completion"/></header><div className="assessment-quiz-layout"><aside><DimensionIcon dimension={dimension.id}/><h1>{dimension.label}</h1><p>{dimension.subtitle}</p><p className="tool-tax-note">Think about one offer and your current evidence. For recent activity, use the last 90 days. Pick what is true today, not what you hope to do next.</p><ol>{BRAND_DIMENSIONS.map((item,index)=><li key={item.id} aria-current={index===step?"step":undefined}><button disabled={busy||index>step&&!BRAND_QUESTIONS.filter(q=>q.dimension===item.id).some(q=>answers[q.id]!==undefined)} onClick={()=>moveTo(index)}><span>{String(index+1).padStart(2,"0")}</span>{item.label}</button></li>)}</ol><div className="assessment-reassurance"><strong>No perfect answers required.</strong><p>Early-stage answers help the report give you a useful starting point. There is no timer.</p></div></aside><div><h2 tabIndex={-1} ref={heading} className="assessment-section-title">{dimension.subtitle}</h2>{questions.map((question,index)=><fieldset disabled={busy} className="assessment-question" key={question.id}><legend><span>{String(step*4+index+1).padStart(2,"0")}</span>{question.prompt}</legend><details className="question-hint"><summary><span aria-hidden="true">i</span> What does this mean? See an example</summary><div><p>{question.hint}</p><p><strong>For example</strong><br/>{question.example}</p></div></details>{question.options.map((option,optionIndex)=><label key={option} className={answers[question.id]===optionIndex?"is-selected":""}><input type="radio" name={question.id} checked={answers[question.id]===optionIndex} onChange={()=>{setAnswers({...answers,[question.id]:optionIndex});setSaved(false);}} value={optionIndex}/><span>{option}</span><span className="answer-check" aria-hidden="true">{answers[question.id]===optionIndex?"✓":""}</span></label>)}</fieldset>)}<div className="assessment-quiz-actions"><button className="tool-text-link" disabled={busy||step===0} onClick={()=>moveTo(step-1)}>← Previous</button><button className="tool-button" disabled={busy||!completeSection} onClick={nextSection}>{busy?"Saving…":step===5?"Show me my next three moves ↗":"Save & continue →"}</button></div><div className="assessment-save-row"><button disabled={busy} className="tool-text-link" onClick={async()=>{await save("save",answers);}}>Save progress</button><span role="status">{saved?"✓ Progress saved":"Your progress saves after each section."}</span><button disabled={busy} className="tool-text-link" onClick={async()=>{if(await save("save",answers))router.push(preview ? "/admin/tools" : "/tools/brand-clarity");}}>Save & exit</button></div>{order.completedCount?<button className="tool-text-link" onClick={async()=>{if(await save("save",answers))setViewHistory(true);}}>View your saved reports ↗</button>:null}</div></div></section>}
  </div>;
}
