/* ============================================================
   CertifAI — scoring engine
   Overall/domain/framework/gap math is ported verbatim from
   CertifAI_MVP.jsx and MUST reproduce identical numbers.
   The badge ladder is extended from 3 tiers to the 4A ladder.
   ============================================================ */
import {
  DOMAINS,
  QUESTIONS,
  FRAMEWORKS,
  CRITICAL_IDS,
  type Domain,
  type FrameworkKey,
} from "./data";

export interface Answer {
  score?: number;
  attested?: boolean;
  note?: string;
  detail?: string;
}
export type Answers = Record<number, Answer>;

export interface DomainScore extends Domain {
  answeredCount: number;
  totalCount: number;
  rawAvg: number;
  pct: number;
}

/* ---------- core math (ported 1:1 from the MVP) ---------- */
export function domainScores(answers: Answers): DomainScore[] {
  return DOMAINS.map((d) => {
    const qs = QUESTIONS.filter((q) => q.domain === d.id);
    const answered = qs.filter((q) => answers[q.id]?.score != null);
    const sum = answered.reduce((a, q) => a + (answers[q.id].score as number), 0);
    const pct = answered.length ? (sum / (answered.length * 5)) * 100 : 0;
    return {
      ...d,
      answeredCount: answered.length,
      totalCount: qs.length,
      rawAvg: answered.length ? sum / answered.length : 0,
      pct: Math.round(pct),
    };
  });
}

export function overallScore(answers: Answers): number {
  const ds = domainScores(answers);
  const totalW = ds.reduce((a, d) => a + (d.answeredCount ? d.weight : 0), 0);
  if (!totalW) return 0;
  return Math.round(
    ds.reduce((a, d) => a + (d.answeredCount ? d.pct * d.weight : 0), 0) / totalW
  );
}

export interface GatingStatus {
  capped: boolean;
  failedIds: number[];
}
export function gatingStatus(answers: Answers): GatingStatus {
  const failed = CRITICAL_IDS.filter(
    (id) => answers[id]?.score != null && (answers[id].score as number) <= 1
  );
  return { capped: failed.length > 0, failedIds: failed };
}

export interface FrameworkCoverage {
  k: FrameworkKey;
  name: string;
  pct: number;
}
export function frameworkCoverage(answers: Answers): FrameworkCoverage[] {
  return (Object.entries(FRAMEWORKS) as [FrameworkKey, string][]).map(([k, name]) => {
    const qs = QUESTIONS.filter((q) => q.frameworks.includes(k));
    const ans = qs.filter((q) => answers[q.id]?.score != null);
    const sum = ans.reduce((a, q) => a + (answers[q.id].score as number), 0);
    return { k, name, pct: ans.length ? Math.round((sum / (ans.length * 5)) * 100) : 0 };
  });
}

export interface Gap {
  id: number;
  title: string;
  domainName: string;
  domainId: string;
  score: number;
  critical: boolean;
  priority: number;
  gapSize: number;
  evidence: string[];
  frameworks: FrameworkKey[];
}
export function gapAnalysis(answers: Answers): Gap[] {
  const dmap = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
  return QUESTIONS.filter((q) => answers[q.id]?.score != null)
    .map((q) => {
      const score = answers[q.id].score as number;
      const w = dmap[q.domain].weight;
      const base = (5 - score) * w;
      const priority = q.critical ? base * 2.2 : base;
      return {
        id: q.id,
        title: q.title,
        domainName: dmap[q.domain].name,
        domainId: q.domain,
        score,
        critical: !!q.critical,
        priority,
        gapSize: 5 - score,
        evidence: q.evidence,
        frameworks: q.frameworks,
      };
    })
    .filter((g) => g.gapSize > 0)
    .sort((a, b) => b.priority - a.priority);
}

export interface Completion {
  answered: number;
  total: number;
  pct: number;
}
export function completion(answers: Answers): Completion {
  const answered = QUESTIONS.filter((q) => answers[q.id]?.score != null).length;
  return {
    answered,
    total: QUESTIONS.length,
    pct: Math.round((answered / QUESTIONS.length) * 100),
  };
}

