const { DOMAINS, QUESTION_IDS, CRITICAL_IDS } = require('../domain/instrument');

const LEVELS = [
  { id: 'A1', tier: 'aware', name: 'Aware', min: 0, max: 40, badge: false, needsEvidence: false, needsSignature: false },
  { id: 'A2', tier: 'aligned', name: 'Aligned', min: 41, max: 65, badge: true, needsEvidence: true, needsSignature: false },
  { id: 'A3', tier: 'assured', name: 'Assured', min: 66, max: 85, badge: true, needsEvidence: true, needsSignature: true },
  { id: 'A4', tier: 'advanced', name: 'Advanced', min: 86, max: 100, badge: true, needsEvidence: true, needsSignature: true },
];

class ScoringService {
  calculate(answers, tier, hasSignature) {
    const byId = new Map(answers.map((answer) => [Number(answer.questionId), answer]));
    const domainScores = DOMAINS.map((domain) => {
      const sum = domain.questionIds.reduce((total, id) => total + Number(byId.get(id).score), 0);
      const pct = Math.round((sum / (domain.questionIds.length * 5)) * 100);
      return { id: domain.id, weight: domain.weight, pct, rawAvg: sum / domain.questionIds.length, answeredCount: domain.questionIds.length, totalCount: domain.questionIds.length };
    });
    const overallScore = Math.round(domainScores.reduce((sum, domain) => sum + domain.pct * domain.weight, 0));
    const failedIds = CRITICAL_IDS.filter((id) => Number(byId.get(id).score) <= 1);
    const hasEvidence = answers.some((answer) => String(answer.evidence || '').trim() || String(answer.attestation || '').trim());
    const rawLevel = LEVELS.find((level) => overallScore >= level.min && overallScore <= level.max) || LEVELS[0];
    let level = rawLevel;
    let cappedReason = null;
    if (tier === 1 && level.badge) { level = LEVELS[0]; cappedReason = 'Tier 1 provides a readiness result but does not issue a badge.'; }
    if (level.needsEvidence && !hasEvidence) { level = LEVELS[0]; cappedReason = 'Stored evidence is required for a badge.'; }
    if (level.needsSignature && !hasSignature) { level = LEVELS[1]; cappedReason = 'A signed self-certification is required for Assured and Advanced.'; }
    if (failedIds.length) { level = LEVELS[0]; cappedReason = `Critical controls ${failedIds.map((id) => `Q${id}`).join(', ')} failed.`; }
    return {
      overallScore, domainScores, level, rawLevel, cappedReason, hasEvidence,
      criticalGating: { capped: failedIds.length > 0, failedIds },
      completion: { answered: byId.size, total: QUESTION_IDS.length, percentage: Math.round((byId.size / QUESTION_IDS.length) * 100) },
    };
  }
}

module.exports = ScoringService;
