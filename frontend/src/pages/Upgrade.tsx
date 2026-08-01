/* ==============================================================================
   Upgrade — the plans, visible, with no transaction behind them.

   Checkout is deliberately inert. Clicking a plan states that and does nothing
   else. In particular this page does NOT call
   POST /api/companies/:companyId/upgrade-tier: that route persists nothing
   (its subscription repository is a stub in index.js), throws on newTier
   "free", and records the previous tier incorrectly. It must stay uncalled
   until it is rebuilt.

   Prices come from lib/pricing.ts, never typed here.

   Every visible word on this page is either a plan id from that table, a price
   from it, or the checkout sentence below. No copy has been written for this
   page yet — plan names, a heading and button labels are still to come.
   ============================================================================== */
import { useState } from "react";
import { PLANS } from "../lib/pricing";

const CHECKOUT_DISABLED =
  "Checkout is not enabled in this build. Subscription and payment are specified and not implemented.";

export default function Upgrade() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <main className="wrap wrap-wide">
      <div className="pricing">
        {PLANS.map((plan) => (
          <div key={plan.id} className="price">
            <div className="price-name">{plan.id}</div>
            <div className="price-cost"><b>€{plan.priceEur}</b></div>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setShowNotice(true)}
            >
              {plan.id}
            </button>
          </div>
        ))}
      </div>

      {showNotice && (
        <p className="sec-note" style={{ marginTop: 18 }} role="status">{CHECKOUT_DISABLED}</p>
      )}
    </main>
  );
}
