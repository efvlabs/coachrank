import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProfileEditor } from "@/components/ProfileEditor";
import { iconUrl } from "@/lib/favicon";
import { listingForEditToken } from "@/lib/domain/profile";
import { prettyWebsite } from "@/lib/url";

export const dynamic = "force-dynamic";

// An edit link is a secret. It must never be indexed, and never sit in a search result.
export const metadata: Metadata = {
  title: "Edit your listing",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = await searchParams;
  const token = String(Array.isArray(search.t) ? search.t[0] : (search.t ?? ""));

  const owner = await listingForEditToken(slug, token);
  if (!owner) notFound();

  const { listing } = owner;
  const host = prettyWebsite(listing.displayWebsite).split("/")[0];

  return (
    <div className="mx-auto max-w-[640px] px-5 py-14 sm:px-8">
      <header>
        <p className="eyebrow">Your listing</p>
        <h1 className="display mt-2 text-[clamp(1.8rem,5vw,2.5rem)] leading-none">
          {listing.name}
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          Add a photo and a few words about who you work with. This is the page people find
          when they search your name.
        </p>
      </header>

      <div className="mt-8">
        <ProfileEditor
          slug={listing.slug}
          token={token}
          name={listing.name}
          initialBio={listing.bio}
          photoUrl={iconUrl(host, listing.name, 176, listing.id)}
        />
      </div>

      <section className="mt-8 border-t border-line pt-5">
        <p className="text-[13px] leading-relaxed text-ink-3">
          Nothing on this page changes your rank. Rank is bought and only a confirmed payment
          moves it - see the <Link href="/rules">Rules</Link>. Keep this link private: anyone
          who has it can edit your listing.
        </p>
        <Link href={`/r/${listing.slug}`} className="buy mt-3 inline-block">
          View your public page →
        </Link>
      </section>
    </div>
  );
}
