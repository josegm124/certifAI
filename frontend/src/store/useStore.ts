import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Answers, Answer } from "../lib/scoring";
import type { ServerResult } from "../lib/api";
import { SAMPLE_ANSWERS, SAMPLE_ORG } from "../lib/sampleData";

interface CertState {
  org: string;
  email: string;
  role: string;
  tier: 1 | 2;
  answers: Answers;
  /** whether the Tier-2 self-certification has been signed */
  signed: boolean;
  seeded: boolean;

  /* --- backend identity, so a re-submit reuses the same assessment --- */
  userId: string | null;
  assessmentId: string | null;

  /* --- the server's verdict. This, not the local engine, is the badge. --- */
  server: ServerResult | null;

  setOrg: (org: string) => void;
  setEmail: (email: string) => void;
  setRole: (role: string) => void;
  setTier: (tier: 1 | 2) => void;
  setAnswer: (qid: number, patch: Answer) => void;
  setSigned: (v: boolean) => void;
  setIdentity: (userId: string, assessmentId: string) => void;
  setServer: (r: ServerResult | null) => void;
  reset: () => void;
  loadSample: () => void;
}

export const useStore = create<CertState>()(
  persist(
    (set) => ({
      org: "",
      email: "",
      role: "",
      tier: 1,
      answers: {},
      signed: false,
      seeded: false,
      userId: null,
      assessmentId: null,
      server: null,

      setOrg: (org) => set({ org }),
      setEmail: (email) => set({ email }),
      setRole: (role) => set({ role }),
      setTier: (tier) => set({ tier }),
      // Any change to an answer invalidates the server's verdict — the badge
      // on screen must never outlive the answers it was issued against.
      setAnswer: (qid, patch) =>
        set((s) => ({ answers: { ...s.answers, [qid]: { ...s.answers[qid], ...patch } }, server: null })),
      setSigned: (signed) => set({ signed }),
      setIdentity: (userId, assessmentId) => set({ userId, assessmentId }),
      setServer: (server) => set({ server }),
      reset: () =>
        set({ org: "", email: "", role: "", tier: 1, answers: {}, signed: false, seeded: false, userId: null, assessmentId: null, server: null }),
      // signed:false on purpose — the sample should walk the signature and
      // certification step, not skip past the part where the badge is earned.
      loadSample: () =>
        set({ org: SAMPLE_ORG, tier: 2, answers: SAMPLE_ANSWERS, signed: false, seeded: true, server: null }),
    }),
    /* Rehydration is SYNCHRONOUS, and route guards depend on that being true.
       zustand 4.5.7 defaults `storage` to createJSONStorage(() => localStorage);
       localStorage.getItem returns a string, never a Promise, so persist's
       toThenable() runs the rehydration callback inline. `skipHydration` is not
       set, so hydrate() runs during store creation — i.e. while this module is
       evaluated, before React renders anything.

       Consequence: a component may read persisted state on its FIRST render.
       RequireIntake relies on this; if the storage here is ever swapped for an
       async one, that guard must start waiting on onFinishHydration or it will
       bounce returning users to /start and discard their run. */
    { name: "certifai-v2" }
  )
);

/** Whether the user has any usable evidence attested. */
export function hasEvidence(answers: Answers): boolean {
  return Object.values(answers).some((a) => a.attested || (a.detail && a.detail.trim().length > 0));
}
