import { AdminForm } from "@/components/admin/AdminForm";
import { CATEGORIES } from "@/lib/categories";
import { setListingStatusAction, updateListingAction } from "@/lib/domain/admin-actions";
import { listAllListings } from "@/lib/domain/listings";
import { formatCents, formatCount } from "@/lib/money";
import { prettyWebsite } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage() {
  const listings = await listAllListings(300);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Coaches</h1>
      <p className="mt-1.5 max-w-2xl text-[14px] text-ink-3">
        Fix a typo, re-file a category, hide or restore. Standing bids, payments and click totals
        are derived from verified payments and cannot be edited here.
      </p>

      {listings.length === 0 ? (
        <p className="card mt-6 p-6 text-[14px] text-ink-3">No listings yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {listings.map((listing) => (
            <li key={listing.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-[15px] font-bold">{listing.name}</p>
                <span className="flex items-center gap-2 text-[12px] text-ink-3">
                  <span
                    className={`pill ${
                      listing.status === "active"
                        ? "border-accent"
                        : listing.status === "hidden"
                          ? "border-line-2"
                          : ""
                    }`}
                  >
                    {listing.status}
                  </span>
                  <span className="tnum">{formatCents(listing.standingBidCents)}</span>
                  <span className="tnum">{formatCount(listing.totalClicks)} clicks</span>
                </span>
              </div>

              <p className="mt-1 text-[12.5px] text-ink-3">
                {prettyWebsite(listing.displayWebsite)} · /r/{listing.slug}
              </p>

              <AdminForm action={updateListingAction} className="mt-3">
                <input type="hidden" name="id" value={listing.id} />
                <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                  <label className="sr-only" htmlFor={`name-${listing.id}`}>
                    Name
                  </label>
                  <input
                    id={`name-${listing.id}`} name="name"
                    className="field"
                    defaultValue={listing.name}
                  />
                  <label className="sr-only" htmlFor={`cat-${listing.id}`}>
                    Category
                  </label>
                  <select
                    id={`cat-${listing.id}`} name="category"
                    className="field"
                    defaultValue={listing.category}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="sr-only" htmlFor={`bio-${listing.id}`}>
                  Bio
                </label>
                <textarea
                  id={`bio-${listing.id}`} name="bio"
                  rows={2}
                  className="field mt-2 resize-none"
                  defaultValue={listing.bio}
                />
                <button type="submit" className="btn btn-ghost mt-2 px-4 py-1.5 text-[12.5px]">
                  Save
                </button>
              </AdminForm>

              {listing.status !== "pending" ? (
                <AdminForm action={setListingStatusAction} className="mt-2">
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="status"
                    value={listing.status === "hidden" ? "active" : "hidden"}
                  />
                  <button type="submit" className="btn btn-ghost px-4 py-1.5 text-[12.5px]">
                    {listing.status === "hidden" ? "Restore" : "Hide"}
                  </button>
                </AdminForm>
              ) : (
                <p className="mt-2 text-[12px] text-ink-3">
                  Awaiting a verified payment — it will publish itself.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
