"use client";

import { useState } from "react";

import { CATEGORIES, type CategorySlug } from "@/lib/categories";

type State = "idle" | "sending" | "submitted" | "already";

/**
 * Free enrolment. Deliberately three fields and no payment step - the point is to be the
 * easiest yes a coach gets all week, and the ranking conversation happens later.
 */
export function EnrollForm() {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState<CategorySlug | "">("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setState("sending");
    try {
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, website, category }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setState("idle");
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      setState(data.status === "already_submitted" ? "already" : "submitted");
    } catch {
      setState("idle");
      setError("Could not reach us. Check your connection and try again.");
    }
  }

  if (state === "submitted" || state === "already") {
    return (
      <div className="card p-8 text-center">
        <h2 className="display text-[26px] leading-tight">
          {state === "already" ? "Already with us" : "Got it."}
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">
          {state === "already"
            ? "That website is already waiting to be reviewed. We read every one by hand, so it will not be missed."
            : "We read every request by hand, so it may take a day or two. Once it is approved your page goes live and you can put the rank badge on your site."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Your name</span>
          <input
            className="field mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sarah Chen"
            required
          />
        </label>
        <label className="block">
          <span className="eyebrow">Your website</span>
          <input
            className="field mt-1"
            inputMode="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="yourname.com"
            required
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="eyebrow">Category</span>
        <select
          className="field mt-1"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategorySlug)}
          required
        >
          <option value="">Pick one</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-[13.5px] font-medium text-flag">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "sending"}
        className="btn btn-primary mt-5 w-full px-6 py-3"
      >
        {state === "sending" ? "Sending…" : "Get listed - free"}
      </button>

      <p className="meta mt-3 text-center">
        Free, and reviewed by a person. Being listed is not a rank - ranking is bought.
      </p>
    </form>
  );
}
