"use client";
import {useState} from "react";
import {BRAND_QUESTIONS,SAMPLE_ANSWERS,brandReport} from "@/lib/brand-assessment";
const base=brandReport(SAMPLE_ANSWERS);
const changed=brandReport(Object.fromEntries(BRAND_QUESTIONS.map(q=>[q.id,Math.min(3,SAMPLE_ANSWERS[q.id]+(q.dimension==="difference"||q.dimension==="visibility"?1:0))])));
function point(i:number,score:number){const angle=-Math.PI/2+i*Math.PI/3;return `${150+Math.cos(angle)*94*score/100},${130+Math.sin(angle)*94*score/100}`;}
export function ReportPreview({compact=false}:{compact?:boolean}) {
  const [after,setAfter]=useState(false);const report=after?changed:base;
  return <div className={`report-preview ${compact?"is-compact":""}`}>
    <div className="preview-window-bar"><span className="preview-window-dots" aria-hidden="true">● ● ●</span><span>YOUR BRAND CLARITY REPORT</span><span aria-hidden="true">↗</span></div>
    <div className="preview-content"><div className="preview-title"><div><span className="journal-label">A clearer picture</span><h3>Your next moves,<br/>made visible.</h3></div><span className="preview-edition">01<br/><small>EDITION</small></span></div>
    <div className="preview-chart-layout"><div className="preview-radar"><svg viewBox="0 0 300 260" role="img" aria-label="Illustrative six-dimension brand report">{[25,50,75,100].map(v=><polygon key={v} points={report.dimensions.map((_,i)=>point(i,v)).join(' ')} fill="none" stroke="var(--line-2)"/>)}{report.dimensions.map((_,i)=><line key={i} x1="150" y1="130" x2={point(i,100).split(',')[0]} y2={point(i,100).split(',')[1]} stroke="var(--line-2)"/>)}{after?<polygon points={base.dimensions.map((d,i)=>point(i,d.score)).join(' ')} fill="none" stroke="var(--ink-3)" strokeDasharray="4 4"/>:null}<polygon points={report.dimensions.map((d,i)=>point(i,d.score)).join(' ')} fill="var(--accent)" fillOpacity=".15" stroke="var(--accent)" strokeWidth="2.5"/>{report.dimensions.map((d,i)=><circle key={d.id} cx={point(i,d.score).split(',')[0]} cy={point(i,d.score).split(',')[1]} r="3.5" fill="var(--accent)"/>)}</svg><span>{after?"Two snapshots, compared":"Six dimensions, one clear view"}</span></div><div className="preview-score-list">{report.dimensions.map(d=><div key={d.id}><p>{d.label}<strong>{d.score}<small>/100</small></strong></p><span><i style={{width:`${d.score}%`}}/></span></div>)}</div></div>
    <div className="preview-moves">{report.priorities.map((d,i)=><div key={d.id}><span>0{i+1}</span><p>{d.label}<small>Your next priority</small></p></div>)}</div>
    <div className="preview-footer"><span>✓ Three next moves</span><span>✓ Seven-day plan</span><span>✓ PDF download</span></div>
    {!compact?<div className="preview-toggle"><span>Explore a sample comparison</span><div><button aria-pressed={!after} onClick={()=>setAfter(false)}>First snapshot</button><button aria-pressed={after} onClick={()=>setAfter(true)}>After changes</button></div></div>:null}<p className="preview-disclosure">Illustrative sample with fictional answers. Your scores and priorities follow your own answers.</p>
    </div>
  </div>;
}
