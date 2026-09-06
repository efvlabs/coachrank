"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { emptySocial, SOCIAL_STATUSES, trackedSocialUrl, type SocialInput, type SocialRecord, type SocialStatus } from "@/lib/social";

type Article = { id: string; title: string; slug: string; topic: string; coverUrl: string };
type View = "posts" | "accounts" | "distribution" | "playbook";
const label = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
function matchingSource(source: string, slug: string) { try { return new URL(source).hostname === "coachrank.lol" && new URL(source).pathname === `/blog/${slug}`; } catch { return false; } }
function postCopy(item: SocialInput) {
  const url = trackedSocialUrl(item.sourceUrl, item.channel);
  return !url || item.body.includes(url) ? item.body : item.body.includes(item.sourceUrl) ? item.body.replaceAll(item.sourceUrl, url) : `${item.body}\n\n${url}`;
}

export function SocialWorkspace({ initialRecords, articles }: { initialRecords: SocialRecord[]; articles: Article[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [view, setView] = useState<View>("posts");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<SocialInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLFormElement>(null);
  const posts = records.filter(item => item.kind === "post");
  const accounts = records.filter(item => item.kind === "account");
  const visible = (view === "accounts" ? accounts : posts).filter(item => (status === "all" ? item.status !== "archived" : item.status === status) && `${item.title} ${item.body} ${item.notes}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (a.plannedDate || "9999").localeCompare(b.plannedDate || "9999") || a.title.localeCompare(b.title));

  function edit(item: SocialInput) {
    setEditor({ ...item, id: item.id || crypto.randomUUID() }); setError(""); setMessage("");
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function update(patch: Partial<SocialInput>) { setEditor(current => current ? { ...current, ...patch } : null); }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setMessage("Copied. Ready to paste into your channel."); }
    catch { setMessage("Clipboard unavailable. Open the record and select the text to copy it."); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editor || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editor) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not save this record.");
      setRecords(current => [result.record, ...current.filter(item => item.id !== result.record.id)]);
      setEditor(null); setMessage("Saved to your Social desk.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save. Your draft is still here."); }
    finally { setBusy(false); }
  }

  return <div className="social-workspace">
    <div className="admin-page-heading"><div><p className="journal-label">CoachRank Social · X</p><h1>Good ideas deserve company.</h1><p>Your publication, out in the world. Plan the story, join the conversation and keep track of what you share on X.</p></div><button className="tool-button" onClick={() => edit(emptySocial(view === "accounts" ? "account" : "post"))} disabled={busy}>+ {view === "accounts" ? "Add account" : "New draft"}</button></div>
    <div className="admin-metrics admin-metrics-three">
      {[{ label: "In the making", value: posts.filter(item => ["draft", "ready"].includes(item.status)).length, detail: "Drafts and ready-to-post ideas" }, { label: "Published", value: posts.filter(item => item.status === "published").length, detail: "Posts you have logged with a live link" }, { label: "Following", value: accounts.filter(item => item.status === "following").length, detail: "Accounts you have marked as followed" }].map(item => <div className="admin-metric" key={item.label}><p>{item.label}</p><strong>{item.value}</strong><span>{item.detail}</span></div>)}
    </div>
    <div className="social-tabs" aria-label="Social workspace sections">{(["posts", "accounts", "distribution", "playbook"] as const).map(tab => <button key={tab} aria-pressed={view === tab} onClick={() => { setView(tab); setStatus("all"); }}>{({ posts: "Publishing queue", accounts: "People & ideas", distribution: "Article distribution", playbook: "Launch playbook" })[tab]}</button>)}</div>
    <p className="social-notice">Plan and record your activity here. Publish on X, then add its live link. Dates organise your queue.</p>
    <p role="status" className="social-feedback">{message}</p>
    {initialRecords.length >= 1000 && <p className="social-notice">Showing the most recently updated 1,000 records.</p>}

    {editor && <form ref={editorRef} className="social-editor" onSubmit={save}>
      <div className="social-editor-heading"><div><p className="journal-label">{editor.kind === "post" ? "Make it worth sharing" : "Find your kind of people"}</p><h2>{editor.revision ? "Edit record" : editor.kind === "post" ? "A new perspective." : "Start a connection."}</h2></div><button type="button" className="tool-text-link" disabled={busy} onClick={() => setEditor(null)}>Close editor</button></div>
      <fieldset disabled={busy}>
        <label>{editor.kind === "post" ? "Working title" : "Name / account"}<input required maxLength={180} value={editor.title} onChange={event => update({ title: event.target.value })} /></label>
        <div className="social-form-grid"><label>Channel<input value="X" readOnly /></label><label>Status<select value={editor.status} onChange={event => update({ status: event.target.value as SocialStatus })}>{SOCIAL_STATUSES[editor.kind].map(item => <option value={item} key={item}>{label(item)}</option>)}</select></label></div>
        {editor.kind === "post" ? <>
          <label>Post copy / article outline<textarea rows={7} maxLength={12000} value={editor.body} onChange={event => update({ body: event.target.value })} /></label><p className="social-field-note">{Array.from(editor.body).length} characters before links. Check the final length in the X composer.</p>
          <label>Connect a CoachRank article or tool<select value={editor.sourceUrl === "https://coachrank.lol/tools/brand-clarity" || articles.some(article => editor.sourceUrl === `https://coachrank.lol/blog/${article.slug}`) ? editor.sourceUrl : ""} onChange={event => update({ sourceUrl: event.target.value })}><option value="">Choose an article, or enter a link below</option><option value="https://coachrank.lol/tools/brand-clarity">Brand Clarity Assessment · $9</option>{articles.map(article => <option key={article.id} value={`https://coachrank.lol/blog/${article.slug}`}>{article.title}</option>)}</select></label>
        </> : <label>Why this account matters<textarea rows={3} maxLength={12000} value={editor.body} onChange={event => update({ body: event.target.value })} /></label>}
        <label>{editor.kind === "post" ? "Source / destination URL" : "Research source URL"}<input type="url" placeholder="https://" maxLength={2000} value={editor.sourceUrl} onChange={event => update({ sourceUrl: event.target.value })} /></label>
        {editor.kind === "post" && editor.sourceUrl.startsWith("https://coachrank.lol/") && <div className="social-tracked-link"><span>{trackedSocialUrl(editor.sourceUrl, editor.channel)}</span><button type="button" onClick={() => copy(trackedSocialUrl(editor.sourceUrl, editor.channel))}>Copy tracked link</button></div>}
        <label>{editor.kind === "post" ? "Published post URL (after publishing)" : "Account profile URL"}<input type="url" placeholder="https://" required={editor.kind === "account" || editor.status === "published"} maxLength={2000} value={editor.publicUrl} onChange={event => update({ publicUrl: event.target.value })} /></label>
        <div className="social-form-grid">{editor.kind === "post" && <label>Planned date<input type="date" value={editor.plannedDate} onChange={event => update({ plannedDate: event.target.value })} /></label>}<label>{editor.kind === "post" ? "Published date" : "Followed date"}<input type="date" value={editor.completedDate} onChange={event => update({ completedDate: event.target.value })} /></label></div>
        <label>Notes / creative direction / results<textarea rows={3} maxLength={3000} value={editor.notes} onChange={event => update({ notes: event.target.value })} /></label>
        <p className="social-field-note">Use periods, commas or colons. No long dashes. Keep outcomes and dates accurate.</p>
        {error && <p className="social-error" role="alert">{error}</p>}
        <div className="social-form-actions"><button className="tool-button" type="submit">{busy ? "Saving…" : "Save record"}</button>{editor.kind === "post" && <button type="button" className="tool-text-link" onClick={() => copy(postCopy(editor))}>Copy post + tracked link</button>}</div>
      </fieldset>
    </form>}

    {(view === "posts" || view === "accounts") && <>
      <div className="social-filters"><label><span className="sr-only">Search records</span><input placeholder={view === "accounts" ? "Find an account or idea…" : "Search your queue…"} value={search} onChange={event => setSearch(event.target.value)} /></label><label><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Active records</option>{SOCIAL_STATUSES[view === "posts" ? "post" : "account"].map(item => <option value={item} key={item}>{label(item)}</option>)}</select></label></div>
      <div className={`social-record-grid ${view === "accounts" ? "social-account-grid" : ""}`}>{visible.map(item => <article key={item.id} className="social-record">
        <div className="social-record-top"><span>{item.channel} <span aria-hidden="true">·</span> {item.completedDate || item.plannedDate || (item.kind === "post" ? "Choose a date" : "On your radar")}</span><span className={`social-badge social-badge-${item.status}`}>{label(item.status)}</span></div>
        <h2>{item.title}</h2><p className="social-record-body">{item.body}</p>
        {item.notes && <details className="social-record-notes"><summary>{item.kind === "post" ? "Creative direction & notes" : "Research & notes"}</summary><p>{item.notes}</p></details>}
        <div className="social-record-actions"><button onClick={() => edit(item)} disabled={busy}>Edit record</button>{item.kind === "post" && <button onClick={() => copy(postCopy(item))}>Copy post</button>}{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.kind === "post" ? "Source" : "Research"} ↗</a>}{item.publicUrl && <a href={item.publicUrl} target="_blank" rel="noopener noreferrer">{item.kind === "post" ? "Live post" : "Profile"} ↗</a>}</div>
      </article>)}</div>
      {!visible.length && <div className="social-empty"><span aria-hidden="true">◎</span><h2>Room for your next idea.</h2><p>Add a record or change your filters to get started.</p></div>}
    </>}

    {view === "distribution" && <section className="social-distribution"><div className="social-section-intro"><h2>Give every story a second life.</h2><p>Your published articles and the social records linked to each. Start with the pieces closest to your readers&apos; current questions.</p></div>{articles.map(article => {
      const linked = posts.filter(item => matchingSource(item.sourceUrl, article.slug) && item.status !== "archived");
      return <article key={article.id}><div><p className="journal-label">{article.topic}</p><h3><Link href={`/blog/${article.slug}`}>{article.title}</Link></h3><p>{linked.length ? linked.map(item => `${item.channel}: ${item.status}`).join(" · ") : "No promotion logged yet"}</p></div><button onClick={() => edit({ ...emptySocial("post"), title: article.title, sourceUrl: `https://coachrank.lol/blog/${article.slug}` })} className="tool-text-link" disabled={busy}>Create draft ↗</button></article>;
    })}</section>}

    {view === "playbook" && <section className="social-playbook">
      <div className="social-playbook-lead"><p className="journal-label">First readers. First useful conversations.</p><h2>Earn attention with something worth keeping.</h2><p>Focus on X. Share a useful idea, show the work behind it and make room for a real conversation. Let the first readers teach us what deserves more attention.</p></div>
      <div className="social-playbook-grid"><article><span>01</span><h3>A focused first week</h3><p>One considered X post each day. Mix useful exercises, editorial perspectives and a clear demonstration of the $9 report. Add several thoughtful replies to relevant conversations, at a pace you can sustain.</p><p>The starter queue is a proposed sequence. Choose your dates before posting.</p></article><article><span>02</span><h3>People before reach</h3><p>Use People &amp; ideas as a reading list. Add working coaches, independent consultants and founders who ask real questions about their brand. Follow accounts whose work you would read without expecting a follow back.</p></article><article><span>03</span><h3>One original home</h3><p>Keep full articles on CoachRank. Adapt one useful idea into a post that stands on its own, then link to the original for readers who want to go deeper. Use the article cover or a clearly labelled sample report when it helps explain the idea.</p><p>Reddit, Medium and other channels can follow once the X launch has taught us what resonates.</p></article><article><span>04</span><h3>Learn from real responses</h3><p>Record useful replies, sample-report visits you can measure, checkout questions and confirmed sales in each post&apos;s notes. The link builder adds UTM tags; this desk does not collect platform analytics.</p><p>After a week, repeat the topic that starts the best conversations. Improve any product explanation that people find confusing.</p></article></div>
      <div className="social-indexing"><div><p className="journal-label">Google Search Console</p><h3>Help readers find the original.</h3><p>Submit the sitemap once. Request indexing for a few priority pages, then monitor Page indexing and Performance. Repeated requests do not speed up crawling.</p><a href="https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl" target="_blank" rel="noopener noreferrer">Google&apos;s indexing guidance ↗</a></div><div><a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">Sitemap ↗</a>{["/", "/tools/brand-clarity", "/blog/brand-clarity-before-brand-identity", "/blog/decision-journal-before-the-outcome"].map(path => <div key={path}><span>coachrank.lol{path}</span><button onClick={() => copy(`https://coachrank.lol${path}`)}>Copy</button></div>)}</div></div>
    </section>}
  </div>;
}
