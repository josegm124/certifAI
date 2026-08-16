import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Answers, Answer } from "../lib/scoring";
import type { AssessmentRecord, FinalizationResponse, Profile } from "../lib/api";
import { QUESTIONS } from "../lib/data";

interface CertState {
  authStatus: "loading" | "authenticated" | "anonymous";
  profile: Profile | null;
  org: string; email: string; role: string;
  aiSystemName: string;
  answers: Answers;
  dirtyDomains: string[];
  signed: boolean;
  seeded: boolean;
  userId: string | null;
  assessmentId: string | null;
  assessment: AssessmentRecord | null;
  server: FinalizationResponse | null;
  setAuth: (profile: Profile | null) => void;
  setAssessment: (assessment: AssessmentRecord | null, preserveDirty?: boolean) => void;
  setOrg: (v: string) => void; setEmail: (v: string) => void; setRole: (v: string) => void;
  setAiSystemName: (v: string) => void;
  setAnswer: (qid: number, patch: Answer) => void;
  markDomainSynced: (domainId: string) => void;
  setSigned: (v: boolean) => void;
  setIdentity: (userId: string, assessmentId: string) => void;
  setServer: (r: FinalizationResponse | null) => void;
  clearAssessment: () => void;
  reset: () => void;
  loadSample: () => void;
}

const fromServer = (record: AssessmentRecord): Answers => Object.fromEntries(
  Object.entries(record.answers).map(([id, answer]) => [Number(id), {
    score: answer.score, detail: answer.evidence, attested: Boolean(answer.attestation),
  }])
);

export const useStore = create<CertState>()(persist((set, get) => ({
  authStatus: "loading", profile: null, org: "", email: "", role: "",
  aiSystemName: "", answers: {}, dirtyDomains: [], signed: false, seeded: false,
  userId: null, assessmentId: null, assessment: null, server: null,
  setAuth: (profile) => set({
    authStatus: profile ? "authenticated" : "anonymous", profile,
    userId: profile?.id || null, org: profile?.company.name || "",
    email: profile?.email || "", role: profile?.role || "",
  }),
  setAssessment: (assessment, preserveDirty = true) => {
    const local = get();
    const dirtyAnswers = preserveDirty ? Object.fromEntries(Object.entries(local.answers).filter(([id]) => {
      const domain = QUESTIONS.find((q) => q.id === Number(id))?.domain;
      return domain && local.dirtyDomains.includes(domain);
    })) : {};
    set({ assessment, assessmentId: assessment?.id || null,
      aiSystemName: assessment?.aiSystem.name || "", answers: assessment ? { ...fromServer(assessment), ...dirtyAnswers } : dirtyAnswers,
      dirtyDomains: preserveDirty ? local.dirtyDomains : [], signed: false, server: null });
  },
  setOrg: (org) => set({ org }), setEmail: (email) => set({ email }), setRole: (role) => set({ role }),
  setAiSystemName: (aiSystemName) => set({ aiSystemName }),
  setAnswer: (qid, patch) => set((state) => {
    const domain = QUESTIONS.find((q) => q.id === qid)?.domain;
    return { answers: { ...state.answers, [qid]: { ...state.answers[qid], ...patch } },
      dirtyDomains: domain && !state.dirtyDomains.includes(domain) ? [...state.dirtyDomains, domain] : state.dirtyDomains,
      server: null };
  }),
  markDomainSynced: (domainId) => set((state) => ({ dirtyDomains: state.dirtyDomains.filter((id) => id !== domainId) })),
  setSigned: (signed) => set({ signed }),
  setIdentity: (userId, assessmentId) => set({ userId, assessmentId }),
  setServer: (server) => set({ server }),
  clearAssessment: () => set({ aiSystemName: "", answers: {}, dirtyDomains: [], signed: false, assessmentId: null, assessment: null, server: null }),
  reset: () => set({ authStatus: "anonymous", profile: null, org: "", email: "", role: "", userId: null, aiSystemName: "", answers: {}, dirtyDomains: [], signed: false, seeded: false, assessmentId: null, assessment: null, server: null }),
  loadSample: () => undefined,
}), {
  name: "certifai-v3",
  partialize: (state) => ({
    assessmentId: state.assessmentId,
    dirtyDomains: state.dirtyDomains,
    answers: Object.fromEntries(Object.entries(state.answers).filter(([id]) => {
      const domain = QUESTIONS.find((q) => q.id === Number(id))?.domain;
      return domain && state.dirtyDomains.includes(domain);
    })),
  }),
}));

export function hasEvidence(answers: Answers): boolean {
  return Object.values(answers).some((a) => a.attested || Boolean(a.detail?.trim()));
}
