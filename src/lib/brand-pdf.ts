import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { brandReport, brandActionPlan, type BrandAnswers } from "./brand-assessment";

const clean = (value: string) => value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/…/g, "...").replace(/[^\x20-\x7e\n]/g, " ");

export async function createBrandPdf(answers: BrandAnswers, completedAtMs: number, previous?: BrandAnswers, sample = false, previousAtMs?: number) {
  const report = brandReport(answers);
  const baseline = previous ? brandReport(previous) : null;
  const pdf = await PDFDocument.create();
  pdf.setTitle(sample ? "Sample Brand Clarity Report - CoachRank" : "Your Brand Clarity Report - CoachRank");
  pdf.setAuthor("CoachRank");
  pdf.setSubject("Six brand dimensions, three priorities and a seven-day action plan");
  pdf.setLanguage("en-US");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.063,.071,.094), muted = rgb(.31,.33,.37), accent = rgb(.173,.294,.941), line = rgb(.86,.87,.89);
  const width = 595.28, height = 841.89, margin = 50, contentWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - 55;

  function newPage() { page = pdf.addPage([width,height]); y = height - 65; page.drawText("COACHRANK / BRAND CLARITY", { x:margin, y:height-35, size:8, font:bold, color:muted }); }
  function ensure(space: number) { if (y - space < 65) newPage(); }
  function paragraph(value: string, size = 11, strong = false, color = muted, after = 12) {
    const font = strong ? bold : regular;
    const words = clean(value).split(/\s+/);
    let current = "";
    const lines: string[] = [];
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate,size) > contentWidth && current) { lines.push(current); current=word; } else current=candidate;
    }
    if (current) lines.push(current);
    const leading = size * 1.5;
    for (const text of lines) { ensure(leading); page.drawText(text,{x:margin,y,size,font,color}); y -= leading; }
    y -= after;
  }
  function label(value: string) { ensure(34); paragraph(value.toUpperCase(),9,true,accent,10); }
  function heading(value: string, size=27) {
    const words = clean(value).split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (bold.widthOfTextAtSize(candidate,size) > contentWidth && current) { lines.push(current); current=word; } else current=candidate;
    }
    if (current) lines.push(current);
    ensure(size * (lines.length + 1) + 22);
    // The cursor follows a text baseline; reserve the larger heading's ascent.
    y -= size * .65;
    for (const text of lines) { page.drawText(text,{x:margin,y,size,font:bold,color:ink}); y -= size * 1.15; }
    y -= 8;
  }
  function rule() { ensure(20); page.drawLine({start:{x:margin,y},end:{x:width-margin,y},color:line,thickness:.7}); y-=22; }

  page.drawRectangle({ x:0,y:height-14,width,height:14,color:accent });
  const wordmark = await pdf.embedPng(await readFile(join(process.cwd(),"public/brand/wordmark.png")));
  page.drawImage(wordmark,{x:margin,y:y-22,width:180,height:180*wordmark.height/wordmark.width});
  y -= 62;
  label(sample ? "Illustrative sample / Fictional answers" : "Your private report / Edition 01");
  heading("Brand Clarity",43);
  paragraph("A clearer view. A better next step.",19,true,ink,14);
  paragraph(new Date(completedAtMs).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}),10,false,muted,24);
  paragraph(sample ? "These fictional answers demonstrate the report format. Your own report follows your answers." : "Your answers describe the evidence behind your brand today. Use this report to choose a useful next action and test it with real people.");
  rule(); label("Your six dimensions");
  report.dimensions.forEach((dimension,index) => {
    ensure(57);
    page.drawText(dimension.label,{x:margin,y,size:12,font:bold,color:ink});
    const delta = baseline ? dimension.score - baseline.dimensions[index].score : null;
    const score = `${dimension.score}/100${delta !== null ? `   ${delta>=0?"+":""}${delta} pts` : ""}`;
    page.drawText(score,{x:width-margin-bold.widthOfTextAtSize(score,11),y,size:11,font:bold,color:accent});
    y-=14;
    page.drawRectangle({x:margin,y,width:contentWidth,height:6,color:line});
    if (dimension.score) page.drawRectangle({x:margin,y,width:contentWidth*dimension.score/100,height:6,color:accent});
    y-=17;
    page.drawText(dimension.band,{x:margin,y,size:9,font:regular,color:muted});
    y-=24;
  });
  paragraph(baseline ? `Point changes compare with your selected report${previousAtMs ? " dated " + new Date(previousAtMs).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}) : ""}. They describe changes in your reported practices, not measured commercial performance.` : "The dimensions are independent. Scores are not percentiles, a measure of personal worth or a prediction of revenue.",9);

  newPage(); label("Your brand at a glance"); heading("Six dimensions. One clear view.");
  paragraph(baseline ? "The solid blue shape is this report. The gray outline is your selected comparison. Look at individual dimensions before drawing conclusions from the overall shape." : "Read each dimension independently. The shape helps you see where your reported practices are more established and where there is room to build evidence.");
  const centerX=width/2,centerY=y-165,radius=118;
  const point=(index:number,score:number)=>{const angle=Math.PI/2-index*Math.PI/3;return {x:centerX+Math.cos(angle)*radius*score/100,y:centerY+Math.sin(angle)*radius*score/100};};
  for(const ring of [25,50,75,100]) for(let i=0;i<6;i++) page.drawLine({start:point(i,ring),end:point((i+1)%6,ring),color:line,thickness:.7});
  report.dimensions.forEach((dimension,index)=>{
    page.drawLine({start:{x:centerX,y:centerY},end:point(index,100),color:line,thickness:.7});
    const pos=point(index,135);page.drawText(dimension.label,{x:pos.x-regular.widthOfTextAtSize(dimension.label,10)/2,y:pos.y-4,size:10,font:regular,color:muted});
  });
  const polygon=report.dimensions.map((dimension,index)=>point(index,dimension.score));
  page.drawSvgPath(polygon.map((p,index)=>`${index?"L":"M"}${p.x} ${-p.y}`).join(" ")+" Z",{x:0,y:0,color:accent,opacity:.12});
  for(let i=0;i<6;i++){
    if(baseline) page.drawLine({start:point(i,baseline.dimensions[i].score),end:point((i+1)%6,baseline.dimensions[(i+1)%6].score),color:muted,thickness:1,dashArray:[4,3]});
    page.drawLine({start:polygon[i],end:polygon[(i+1)%6],color:accent,thickness:2});
    page.drawCircle({...polygon[i],size:3,color:accent});
  }
  y=centerY-195;
  if(baseline){
    label("Side-by-side comparison");
    paragraph(`Compared with ${previousAtMs ? new Date(previousAtMs).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}) : "your selected report"}. Change is shown in score points.`,9);
    for(const [index,dimension] of report.dimensions.entries()){
      ensure(24);const earlier=baseline.dimensions[index].score,delta=dimension.score-earlier;
      page.drawText(dimension.label,{x:margin,y,size:10,font:bold,color:ink});
      page.drawText(`${earlier} / 100  to  ${dimension.score} / 100`,{x:260,y,size:10,font:regular,color:muted});
      page.drawText(`${delta>=0?"+":""}${delta} pts`,{x:465,y,size:10,font:bold,color:accent});y-=24;
    }
  }else paragraph("Use this snapshot alongside actual examples from your business. A later retake can show how your reported evidence has changed, with every earlier report preserved.",10);

  newPage(); label("Your next moves"); heading(report.established ? "Keep testing your foundations." : "Start with these three.");
  paragraph("Priorities follow your lowest dimension scores. Ties start with audience, then offer, difference, proof, message and visibility.");
  for (const [index,priority] of report.priorities.entries()) {
    ensure(260); rule(); label(`Priority ${index+1} / ${priority.score} out of 100`); heading(priority.label,24);
    paragraph(priority.insight);
    paragraph("An answer behind this priority",10,true,ink,5);
    paragraph(priority.question,10,false,muted,5);
    paragraph(`Your answer: ${priority.answer}`,10,false,ink,12);
    paragraph("Your next action",10,true,accent,5);
    paragraph(priority.action);
    paragraph(`Read more: coachrank.lol/blog/${priority.article}`,8,false,muted,15);
  }

  ensure(260); y -= 15; label("Put it to work"); heading("Your seven-day clarity plan.");
  paragraph("Treat these as seven work sessions if a week is too compressed. Aim for better evidence and useful artifacts. A draft plus an honest customer observation is a meaningful result.");
  for (const day of brandActionPlan(report)) {
    ensure(200); rule(); label(`Day ${day.day}`); heading(day.title,21);
    paragraph(day.task);
    paragraph(`Leave with: ${day.outcome}`,10,true,ink,18);
  }

  newPage(); label("Keep your thinking honest"); heading("How to use these scores.");
  paragraph("Each answer receives 0-3 points, progressing from untested assumptions to documented practices and customer evidence. Four equally weighted questions make up each dimension. A dimension score is its points divided by 12, multiplied by 100 and rounded.");
  paragraph("The bands - below 40, 40-69 and 70-100 - are CoachRank's editorial guide to prioritization. They are not validated clinical or psychometric thresholds. This original business self-assessment reflects your answers, not an independent audit or a comparison with other businesses.");
  paragraph("A higher score means you reported more established practices. It does not guarantee customer demand, more revenue or stronger performance. Keep the underlying examples and look for evidence that challenges your assumptions.");
  rule(); heading("Revisit with new evidence.",23);
  paragraph("Your purchase includes lifetime access and unlimited personal retakes while CoachRank operates the service. Use your private access link to return, keep every report and compare any two saved reports side by side. Download your PDFs to keep your own copies.");
  paragraph("Keep your private access link and this report safe. Anyone with the link can view your assessment. If you need help restoring access, contact contact@coachrank.lol with your Dodo payment receipt. Never send card details.");
  rule(); paragraph("Celebrating greatness. Understanding what builds it.",17,true,accent);
  paragraph("CoachRank is an independent editorial for ambitious people. Explore performance, business, creativity, growth and coaching at coachrank.lol.");
  for (const [index,current] of pdf.getPages().entries()) {
    current.drawLine({start:{x:margin,y:43},end:{x:width-margin,y:43},color:line,thickness:.6});
    current.drawText(sample ? "COACHRANK  /  ILLUSTRATIVE SAMPLE" : "COACHRANK  /  PRIVATE BRAND CLARITY REPORT", {x:margin,y:28,font:regular,size:7,color:muted});
    current.drawText(`${index+1} / ${pdf.getPageCount()}`,{x:width-margin-26,y:28,font:bold,size:8,color:muted});
  }
  return pdf.save();
}
