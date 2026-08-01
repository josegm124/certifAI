/* ==============================================================================
   RequireIntake — the route guard for /assess and /results.

   Both were reachable by direct URL with nothing captured, so someone could
   answer the instrument, or land on a results page, with no lead behind it.

   WHAT COUNTS AS "INTAKE DONE" — three ways in, all deliberate:

   1. Server identity (userId + assessmentId). The normal path: /start called
      registerLead and the backend acknowledged.

   2. Organisation + work email held locally, WITHOUT server identity. This is
      the backend-down path. Start.tsx catches a failed registerLead, keeps the
      details, tells the user they will sync on submit, and continues into the
      assessment on purpose — the app is built to stay usable with the backend
      down. Guarding on identity alone would bounce those users straight back to
      /start, where pressing the button fails again: an infinite loop that eats
      the run. So a locally captured lead is sufficient to pass.

   3. The seeded sample profile. loadSample() sets no identity because it is a
      demo, not a lead. Guarding it out would break "See a live dashboard".

   REHYDRATION IS SYNCHRONOUS — verified, not assumed. See the store notes in
   useStore.ts. Reading the store on first render is therefore safe: a returning
   user's persisted state is already in place, and this guard cannot bounce them.
   ============================================================================== */
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "../store/useStore";

export default function RequireIntake({ children }: { children: ReactNode }) {
  const { userId, assessmentId, org, email, seeded } = useStore();

  const hasServerIdentity = Boolean(userId && assessmentId);
  const hasLocalLead = Boolean(org.trim() && email.trim());

  if (!seeded && !hasServerIdentity && !hasLocalLead) {
    return <Navigate to="/start" replace />;
  }

  return <>{children}</>;
}