/* ---------- the 4A ladder ---------- */
export type LevelId = "A1" | "A2" | "A3" | "A4";

export interface Level {
  id: LevelId;
  name: string;
  min: number;
  max: number;
  badge: boolean;
  blurb: string;
  /** requirements above and beyond the score band */
  needsEvidence: boolean;
  needsSignature: boolean;
  needsCleanCriticals: boolean;
}

export const LEVELS: Level[] = [
  {
    id: "A1",
    name: "Aware",
    min: 0,
    max: 40,
    badge: false,
    needsEvidence: false,
    needsSignature: false,
    needsCleanCriticals: false,
    blurb:
      "Assessment completed and gaps understood. An internal signal of where you stand, with no badge issued.",
  },
  {
    id: "A2",
    name: "Aligned",
    min: 41,
    max: 65,
    badge: true,
    needsEvidence: true,
    needsSignature: false,
    needsCleanCriticals: false,
    blurb:
      "Structured evidence across core domains with remediation underway. Your first displayable trust badge.",
  },
  {
    id: "A3",
    name: "Assured",
    min: 66,
    max: 85,
    badge: true,
    needsEvidence: true,
    needsSignature: true,
    needsCleanCriticals: false,
    blurb:
      "A strong governance posture backed by audit-ready evidence and a signed self-certification. A shareable trust badge.",
  },
  {
    id: "A4",
    name: "Advanced",
    min: 86,
    max: 100,
    badge: true,
    needsEvidence: true,
    needsSignature: true,
    needsCleanCriticals: true,
    blurb:
      "Governance fully embedded and continuously improved, evidenced across all domains and backed by a signed self-certification. The top trust badge.",
  },
];

export function levelById(id: LevelId): Level {
  return LEVELS.find((l) => l.id === id) as Level;
}

export interface LevelContext {
  /** 1 = free snapshot, 2 = evidence + AI certification */
  tier?: 1 | 2;
  hasEvidence?: boolean;
  hasSignature?: boolean;
}

export interface LevelResult {
  overall: number;
  level: Level;
  gate: GatingStatus;
  /** the level the raw score would have reached before any capping */
  cappedFrom: LevelId | null;
  /** human-readable reason the level was held below the score band, if any */
  cappedReason: string | null;
}

/**
 * Resolve the 4A level. Extends the MVP `resolveTier` from three tiers to
 * four and layers on the evidence/signature/critical requirements each
 * displayable level demands. The critical-control gate always wins: any
 * critical control scored <= 1 caps the result at Aware (A1).
 */
export function resolveLevel(answers: Answers, ctx: LevelContext = {}): LevelResult {
  const overall = overallScore(answers);
  const gate = gatingStatus(answers);
  const tier = ctx.tier ?? 1;

  // the level the raw score alone would reach
  const byScore =
    LEVELS.find((l) => overall >= l.min && overall <= l.max) ?? LEVELS[0];

  let level = byScore;
  let cappedFrom: LevelId | null = null;
  let cappedReason: string | null = null;

  const capTo = (target: LevelId, reason: string) => {
    if (level.id !== target) {
      cappedFrom = cappedFrom ?? level.id;
      cappedReason = reason;
      level = levelById(target);
    }
  };

  // Tier 1 (free snapshot) can never earn a displayable badge.
  if (tier === 1 && level.badge) {
    capTo("A1", "The free snapshot yields an internal Aware signal only. Upgrade to the AI-powered certification to earn a badge.");
  }
  // Displayable levels require evidence.
  if (level.needsEvidence && !ctx.hasEvidence) {
    capTo("A1", "Structured evidence is required before a badge can be earned.");
  }
  // A3+ requires a signed self-certification.
  if (level.needsSignature && !ctx.hasSignature) {
    capTo("A2", "A signed self-certification is required for Assured and above.");
  }
  // A4 requires no failed critical controls (subset of the gate below).
  // The critical-control gate always caps to Aware, regardless of score.
  if (gate.capped) {
    capTo("A1", "One or more critical controls scored at or below Awareness. Critical controls gate the level so a readiness signal can't outrun core EU AI Act obligations.");
  }

  return { overall, level, gate, cappedFrom, cappedReason };
}
