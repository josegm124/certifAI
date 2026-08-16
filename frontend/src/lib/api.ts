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
  adoptionStage: number;
  status: "draft" | "finalized";
  completionPercentage: number;
  overallScore: number | null;
  resultLevelId: string | null;
  remediationOfAssessmentId: string | null;
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
    score: number; gapSize: number; priority: number;
  }>;
  level: ResultLevel;
  nextLevel: (ResultLevel & { pointsNeeded: number }) | null;
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
  adoptionStage: number;
  certificateEligibility: { eligible: boolean; blockedByRedFlags: boolean; eligibleProducts: string[] };
  eligibleProducts: string[];
  failedControls: Array<{questionId:number;domainId:string;score:number;threshold:number;guidance:string}>;
}

export type AssessmentDashboardResponse = FinalizationResponse;

export interface CertificateCatalogLevel {
  id: "aware" | "aligned" | "assured" | "advanced";
  code: "A1" | "A2" | "A3" | "A4";
  name: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
  rank: number;
  badgeEligible: boolean;
}

export interface CertificateCatalogProduct {
  id: string;
  code: string;
  productType: "assessment" | "certificate";
  name: string;
  description: string;
  ctaLabel: string;
  displayOrder: number;
  level: CertificateCatalogLevel | null;
  price: {
    id: string;
    amountMinor: number;
    currency: string;
    billingPeriod: "one_time" | "year";
  } | null;
  features: string[];
}

export interface CertificateCatalog {
  levels: CertificateCatalogLevel[];
  products: CertificateCatalogProduct[];
}

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
export const getCertificateCatalog = () => request<CertificateCatalog>("/catalog/certificates");
export const updateProfile = (name: string, role: string) => put<{ profile: Profile }>("/profile", { name, role });
export const createAssessment = (aiSystemName: string) => post<{ assessment: AssessmentRecord }>("/assessments", { aiSystemName });
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

export const finalizeAssessment = (id: string) => post<FinalizationResponse>(`/assessments/${id}/finalize`, {});
export const getCertificateOptions = (id:string) => request<{certificateEligibility:FinalizationResponse['certificateEligibility'];eligibleProducts:string[]}>(`/assessments/${id}/certificate-options`);
export const createEvidenceDossier = (assessmentId:string,productId:string) => post<{dossier:{id:string}}>(`/assessments/${assessmentId}/evidence-dossier`,{productId});
export const getEvidenceDossier = (id:string) => request<EvidenceDossierResponse>(`/evidence-dossiers/${id}`);
export const saveEvidenceReference = (id:string,controlId:string,reference:string) => put<EvidenceDossierResponse>(`/evidence-dossiers/${id}/items/${controlId}`,{reference});
export const issueDossier = (id:string,signatoryName:string) => post<EvidenceDossierResponse>(`/evidence-dossiers/${id}/issue`,{signatoryName,acceptedDeclaration:true});
export interface EvidenceDossierResponse { dossier:{id:string;assessmentId:string;productId:string;status:'draft'|'issued';signatoryName:string|null};items:Array<{id:string;controlId:string;reference:string;attachment:null|{id:string;name:string;mimeType:string;size:number;sha256:string}}> }

export async function verifyBadge(token: string): Promise<unknown | null> {
  try { return await request(`/badges/${token}/verify`); } catch { return null; }
}
