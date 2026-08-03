import type { Answers } from "./scoring";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  company: { id: string; name: string };
}

export interface AssessmentRecord {
  id: string;
  tier: 1 | 2;
  status: "draft" | "finalized";
  completionPercentage: number;
  overallScore: number | null;
  badgeTier: string | null;
  criticalGatingActive: boolean;
  signatoryName: string | null;
  selfCertifiedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  aiSystem: { id: string; name: string };
  answers: Record<string, { score: number; evidence: string; attestation: string }>;
}

export interface IssuedBadge {
  id: string; tier: string; score: number; verificationToken: string;
  issuedAt: string; expiresAt: string;
}

export interface OfficialResult {
  overallScore: number;
  domainScores: Array<{
    id: string; name: string; short: string; weight: number; pct: number; rawAvg: number;
    maturityLevel: number; answeredCount: number; totalCount: number;
    weakestQuestionId: number | null; weakestQuestionTitle: string | null; weakestScore: number | null;
  }>;
  frameworkCoverage: Array<{
    id: string; name: string; short: string; type: string; pct: number;
    answeredCount: number; totalCount: number;
  }>;
  gaps: Array<{
    id: number; title: string; domainId: string; domainName: string;
    score: number; critical: boolean; gapSize: number; priority: number;
  }>;
  level: ResultLevel;
  rawLevel: ResultLevel;
  cappedFrom: "A1" | "A2" | "A3" | "A4" | null;
  cappedReason: string | null;
  nextLevel: (ResultLevel & { pointsNeeded: number }) | null;
  hasEvidence: boolean;
  criticalGating: { capped: boolean; failedIds: number[] };
  completion: { answered: number; total: number; percentage: number };
}

export interface ResultLevel {
  id: "A1" | "A2" | "A3" | "A4";
  tier: string;
  name: string;
  min: number;
  max: number;
  badge: boolean;
  needsEvidence: boolean;
  needsSignature: boolean;
  blurb: string;
}

export interface FinalizationResponse {
  assessment: AssessmentRecord;
  result: OfficialResult;
  badge: IssuedBadge | null;
}

export type AssessmentDashboardResponse = FinalizationResponse;

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.error || response.statusText, data.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const register = (input: { companyName: string; email: string; password: string; name: string; role: string }) =>
  post<{ profile: Profile }>("/auth/register", input);
export const login = (email: string, password: string) => post<{ profile: Profile }>("/auth/login", { email, password });
export const logout = () => post<void>("/auth/logout");
export const getMe = () => request<{ profile: Profile }>("/auth/me");
export const updateProfile = (name: string, role: string) => put<{ profile: Profile }>("/profile", { name, role });
export const createAssessment = (aiSystemName: string, tier: 1 | 2) => post<{ assessment: AssessmentRecord }>("/assessments", { aiSystemName, tier });
export const getActiveAssessment = () => request<{ assessment: AssessmentRecord | null }>("/assessments/active");
export const getAssessments = () => request<{ assessments: AssessmentRecord[] }>("/assessments");
export const getAssessment = (id: string) => request<{ assessment: AssessmentRecord }>(`/assessments/${id}`);
export const getAssessmentDashboard = (id: string) => request<AssessmentDashboardResponse>(`/assessments/${id}/dashboard`);
export const getResult = (id: string) => request<FinalizationResponse>(`/assessments/${id}/result`);

export async function saveDomain(assessmentId: string, domainId: string, answers: Answers) {
  const body = Object.entries(answers).map(([questionId, answer]) => ({
    questionId: Number(questionId), score: answer.score,
    evidence: answer.detail?.trim() || answer.note?.trim() || "",
    attestation: answer.attested ? "confirmed" : "",
  }));
  return put<{ completionPercentage: number }>(`/assessments/${assessmentId}/domains/${domainId}/answers`, { answers: body });
}

export const finalizeAssessment = (id: string, signatoryName?: string) =>
  post<FinalizationResponse>(`/assessments/${id}/finalize`, signatoryName ? { signatoryName, acceptedDeclaration: true } : {});

export async function verifyBadge(token: string): Promise<unknown | null> {
  try { return await request(`/badges/${token}/verify`); } catch { return null; }
}
