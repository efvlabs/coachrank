"use client";

import { memo, useEffect, useRef, useState } from "react";
import { emptyQotd, QOTD_EXAMPLE, QOTD_QUOTE_LIMIT, qotdCaption, validateQotd, type QotdArtwork, type QotdInput, type QotdRecord } from "@/lib/qotd";
import { downloadQotd, renderQotd } from "@/lib/qotd-canvas";

const QuotePreview = memo(function QuotePreview({ item, small = false }: { item: QotdArtwork; small?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([item.quote, item.author, item.role, item.date, small]);
  const [result, setResult] = useState({ key: "", error: "" });
  useEffect(() => {
    let active = true;
    void renderQotd({ quote: item.quote, author: item.author, role: item.role, date: item.date }, small ? 0.3 : 1).then(canvas => {
      if (!active || !ref.current) return;
      ref.current.width = canvas.width;
      ref.current.height = canvas.height;
      ref.current.getContext("2d")?.drawImage(canvas, 0, 0);
      setResult({ key, error: "" });
    }).catch(error => { if (active) setResult({ key, error: error instanceof Error ? error.message : "Could not draw this quote." }); });
    return () => { active = false; };
  }, [key, item.quote, item.author, item.role, item.date, small]);
  return <div className="qotd-artwork" aria-busy={key !== result.key}>
    <canvas ref={ref} width={small ? 324 : 1080} height={small ? 405 : 1350} role="img" aria-label={`Quote of the day: ${item.quote}${item.author ? ` By ${item.author}.` : ""}`} style={{ opacity: key === result.key && !result.error ? 1 : 0 }} />
    {(key !== result.key || result.error) && <p className="qotd-artwork-state" role={result.error ? "alert" : "status"}>{key !== result.key ? "Setting the type…" : result.error}</p>}
  </div>;
});

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function QotdWorkspace({ initialQuotes, onCreatePost }: { initialQuotes: QotdRecord[]; onCreatePost: (quote: QotdRecord) => void }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [editor, setEditor] = useState<QotdInput | null>(null);
  const [savedVersion, setSavedVersion] = useState("");
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [limit, setLimit] = useState(12);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLFormElement>(null);
  const dirty = !!editor && JSON.stringify(editor) !== savedVersion;
  const filtered = quotes.filter(item => item.archived === archived && `${item.quote} ${item.author} ${item.date}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function edit(input?: QotdInput) {
    if (dirty && !window.confirm("Discard the unsaved changes to this quote?")) return;
    const item = input ? validateQotd(input) : emptyQotd(crypto.randomUUID(), localDate());
    setEditor(item); setSavedVersion(JSON.stringify(item)); setError(""); setMessage("");
    requestAnimationFrame(() => { editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); editorRef.current?.querySelector("textarea")?.focus({ preventScroll: true }); });
  }
  function update(patch: Partial<QotdInput>) { setEditor(current => current ? { ...current, ...patch } : null); setError(""); setMessage(""); }
  async function persist(input: QotdInput): Promise<QotdRecord> {
    const response = await fetch("/api/admin/qotd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validateQotd(input)) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Could not save this quote.");
    setQuotes(current => [result.record, ...current.filter(item => item.id !== result.record.id)]);
    return result.record;
  }
  async function save(download: boolean) {
    if (!editor || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const input = validateQotd(editor);
      // Catch layout errors before saving a card that cannot be exported.
      await renderQotd(input);
      const saved = await persist(input);
      const next = validateQotd(saved);
      setEditor(next); setSavedVersion(JSON.stringify(next));
      setMessage("Saved to your QOTD library.");
      if (download) { await downloadQotd(saved); setMessage("Saved. Your 1080 × 1350 PNG download is ready."); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save. Your text is still here."); }
    finally { setBusy(false); }
  }
  async function download(item: QotdArtwork) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await downloadQotd(item); setMessage("Your full-resolution PNG download is ready."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not download. Please try again."); }
    finally { setBusy(false); }
  }
  async function archive(item: QotdRecord) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await persist({ ...item, archived: !item.archived });
      if (editor?.id === saved.id) {
        setEditor(current => current ? { ...current, archived: saved.archived, revision: saved.revision } : null);
        setSavedVersion(JSON.stringify(validateQotd(saved)));
      }
      setMessage(saved.archived ? "Moved to the archive. You can restore it anytime." : "Restored to your QOTD library.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update this quote."); }
    finally { setBusy(false); }
  }
  async function copy(item: QotdArtwork) {
    try { await navigator.clipboard.writeText(qotdCaption(item)); setMessage("Caption copied. Add your downloaded image when you post on X."); }
    catch { setError("Clipboard is unavailable. Open the quote to select and copy its text."); }
  }

  return <section className="qotd-workspace" aria-label="Quote of the day studio">
    <div className="qotd-heading"><div><p className="journal-label">One thought. A little perspective.</p><h2>Words worth keeping<span>.</span></h2><p>Your daily dose of CoachRank blue. Write it, make it yours, share it.</p></div><button className="tool-button" disabled={busy} onClick={() => edit()}>+ Create QOTD</button></div>
    <p className="social-feedback" role="status">{message}</p>
    {error && <p className="social-error" role="alert">{error}</p>}

    {editor ? <div className="qotd-editor-layout">
      <form className="qotd-form" ref={editorRef} onSubmit={event => { event.preventDefault(); void save(true); }}>
        <div className="qotd-form-title"><p className="journal-label">{editor.revision ? "Edit your quote" : "A fresh perspective"}</p><span>{dirty ? "Unsaved changes" : editor.revision ? "Saved to Studio" : "New card"}</span></div>
        <fieldset disabled={busy}>
          <label htmlFor="qotd-quote">The quote</label>
          <textarea id="qotd-quote" required rows={6} maxLength={QOTD_QUOTE_LIMIT} placeholder={QOTD_EXAMPLE.quote} value={editor.quote} onChange={event => update({ quote: event.target.value })} aria-describedby="qotd-type-help" />
          <div className="qotd-type-help" id="qotd-type-help"><span>Type fits automatically. Enter adds a line break.</span><span>{editor.quote.length}/{QOTD_QUOTE_LIMIT}</span></div>
          <label htmlFor="qotd-author">Who said it? <span>Optional</span></label>
          <input id="qotd-author" maxLength={90} placeholder="Name or CoachRank" value={editor.author} onChange={event => update({ author: event.target.value })} />
          <label htmlFor="qotd-role">Role or description <span>Optional</span></label>
          <input id="qotd-role" maxLength={100} placeholder="Author, founder, or an original perspective" value={editor.role} onChange={event => update({ role: event.target.value })} />
          <label htmlFor="qotd-date">Planned posting date <span>Optional</span></label>
          <div className="qotd-date-field"><input id="qotd-date" type="date" value={editor.date} aria-describedby="qotd-date-help" onChange={event => update({ date: event.target.value })} /><button type="button" disabled={!editor.date} onClick={() => update({ date: "" })}>Clear</button></div>
          <p id="qotd-date-help" className="social-field-note">For your library and X drafts only. The date is not printed on the image.</p>
          <details className="qotd-reference"><summary>Keep a source reference</summary><label htmlFor="qotd-source">Source URL</label><input id="qotd-source" type="url" maxLength={2000} placeholder="https://" value={editor.sourceUrl} onChange={event => update({ sourceUrl: event.target.value })} /><p>Saved in Studio for your reference. It will not appear on the artwork.</p></details>
          <div className="qotd-actions"><button className="tool-button" disabled={!editor.quote.trim()} type="submit">{busy ? "Preparing your card…" : "Save & download PNG ↓"}</button><button className="tool-text-link" disabled={!editor.quote.trim()} type="button" onClick={() => void save(false)}>Save to library</button></div>
          <p className="qotd-export-note">1080 × 1350 px · PNG · CoachRank typography<br/>Your blue template. Every word, crisp and ready to share.</p>
        </fieldset>
        <button type="button" className="qotd-close" disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard the unsaved changes to this quote?")) setEditor(null); }}>Back to library</button>
      </form>
      <aside className="qotd-preview"><div className="qotd-preview-label"><span>{editor.quote.trim() ? "Live preview" : "Example preview"}</span><span>4:5 portrait</span></div><QuotePreview item={editor.quote.trim() ? editor : { ...QOTD_EXAMPLE, date: editor.date }} /><p>The downloaded image matches this preview.</p></aside>
    </div> : <div className="qotd-introduction"><div className="qotd-introduction-copy"><span className="qotd-big-quote" aria-hidden="true">“</span><h3>A small ritual.<br/>A recognisable voice.</h3><p>A thought that makes someone pause is a good place to start. Your signature blue and bold CoachRank type do the rest.</p><div className="qotd-steps"><span><b>01</b> Add your words</span><span><b>02</b> See the card</span><span><b>03</b> Download & share</span></div><button className="tool-text-link" onClick={() => edit({ ...emptyQotd(crypto.randomUUID(), localDate()), ...QOTD_EXAMPLE, date: localDate() })}>Start with this original CoachRank quote ↗</button></div><div className="qotd-introduction-art"><QuotePreview item={QOTD_EXAMPLE}/></div></div>}

    <div className="qotd-library-heading"><div><p className="journal-label">Your collection</p><h3>{archived ? "The archive." : "Ready for another day."}</h3></div><label className="qotd-archive-toggle"><input type="checkbox" checked={archived} onChange={event => { setArchived(event.target.checked); setLimit(12); }} />Show archive</label></div>
    <div className="qotd-search"><label htmlFor="qotd-search" className="sr-only">Search quotes</label><input id="qotd-search" placeholder="Find a quote, a name or a date…" value={search} onChange={event => { setSearch(event.target.value); setLimit(12); }} /><span>{filtered.length} {filtered.length === 1 ? "quote" : "quotes"}</span></div>
    {initialQuotes.length >= 1000 && <p className="social-notice">Showing the 1,000 most recently updated quotes.</p>}
    <div className="qotd-library">{filtered.slice(0, limit).map(item => <article className="qotd-saved-card" key={item.id}>
      <button className="qotd-card-open" aria-label={`Edit quote: ${item.quote}`} disabled={busy} onClick={() => edit(item)}><QuotePreview item={item} small/></button>
      <div className="qotd-saved-body"><p className="journal-label">{item.date || "An everyday perspective"}</p><h4>{item.author || "Quote of the day"}</h4><p className="qotd-saved-quote">{item.quote}</p><div className="qotd-saved-actions"><button disabled={busy} onClick={() => edit(item)}>Edit</button><button disabled={busy} onClick={() => void download(item)}>Download PNG ↓</button><button onClick={() => void copy(item)}>Copy caption</button><button disabled={busy} onClick={() => onCreatePost(item)}>Use in X draft ↗</button><button disabled={busy} onClick={() => void archive(item)}>{item.archived ? "Restore" : "Archive"}</button></div></div>
    </article>)}</div>
    {!filtered.length && <div className="qotd-library-empty"><p>{search ? "No quotes match this search." : archived ? "Nothing in the archive." : "Your first quote starts a collection."}</p><span>{search ? "Try another name or phrase." : "Saved cards stay here, ready to edit and download again."}</span></div>}
    {filtered.length > limit && <button className="tool-text-link qotd-show-more" onClick={() => setLimit(value => value + 12)}>Show more quotes ↓</button>}
  </section>;
}
