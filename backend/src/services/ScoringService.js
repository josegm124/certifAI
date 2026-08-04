const {
  DOMAINS,
  QUESTION_IDS,
  CRITICAL_IDS,
  DASHBOARD_FRAMEWORKS,
  QUESTION_METADATA,
} = require('../domain/instrument');

const LEVELS = [
  { id: 'A1', tier: 'aware', name: 'Aware', min: 0, max: 40, badge: false, needsEvidence: false, needsSignature: false, blurb: 'Assessment progress and gaps are understood. This is an internal readiness signal; no badge is issued.' },
  { id: 'A2', tier: 'aligned', name: 'Aligned', min: 41, max: 65, badge: true, needsEvidence: true, needsSignature: false, blurb: 'A stored evidence attestation or reference supports the result, and remediation is underway.' },
  { id: 'A3', tier: 'assured', name: 'Assured', min: 66, max: 85, badge: true, needsEvidence: true, needsSignature: true, blurb: 'A strong governance score with stored evidence and a signed self-certification.' },
  { id: 'A4', tier: 'advanced', name: 'Advanced', min: 86, max: 100, badge: true, needsEvidence: true, needsSignature: true, blurb: 'A high governance score with stored evidence, clean critical controls and a signed self-certification.' },
];

class ScoringService {
  analyze(answers, tier, hasSignature) {
    const byId = new Map(answers
      .filter((answer) => QUESTION_IDS.includes(Number(answer.questionId)) && Number.isFinite(Number(answer.score)))
      .map((answer) => [Number(answer.questionId), answer]));
    const domainScores = DOMAINS.map((domain) => {
      const answered = domain.questionIds.filter((id) => byId.has(id));
      const sum = answered.reduce((total, id) => total + Number(byId.get(id).score), 0);
      const rawAvg = answered.length ? sum / answered.length : 0;
      const weakestQuestionId = answered.reduce((weakest, id) => (
        weakest === null || Number(byId.get(id).score) < Number(byId.get(weakest).score) ? id : weakest
      ), null);
      return {
        id: domain.id,
        name: domain.name,
        short: domain.short,
        weight: domain.weight,
        pct: answered.length ? Math.round((sum / (answered.length * 5)) * 100) : 0,
        rawAvg,
        maturityLevel: Math.round(rawAvg),
        answeredCount: answered.length,
        totalCount: domain.questionIds.length,
        weakestQuestionId,
        weakestQuestionTitle: weakestQuestionId === null ? null : QUESTION_METADATA[weakestQuestionId].title,
        weakestScore: weakestQuestionId === null ? null : Number(byId.get(weakestQuestionId).score),
      };
    });
    const answeredWeight = domainScores.reduce((sum, domain) => sum + (domain.answeredCount ? domain.weight : 0), 0);
    const overallScore = answeredWeight
      ? Math.round(domainScores.reduce((sum, domain) => sum + (domain.answeredCount ? domain.pct * domain.weight : 0), 0) / answeredWeight)
      : 0;
    const failedIds = CRITICAL_IDS.filter((id) => byId.has(id) && Number(byId.get(id).score) <= 1);
    const hasEvidence = answers.some((answer) => String(answer.evidence || '').trim() || String(answer.attestation || '').trim());
    const rawLevel = LEVELS.find((level) => overallScore >= level.min && overallScore <= level.max) || LEVELS[0];
    let level = rawLevel;
    let cappedFrom = null;
    let cappedReason = null;
    const capTo = (target, reason) => {
      if (level.id === target.id) return;
      cappedFrom = cappedFrom || level.id;
      level = target;
      cappedReason = reason;
    };
    if (tier === 1 && level.badge) capTo(LEVELS[0], 'Tier 1 provides a readiness result but does not issue a badge.');
    if (level.needsEvidence && !hasEvidence) capTo(LEVELS[0], 'Stored evidence is required for a badge.');
    if (level.needsSignature && !hasSignature) capTo(LEVELS[1], 'A signed self-certification is required for Assured and Advanced.');
    if (failedIds.length) capTo(LEVELS[0], `Critical controls ${failedIds.map((id) => `Q${id}`).join(', ')} failed.`);

    const frameworkCoverage = DASHBOARD_FRAMEWORKS.map((framework) => {
      const questionIds = QUESTION_IDS.filter((id) => QUESTION_METADATA[id].frameworks.includes(framework.id));
      const answered = questionIds.filter((id) => byId.has(id));
      const sum = answered.reduce((total, id) => total + Number(byId.get(id).score), 0);
      return {
        ...framework,
        pct: answered.length ? Math.round((sum / (answered.length * 5)) * 100) : 0,
        answeredCount: answered.length,
        totalCount: questionIds.length,
      };
    });

    const domainById = new Map(DOMAINS.map((domain) => [domain.id, domain]));
    const gaps = QUESTION_IDS
      .filter((id) => byId.has(id) && Number(byId.get(id).score) < 5)
      .map((id) => {
        const metadata = QUESTION_METADATA[id];
        const score = Number(byId.get(id).score);
        const critical = CRITICAL_IDS.includes(id);
        const gapSize = 5 - score;
        return {
          id,
          title: metadata.title,
          domainId: metadata.domainId,
          domainName: domainById.get(metadata.domainId).name,
          score,
          critical,
          gapSize,
          priority: gapSize * domainById.get(metadata.domainId).weight * (critical ? 2.2 : 1),
        };
      })
      .sort((left, right) => right.priority - left.priority);

    const currentIndex = LEVELS.findIndex((candidate) => candidate.id === level.id);
    const next = LEVELS[currentIndex + 1] || null;
    const nextLevel = next ? { ...next, pointsNeeded: Math.max(0, next.min - overallScore) } : null;

    return {
      overallScore, domainScores, frameworkCoverage, gaps,
      level, rawLevel, cappedFrom, cappedReason, nextLevel, hasEvidence,
      criticalGating: { capped: failedIds.length > 0, failedIds },
      completion: { answered: byId.size, total: QUESTION_IDS.length, percentage: Math.round((byId.size / QUESTION_IDS.length) * 100) },
    };
  }

  calculate(answers, tier, hasSignature) {
    return this.analyze(answers, tier, hasSignature);
  }
}

module.exports = ScoringService;
