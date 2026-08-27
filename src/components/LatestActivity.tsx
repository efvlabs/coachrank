"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SectionHeading } from "./SectionHeading";
import { getClientDb, isClientFirebaseConfigured } from "@/lib/firebase/client";
import { relativeTime } from "@/lib/format";
import { formatCents } from "@/lib/money";
import type { ActivityEvent } from "@/lib/domain/types";

const PREVIEW = 6;
const EXPANDED = 20;

type Props = {
  initialEvents: ActivityEvent[];
  /** The server's clock, so the first client paint matches the SSR output. */
  nowMs: number;
};

/**
 * The tape. Written only by verified payments - if it is empty, nobody has paid. Where the
 * browser has Firebase config it also subscribes live, so a payment landing anywhere in the
 * world prints here without a refresh.
 */
export function LatestActivity({ initialEvents, nowMs }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(nowMs);
  const seen = useRef(new Set(initialEvents.map((e) => e.id)));
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isClientFirebaseConfigured()) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const db = await getClientDb();
      if (!db || cancelled) return;
      const { collection, limit, onSnapshot, orderBy, query, where } =
        await import("firebase/firestore");
      if (cancelled) return;

      unsubscribe = onSnapshot(
        query(
          collection(db, "activityEvents"),
          where("visible", "==", true),
          orderBy("createdAt", "desc"),
          limit(EXPANDED),
        ),
        (snapshot) => {
          const next: ActivityEvent[] = snapshot.docs.map((doc) => {
            const d = doc.data() as Record<string, unknown>;
            const createdAt = d.createdAt as { toMillis?: () => number } | undefined;
            return {
              id: doc.id,
              type: "bid",
              listingId: String(d.listingId ?? ""),
              listingSlug: String(d.listingSlug ?? ""),
              coachName: String(d.coachName ?? ""),
              category: d.category as ActivityEvent["category"],
              displayWebsite: String(d.displayWebsite ?? ""),
              paymentIncrementCents: Number(d.paymentIncrementCents ?? 0),
              resultingStandingBidCents: Number(d.resultingStandingBidCents ?? 0),
              resultingOverallRank: Number(d.resultingOverallRank ?? 0),
              resultingCategoryRank: Number(d.resultingCategoryRank ?? 0),
              createdAtMs: createdAt?.toMillis?.() ?? Date.now(),
            };
          });

          const arrived = next.filter((e) => !seen.current.has(e.id)).map((e) => e.id);
          next.forEach((e) => seen.current.add(e.id));
          setEvents(next);
          if (arrived.length) {
            setFresh(new Set(arrived));
            setTimeout(() => setFresh(new Set()), 1400);
          }
        },
        (error) => console.error("[activity] live subscription failed:", error),
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const visible = useMemo(
    () => events.slice(0, expanded ? EXPANDED : PREVIEW),
    [events, expanded],
  );

  if (events.length === 0) return null;

  return (
    <section aria-labelledby="tape" className="mt-10">
      <SectionHeading id="tape" title="Latest" live />

      <ol className="mt-3 space-y-1.5">
        {visible.map((event) => (
          <li key={event.id} className={fresh.has(event.id) ? "lift" : ""}>
            <Link
              href={`/r/${event.listingSlug}`}
              className="flex items-center gap-3 rounded-full px-3 py-2 text-[13.5px] transition-colors hover:bg-tint"
            >
              <span className="tnum w-9 shrink-0 rounded-full bg-tint py-0.5 text-center text-[12px] font-bold text-accent">
                #{event.resultingOverallRank}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">
                {event.coachName}
              </span>
              <span className="tnum shrink-0 font-semibold text-accent">
                +{formatCents(event.paymentIncrementCents)}
              </span>
              <span className="tnum hidden w-20 shrink-0 text-right text-ink-3 sm:block">
                {formatCents(event.resultingStandingBidCents)}
              </span>
              <span className="w-20 shrink-0 text-right text-[12px] text-ink-3">
                {relativeTime(event.createdAtMs, now)}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {events.length > PREVIEW ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="buy mt-3">
          {expanded ? "Show less" : `Show ${Math.min(events.length, EXPANDED) - PREVIEW} more`}
        </button>
      ) : null}
    </section>
  );
}
