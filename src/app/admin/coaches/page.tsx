import { AdminForm } from "@/components/admin/AdminForm";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { IconButton } from "@/components/admin/IconButton";
import { CATEGORIES } from "@/lib/categories";
import {
  addCoachAction,
  decideEnrolmentAction,
  deleteUnpaidListingAction,
  setListingStatusAction,
  updateListingAction,
} from "@/lib/domain/admin-actions";
import { getSubmittedListings, listAllListings } from "@/lib/domain/listings";
import { formatCents, formatCount } from "@/lib/money";
import { prettyWebsite } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage() {
  const [listings, queue] = await Promise.all([listAllListings(300), getSubmittedListings()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Coaches</h1>
      <p className="mt-1.5 max-w-2xl text-[14px] text-ink-3">
        Fix a typo, re-file a category, hide or restore. Standing bids, payments and click totals
        are derived from verified payments and cannot be edited here.
      </p>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold">
          Waiting on you{queue.length > 0 ? ` · ${queue.length}` : ""}
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-3">
          Free enrolments. Approving puts a coach in the grid, unranked - it is not a rank and
          costs them nothing. Declining hides the record so the same site cannot re-apply on a
          loop.
        </p>

        {queue.length === 0 ? (
          <p className="card mt-3 p-5 text-[13.5px] text-ink-3">Nothing waiting.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {queue.map((coach) => (
              <li key={coach.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{coach.name}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                    <a href={coach.displayWebsite} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-ink">
                      {prettyWebsite(coach.displayWebsite)}
                    </a>
                    {" · "}
                    {CATEGORIES.find((c) => c.slug === coach.category)?.label ?? coach.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminForm action={decideEnrolmentAction}>
                    <input type="hidden" name="id" value={coach.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button type="submit" className="btn btn-primary px-4 py-1.5 text-[12.5px]">
                      Approve
                    </button>
                  </AdminForm>
                  <AdminForm action={decideEnrolmentAction}>
                    <input type="hidden" name="id" value={coach.id} />
                    <input type="hidden" name="decision" value="decline" />
                    <button type="submit" className="btn btn-ghost px-4 py-1.5 text-[12.5px] text-flag">
                      Decline
                    </button>
                  </AdminForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold">Add a coach directly</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-3">
          For someone you approached rather than someone who found the form. Skips the queue and
          goes straight into the grid.
        </p>
        <AdminForm action={addCoachAction} className="card mt-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="eyebrow">Name</span>
              <input name="name" className="field mt-1" placeholder="Sarah Chen" required />
            </label>
            <label className="block">
              <span className="eyebrow">Website</span>
              <input name="website" className="field mt-1" placeholder="yourname.com" required />
            </label>
            <label className="block">
              <span className="eyebrow">Category</span>
              <select name="category" className="field mt-1" required defaultValue="">
                <option value="">Pick one</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn btn-quiet mt-3 px-4 py-1.5 text-[12.5px]">
            Add to the grid
          </button>
        </AdminForm>
      </section>

      <h2 className="mt-10 text-[15px] font-semibold">Everyone</h2>

      {listings.length === 0 ? (
        <p className="card mt-4 p-6 text-[14px] text-ink-3">No listings yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line">
          {listings.map((listing) => (
            <li key={listing.id} className="bg-card">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[14px] font-semibold leading-tight">
                    <span className="truncate">{listing.name}</span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
                        listing.status === "active"
                          ? "border-accent text-accent"
                          : listing.status === "hidden"
                            ? "border-flag text-flag"
                            : "border-line-2 text-ink-3"
                      }`}
                    >
                      {listing.status}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">
                    {prettyWebsite(listing.displayWebsite)}
                    {" · "}
                    {CATEGORIES.find((c) => c.slug === listing.category)?.label ?? listing.category}
                  </p>
                </div>

                <span className="tnum shrink-0 text-[12.5px] text-ink-3">
                  {formatCents(listing.standingBidCents)} · {formatCount(listing.totalClicks)} clicks
                </span>

                <div className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={`/r/${listing.slug}`}
                    target="_blank"
                    rel="noopener"
                    title="Open the public page"
                    aria-label="Open the public page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-3 transition-colors hover:border-line-2 hover:text-ink"
                  >
                    <AdminIcon name="external" />
                  </a>

                  {listing.status !== "pending" ? (
                    <AdminForm action={setListingStatusAction}>
                      <input type="hidden" name="id" value={listing.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={listing.status === "hidden" ? "active" : "hidden"}
                      />
                      <IconButton
                        icon={listing.status === "hidden" ? "restore" : "hide"}
                        label={listing.status === "hidden" ? "Restore" : "Hide"}
                      />
                    </AdminForm>
                  ) : null}

                  <AdminForm action={deleteUnpaidListingAction}>
                    <input type="hidden" name="id" value={listing.id} />
                    <IconButton
                      icon="trash"
                      danger
                      label="Delete"
                      confirm={`Delete ${listing.name}? This cannot be undone. Only a listing nobody paid for can be removed.`}
                    />
                  </AdminForm>
                </div>
              </div>

              <details className="group border-t border-line/60 px-4 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink">
                  <AdminIcon name="edit" />
                  Edit
                </summary>

                <AdminForm action={updateListingAction} className="pb-2 pt-3">
                  <input type="hidden" name="id" value={listing.id} />
                  <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                    <label className="sr-only" htmlFor={`name-${listing.id}`}>
                      Name
                    </label>
                    <input
                      id={`name-${listing.id}`}
                      name="name"
                      className="field"
                      defaultValue={listing.name}
                    />
                    <label className="sr-only" htmlFor={`cat-${listing.id}`}>
                      Category
                    </label>
                    <select
                      id={`cat-${listing.id}`}
                      name="category"
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
                    id={`bio-${listing.id}`}
                    name="bio"
                    rows={2}
                    className="field mt-2 resize-none"
                    defaultValue={listing.bio}
                  />
                  <button type="submit" className="btn btn-ghost mt-2 px-4 py-1.5 text-[12.5px]">
                    Save
                  </button>
                </AdminForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
