import { AdminForm } from "@/components/admin/AdminForm";
import { updatePricingAction } from "@/lib/domain/admin-actions";
import { getPricing } from "@/lib/domain/settings";
import { centsToDollarString } from "@/lib/money";

export const dynamic = "force-dynamic";

const FIELDS = [
  {
    name: "minNewBidCents",
    label: "Minimum new bid",
    hint: "The floor for a brand-new listing.",
  },
  {
    name: "topPositionIncrementCents",
    label: "#1 increment",
    hint: "How far above the current #1 a challenger must go to take the top spot.",
  },
  {
    name: "standardIncrementCents",
    label: "Standard increment",
    hint: "The step needed to pass any position other than #1.",
  },
  {
    name: "premiumSpotlightCents",
    label: "Premium Spotlight",
    hint: "Price for 24 hours in the premium advertisement slot.",
  },
  {
    name: "standardSpotlightCents",
    label: "Spotlight",
    hint: "Price for 24 hours in the standard advertisement slot.",
  },
] as const;

export default async function AdminSettingsPage() {
  const pricing = await getPricing();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1.5 text-[14px] text-ink-3">
        These take effect immediately for new checkouts. Changing them never alters a standing bid
        that has already been paid for.
      </p>

      <AdminForm action={updatePricingAction} className="card mt-6 p-5">
        {FIELDS.map((field) => (
          <div key={field.name} className="mb-4 last:mb-0">
            <label htmlFor={field.name} className="block text-[13px] font-medium">
              {field.label}
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <span aria-hidden="true" className="text-ink-3">
                $
              </span>
              <input
                id={field.name}
                name={field.name}
                className="field tnum"
                inputMode="decimal"
                defaultValue={centsToDollarString(pricing[field.name])}
                required
              />
            </div>
            <p className="mt-1 text-[12px] text-ink-3">{field.hint}</p>
          </div>
        ))}

        <button type="submit" className="btn btn-primary mt-2 px-5 py-2.5 text-[13px]">
          Save pricing
        </button>
      </AdminForm>
    </div>
  );
}
