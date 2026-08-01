/* ==============================================================================
   Subscription plans — the frontend's single source for plan ids and prices.

   MUST MIRROR TIER_PRICING in backend/src/services/SubscriptionService.js:5-10
   and TIERS in backend/src/domain/entities.js:4-10.

   This is a mirror, not a shared module: the backend is a separate CommonJS
   package, so there is no import path between them today. That means these
   numbers can drift from the server's, exactly as the two LEVELS tables already
   do. The fix is to lift the table into one file both packages read; that is a
   change to backend pricing and was left out of scope here deliberately.

   Components import from THIS file rather than typing prices inline, so a
   correction lands in one place on this side.

   Prices are annual, in euro. `free` is 0 and is intentionally in the list —
   it is a plan, not the absence of one.
   ============================================================================== */

export const TIER_IDS = ["free", "starter", "professional", "enterprise"] as const;

export type TierId = (typeof TIER_IDS)[number];

export const TIER_PRICING: Record<TierId, number> = {
  free: 0,
  starter: 490,
  professional: 1490,
  enterprise: 3500,
};

export interface Plan {
  id: TierId;
  priceEur: number;
}

/** The four plans in ladder order, derived from the table above. */
export const PLANS: Plan[] = TIER_IDS.map((id) => ({ id, priceEur: TIER_PRICING[id] }));
