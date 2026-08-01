/* ==============================================================================
   Upgrade — the plans, visible, with no transaction behind them.

   Checkout is deliberately inert. Clicking a plan states that and does nothing
   else. In particular this page does NOT call
   POST /api/companies/:companyId/upgrade-tier: that route persists nothing
   (its subscription repository is a stub in index.js), throws on newTier
   "free", and records the previous tier incorrectly. It must stay uncalled
   until it is rebuilt.

   Prices come from lib/pricing.ts, never typed here. Plan titles and button
   labels are derived from the plan id rather than written out four times, so
   adding a plan to the table is enough to list it here.
   ============================================================================== */
import { useState } from "react";
import { PLANS, type TierId } from "../lib/pricing";

const CHECKOUT_DISABLED =
  "Checkout is not enabled in this build. Subscription and payment are specified and not implemented.";

/** "professional" -> "Professional". The id is the single source for the label. */
const planName = (id: TierId): string => id.charAt(0).toUpperCase() + id.slice(1);

export default function Upgrade() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <main className="wrap wrap-wide">
      <h1 className="h1">Certification plans</h1>
      <p className="lead">Certification is priced per plan. The assessment is always free.</p>

      <div className="pricing">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === "free";
          return (
            <div key={plan.id} className="price">
              <div className="price-name">{planName(plan.id)}</div>
              <div className="price-cost"><b>€{plan.priceEur}</b></div>
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={isCurrent}
                onClick={() => setShowNotice(true)}
              >
                {isCurrent ? "Current plan" : `Choose ${planName(plan.id)}`}
              </button>
            </div>
          );
        })}
      </div>

      {showNotice && (
        <p className="sec-note" style={{ marginTop: 18 }} role="status">{CHECKOUT_DISABLED}</p>
      )}
    </main>
  );
}
