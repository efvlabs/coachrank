"use client";

import { useRef, useState } from "react";

import { MAX_BIO_WORDS, countWords } from "@/lib/bio";

type Props = {
  slug: string;
  token: string;
  name: string;
  initialBio: string;
  photoUrl: string;
};

/**
 * What a coach can change about themselves: their own words and their own face. There is
 * nothing here that moves a rank, and the page says so, because that is the one thing
 * people will look for.
 */
export function ProfileEditor({ slug, token, name, initialBio, photoUrl }: Props) {
  const [bio, setBio] = useState(initialBio);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const words = countWords(bio);
  const overLong = words > MAX_BIO_WORDS;

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    if (!file) return setPreview(null);
    if (file.size > 6 * 1024 * 1024) {
      setError("That image is too large. Keep it under 6MB.");
      event.target.value = "";
      return setPreview(null);
    }
    setPreview(URL.createObjectURL(file));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (overLong) return setError(`Keep it to ${MAX_BIO_WORDS} words or fewer.`);

    setSaving(true);
    const body = new FormData();
    body.set("slug", slug);
    body.set("token", token);
    body.set("bio", bio);
    const file = fileRef.current?.files?.[0];
    if (file) body.set("photo", file);

    try {
      const response = await fetch("/api/profile", { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Could not save. Try again.");
        setSaving(false);
        return;
      }
      setSaved(true);
      setSaving(false);
      // The new photo is served from our own endpoint, so a reload is what shows it.
      if (file) setTimeout(() => window.location.reload(), 700);
    } catch {
      setError("Could not reach us. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview ?? photoUrl}
          alt=""
          width={88}
          height={88}
          className="h-[88px] w-[88px] shrink-0 rounded-2xl object-cover"
        />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">{name}</p>
          <label className="btn btn-quiet mt-2 inline-flex cursor-pointer px-4 py-1.5 text-[13px]">
            {preview ? "Choose another" : "Choose a photo"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={choosePhoto}
              className="sr-only"
            />
          </label>
          <p className="meta mt-2">Square works best. We crop and resize it for you.</p>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="eyebrow">About you</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Who you work with, and what you help them do."
          className="field mt-1 resize-none"
        />
      </label>
      <p className={`meta mt-1.5 ${overLong ? "text-flag" : ""}`}>
        {words} of {MAX_BIO_WORDS} words
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-[13.5px] font-medium text-flag">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className="btn btn-primary px-6 py-2.5">
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && !saving ? <span className="meta text-accent">Saved.</span> : null}
      </div>
    </form>
  );
}
