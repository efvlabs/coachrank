import { PaymentResult } from "@/components/PaymentResult";
import { categoryLabel } from "@/lib/categories";
import { getListingById } from "@/lib/domain/listings";
import { getBidPayment } from "@/lib/domain/payments";
import { getSpotlightBooking } from "@/lib/domain/spotlight";
import { computeRanks } from "@/lib/domain/listings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

export default async function SuccessPage({ searchParams }: PageProps<"/success">) {
  const params = await searchParams;
  const paymentId = typeof params.p === "string" ? params.p : undefined;
  const bookingId = typeof params.s === "string" ? params.s : undefined;

  let initial = null as Parameters<typeof PaymentResult>[0]["initial"];
  let coachName: string | null = null;
  let category: string | null = null;

  if (bookingId) {
    const booking = await getSpotlightBooking(bookingId);
    if (booking) {
      initial = {
        kind: "spotlight",
        status: booking.status,
        endsAtMs: booking.endsAtMs,
        slot: booking.slot,
      };
      coachName = booking.advertiser?.name ?? null;
    }
  } else if (paymentId) {
    const payment = await getBidPayment(paymentId);
    if (payment) {
      const listing = await getListingById(payment.listingId);
      coachName = listing?.name ?? null;
      category = listing ? categoryLabel(listing.category) : null;

      if (payment.status === "paid" && listing) {
        const ranks = await computeRanks(listing);
        initial = {
          kind: "bid",
          status: "paid",
          standingBidCents: payment.resultingStandingBidCents,
          overallRank: ranks.overallRank,
          categoryRank: ranks.categoryRank,
          slug: listing.slug,
        };
      } else {
        initial = { kind: "bid", status: payment.status };
      }
    }
  }

  return (
    <div className="mx-auto max-w-[620px] px-5 py-14 sm:px-8">
      {initial === null ? (
        <div className="py-14 text-center">
          <h1 className="display text-[clamp(1.75rem,5vw,2.5rem)] leading-none">
            No payment found
          </h1>
          <p className="mx-auto mt-4 max-w-[40ch] text-[14.5px] leading-[1.55] text-ink-2">
            If you were charged, your position updates automatically once we receive confirmation.
          </p>
        </div>
      ) : (
        <PaymentResult
          paymentId={paymentId}
          bookingId={bookingId}
          initial={initial}
          coachName={coachName}
          categoryLabel={category}
        />
      )}
    </div>
  );
}
