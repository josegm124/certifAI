/* ==============================================================================
   CertifAI — backend client

   Based on merge/frontend/src/lib/api.ts, reconciled to the real backend.

   THE CONTRACT, AS BUILT
   The local engine in scoring.ts produces an INSTANT ON-SCREEN PREVIEW. It is
   not the badge. When a tier-2 user signs, we POST the computed score plus the
   LevelContext to /assessments/:id/result, and the SERVER re-derives the
   critical-control gate and the evidence check from stored answers, resolves
   the level itself, and issues the badge. What comes back is the score of
   record.

   If the backend is unreachable the app stays fully usable: everything renders
   from local state as a preview, and NO badge is shown. A client-set signature
   must never mint a badge on its own, so "offline" means "no credential",
   never "assume it worked".
   ============================================================================== */
import type { Answers, LevelContext, LevelId } from "./scoring";
import { domainScores, gapAnalysis, completion, resolveLevel, gatingStatus } from "./scoring";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export interface IssuedBadge {
  id: string;
  tier: string;
  score: number;
  verificationToken: string;
  issuedAt: string;
  expiresAt: string;
  verifyUrl: string;
}

/** The server's verdict. `badge` is null whenever no credential was earned. */
export interface ServerResult {
  overallScore: number;
  level: LevelId;
  levelName: string;
  badgeTier: string;
  badgeEligible: boolean;
  criticalGating: { capped: boolean; failedIds: number[] };
  hasEvidence: boolean;
  selfCertified: boolean;
  selfCertifiedAt: string | null;
  completion: { answered: number; total: number; percentage: number };
  cappedFrom: LevelId | null;
  cappedReason: string | null;
  badge: IssuedBadge | null;
}

export interface RegisteredLead {
  userId: string;
  companyId: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/** Find-or-create the company and the lead under it. */
export async function registerLead(org: string, email: string, role = ""): Promise<RegisteredLead> {
  const r = await post<{ userId: string; companyId: string }>("/companies", { name: org, email, role });
  return { userId: r.userId, companyId: r.companyId };
}

/** Open an assessment. tier 1 = free snapshot, tier 2 = evidence + certification. */
export async function createAssessment(userId: string, tier: 1 | 2): Promise<string> {
  const aiSystemId = `system-${Date.now()}`;
  const r = await post<{ id: string }>("/assessments", {
    userId,
    aiSystemId,
    tier: tier === 2 ? "professional" : "free",
  });
  return r.id;
}

/**
 * Push answers to the server. The server re-derives the critical gate and the
 * evidence check from exactly these rows, so this must run before the result
 * call or the badge will be correctly refused for lack of evidence.
 */
export async function syncAnswers(assessmentId: string, answers: Answers): Promise<number> {
  let sent = 0;
  for (const [qid, a] of Object.entries(answers)) {
    if (a?.score == null) continue;
    await post(`/assessments/${assessmentId}/answers`, {
      questionId: String(qid),
      score: a.score,
      evidence: a.detail?.trim() || a.note?.trim() || "",
      attestation: a.attested ? "confirmed" : "",
    });
    sent++;
  }
  return sent;
}

/** Build the payload from the canonical engine. Nothing here recomputes anything. */
export function buildResultPayload(answers: Answers, ctx: LevelContext) {
  const local = resolveLevel(answers, ctx);
  return {
    overallScore: local.overall,
    domainScores: domainScores(answers).map((d) => ({
      id: d.id, name: d.name, weight: d.weight, pct: d.pct,
      rawAvg: d.rawAvg, answeredCount: d.answeredCount, totalCount: d.totalCount,
    })),
    levelContext: { tier: ctx.tier ?? 1, hasEvidence: !!ctx.hasEvidence, hasSignature: !!ctx.hasSignature },
    // Sent for cross-checking only; the server re-derives both and logs a
    // warning if the client's version disagrees.
    criticalGating: gatingStatus(answers),
    completion: completion(answers),
    gaps: gapAnalysis(answers).slice(0, 10),
    selfCertifiedAt: ctx.hasSignature ? new Date().toISOString() : null,
    frameworks: ["aiact", "gdpr", "oecd", "iso", "nist"],
  };
}

/**
 * Submit for the score of record and, if earned, the badge.
 * Throws if the backend is unreachable — callers show the local preview and
 * say no badge was issued.
 */
export async function submitResult(
  assessmentId: string,
  answers: Answers,
  ctx: LevelContext
): Promise<ServerResult> {
  return post<ServerResult>(`/assessments/${assessmentId}/result`, buildResultPayload(answers, ctx));
}

/** Public badge check — the same endpoint a third party would call. */
export async function verifyBadge(token: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${BASE}/badges/${token}/verify`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** One call for the whole issue step: register -> assessment -> answers -> result. */
export async function certify(
  org: string,
  email: string,
  answers: Answers,
  ctx: LevelContext,
  existing?: { userId: string; assessmentId: string }
): Promise<ServerResult> {
  let assessmentId = existing?.assessmentId;
  if (!assessmentId) {
    const lead = await registerLead(org || "Unnamed organisation", email || `demo+${Date.now()}@certifai.local`);
    assessmentId = await createAssessment(lead.userId, ctx.tier ?? 1);
  }
  await syncAnswers(assessmentId, answers);
  return submitResult(assessmentId, answers, ctx);
}
