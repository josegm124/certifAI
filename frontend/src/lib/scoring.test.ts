import { describe, it, expect } from "vitest";
import { DOMAINS, QUESTIONS } from "./data";
import {
  domainScores,
  overallScore,
  gatingStatus,
  gapAnalysis,
  completion,
  frameworkCoverage,
  resolveLevel,
  type Answers,
} from "./scoring";

/* ---- reference implementations copied 1:1 from CertifAI_MVP.jsx ---- */
const CRIT = QUESTIONS.filter((q) => q.critical).map((q) => q.id);
function refDomain(answers: any) {
  return DOMAINS.map((d) => {
    const qs = QUESTIONS.filter((q) => q.domain === d.id);
    const answered = qs.filter((q) => answers[q.id]?.score != null);
    const sum = answered.reduce((a, q) => a + answers[q.id].score, 0);
    const pct = answered.length ? (sum / (answered.length * 5)) * 100 : 0;
    return { id: d.id, answeredCount: answered.length, pct: Math.round(pct) };
  });
}
function refOverall(answers: any) {
  const ds = refDomain(answers);
  const dmap = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
  const totalW = ds.reduce((a: number, d: any) => a + (d.answeredCount ? dmap[d.id].weight : 0), 0);
  if (!totalW) return 0;
  return Math.round(
    ds.reduce((a: number, d: any) => a + (d.answeredCount ? d.pct * dmap[d.id].weight : 0), 0) / totalW
  );
}
function refGate(answers: any) {
  const failed = CRIT.filter((id) => answers[id]?.score != null && answers[id].score <= 1);
  return { capped: failed.length > 0, failedIds: failed };
}

/* deterministic pseudo-random answer generator */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
function makeAnswers(seed: number): Answers {
  const rnd = seeded(seed);
  const a: Answers = {};
  for (const q of QUESTIONS) {
    if (rnd() < 0.2) continue; // sometimes unanswered
    a[q.id] = { score: Math.floor(rnd() * 6) };
  }
  return a;
}

describe("scoring parity with the MVP", () => {
  it("reproduces domain, overall and gate numbers across 200 fixtures", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const a = makeAnswers(seed);
      const mine = domainScores(a);
      const ref = refDomain(a);
      for (let i = 0; i < DOMAINS.length; i++) {
        expect(mine[i].pct).toBe(ref[i].pct);
        expect(mine[i].answeredCount).toBe(ref[i].answeredCount);
      }
      expect(overallScore(a)).toBe(refOverall(a));
      expect(gatingStatus(a)).toEqual(refGate(a));
    }
  });

  it("matches known fixtures exactly", () => {
    const empty: Answers = {};
    expect(overallScore(empty)).toBe(0);
    expect(completion(empty).pct).toBe(0);

    const allFive: Answers = {};
    QUESTIONS.forEach((q) => (allFive[q.id] = { score: 5 }));
    expect(overallScore(allFive)).toBe(100);
    expect(completion(allFive).pct).toBe(100);
    expect(gapAnalysis(allFive)).toHaveLength(0);

    const allThree: Answers = {};
    QUESTIONS.forEach((q) => (allThree[q.id] = { score: 3 }));
    expect(overallScore(allThree)).toBe(60);
    expect(frameworkCoverage(allThree).every((f) => f.pct === 60)).toBe(true);
  });

  it("gap analysis ranks critical controls above equal-gap non-criticals", () => {
    const a: Answers = {};
    QUESTIONS.forEach((q) => (a[q.id] = { score: 2 }));
    const gaps = gapAnalysis(a);
    // Q13/Q14 (risk, critical, weight .20) should top the list.
    expect(gaps[0].critical).toBe(true);
  });
});

describe("4A ladder", () => {
  it("Tier 1 never issues a badge even at a high score", () => {
    const a: Answers = {};
    QUESTIONS.forEach((q) => (a[q.id] = { score: 4 }));
    const r = resolveLevel(a, { tier: 1 });
    expect(r.overall).toBe(80);
    expect(r.level.id).toBe("A1");
    expect(r.level.badge).toBe(false);
    expect(r.cappedFrom).toBe("A3");
  });

  it("critical-control gate caps to Aware regardless of score", () => {
    const a: Answers = {};
    QUESTIONS.forEach((q) => (a[q.id] = { score: 5 }));
    a[17] = { score: 1 }; // fail a critical control (Q17 EU AI Act Readiness)
    const r = resolveLevel(a, { tier: 2, hasEvidence: true, hasSignature: true });
    expect(r.gate.capped).toBe(true);
    expect(r.level.id).toBe("A1");
  });

  it("earns Assured with evidence + signature in band 66-85", () => {
    const a: Answers = {};
    QUESTIONS.forEach((q) => (a[q.id] = { score: 4 })); // 80
    const r = resolveLevel(a, { tier: 2, hasEvidence: true, hasSignature: true });
    expect(r.level.id).toBe("A3");
    expect(r.level.badge).toBe(true);
  });

  it("holds Aligned when signature missing at Assured band", () => {
    const a: Answers = {};
    QUESTIONS.forEach((q) => (a[q.id] = { score: 4 })); // 80
    const r = resolveLevel(a, { tier: 2, hasEvidence: true, hasSignature: false });
    expect(r.level.id).toBe("A2");
    expect(r.cappedFrom).toBe("A3");
  });
});
