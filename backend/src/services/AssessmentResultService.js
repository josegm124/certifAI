const logger = require('../config/logger');

/* ==============================================================================
   AssessmentResultService — the badge authority.

   Ported from the merge package and then hardened. The merge's version only
   VALIDATED a client-computed result. This one RE-DERIVES every gate that
   decides whether a badge exists, from data the server already holds.

   THE SPLIT, STATED PLAINLY
   - The SCORE is computed by the frontend engine (src/lib/scoring.ts) and is
     accepted here as a preview figure, bounds-checked only. There is still one
     scoring engine, which is the merge's whole point.
   - The LEVEL and the BADGE are decided here, server-side, and the client
     cannot talk its way past them.

   WHAT IS RE-DERIVED FROM STORED ANSWERS (client claims ignored)
   - criticalGating: any of Q17/Q18/Q26 stored at <= 1 caps the level to A1.
   - hasEvidence: at least one stored answer carrying evidence text or an
     attestation. A client asserting hasEvidence:true over an empty table
     gets no badge.

   WHAT IS AN ATTESTATION, NOT A PROOF
   - hasSignature / selfCertified is the user ticking a box. The server records
     it with a timestamp and refuses A3+ without it, but cannot verify a
     signature. That is inherent to a self-certification product; say so
     plainly rather than implying the signature is validated.

   KNOWN LIMITATION
   A client-submitted score is still not tamper-proof — a caller could inflate
   overallScore and reach a higher band. The gates above mean an inflated score
   alone cannot mint a badge without stored evidence and a recorded signature,
   and cannot escape the critical-control cap at all. Moving the scoring module
   itself server-side is the production fix; it is written with no DOM or React
   dependency so it can be lifted across unchanged.
   ============================================================================== */

// Must mirror CRITICAL_IDS in frontend/src/lib/data.ts (Q17 EU AI Act Readiness,
// Q18 High-Risk AI Identification, Q26 Human Accountability).
const CRITICAL_QUESTION_IDS = ['17', '18', '26'];
const CRITICAL_FAIL_AT_OR_BELOW = 1;

const EXPECTED_DOMAIN_COUNT = 9;
const EXPECTED_QUESTION_COUNT = 36;

// Must mirror LEVELS in frontend/src/lib/scoring.ts.
const LEVELS = [
  { id: 'A1', tier: 'aware',    name: 'Aware',    min: 0,  max: 40,  badge: false, needsEvidence: false, needsSignature: false },
  { id: 'A2', tier: 'aligned',  name: 'Aligned',  min: 41, max: 65,  badge: true,  needsEvidence: true,  needsSignature: false },
  { id: 'A3', tier: 'assured',  name: 'Assured',  min: 66, max: 85,  badge: true,  needsEvidence: true,  needsSignature: true  },
  { id: 'A4', tier: 'advanced', name: 'Advanced', min: 86, max: 100, badge: true,  needsEvidence: true,  needsSignature: true  },
];
const levelById = (id) => LEVELS.find((l) => l.id === id);

class AssessmentResultService {
  constructor(answerRepository) {
    this.answerRepository = answerRepository;
  }

  /** Bounds-check the client's payload. Throws 400 on anything impossible. */
  validatePayload(payload) {
    const errors = [];

    const overallScore = Number(payload?.overallScore);
    if (!Number.isFinite(overallScore) || overallScore < 0 || overallScore > 100) {
      errors.push('overallScore must be a number between 0 and 100 (the frontend engine scale)');
    }

    const domainScores = payload?.domainScores;
    if (!Array.isArray(domainScores) || domainScores.length !== EXPECTED_DOMAIN_COUNT) {
      errors.push(`domainScores must be an array of ${EXPECTED_DOMAIN_COUNT} domain results`);
    } else {
      for (const d of domainScores) {
        if (typeof d.id !== 'string') errors.push('each domain score needs an id');
        if (!Number.isFinite(Number(d.pct)) || d.pct < 0 || d.pct > 100) {
          errors.push(`domain ${d.id} pct must be between 0 and 100`);
        }
      }
    }

    const ctx = payload?.levelContext;
    if (!ctx || (ctx.tier !== 1 && ctx.tier !== 2)) {
      errors.push('levelContext.tier must be 1 (free) or 2 (evidence + certification)');
    }

    if (errors.length) {
      const err = new Error(`Invalid assessment result: ${errors.join('; ')}`);
      err.status = 400;
      throw err;
    }

    return { overallScore: Math.round(overallScore), domainScores, levelContext: ctx };
  }

  /**
   * Re-derive the facts that decide a badge, from stored answers only.
   * Nothing the client asserted about gating or evidence is consulted.
   */
  async deriveFacts(assessmentId) {
    const answers = await this.answerRepository.findByAssessment(assessmentId);
    const answered = answers.filter((a) => a.isAnswered());

    const failedIds = answers
      .filter((a) => CRITICAL_QUESTION_IDS.includes(String(a.questionId)))
      .filter((a) => Number(a.score) <= CRITICAL_FAIL_AT_OR_BELOW)
      .map((a) => Number(a.questionId))
      .sort((x, y) => x - y);

    const hasEvidence = answered.some(
      (a) => (a.evidence && String(a.evidence).trim().length > 0) ||
             (a.attestation && String(a.attestation).trim().length > 0)
    );

    return {
      criticalGating: { capped: failedIds.length > 0, failedIds },
      hasEvidence,
      completion: {
        answered: answered.length,
        total: EXPECTED_QUESTION_COUNT,
        percentage: Math.round((answered.length / EXPECTED_QUESTION_COUNT) * 100),
      },
    };
  }

  /**
   * Decide the level of record. Mirrors resolveLevel() in scoring.ts, but runs
   * on server-derived facts so the client cannot lift its own level.
   */
  resolveLevel(overallScore, facts, levelContext) {
    const tier = levelContext.tier ?? 1;
    const hasSignature = !!levelContext.hasSignature;

    let level = LEVELS.find((l) => overallScore >= l.min && overallScore <= l.max) ?? LEVELS[0];
    let cappedFrom = null;
    let cappedReason = null;

    const capTo = (targetId, reason) => {
      if (level.id !== targetId) {
        cappedFrom = cappedFrom ?? level.id;
        cappedReason = reason;
        level = levelById(targetId);
      }
    };

    if (tier === 1 && level.badge) {
      capTo('A1', 'The free tier yields an internal Aware signal only; a badge requires the paid evidence tier.');
    }
    if (level.needsEvidence && !facts.hasEvidence) {
      capTo('A1', 'No stored evidence found against any control, so no badge can be issued.');
    }
    if (level.needsSignature && !hasSignature) {
      capTo('A2', 'A signed self-certification is required for Assured and above.');
    }
    // The critical-control gate always wins.
    if (facts.criticalGating.capped) {
      capTo('A1', `Critical control(s) ${facts.criticalGating.failedIds.map((i) => `Q${i}`).join(', ')} scored at or below Awareness.`);
    }

    return { level, cappedFrom, cappedReason };
  }

  /** Full pipeline: validate -> re-derive -> resolve. Badge issuance is the caller's. */
  async buildResult(assessmentId, payload) {
    const { overallScore, domainScores, levelContext } = this.validatePayload(payload);
    const facts = await this.deriveFacts(assessmentId);
    const { level, cappedFrom, cappedReason } = this.resolveLevel(overallScore, facts, levelContext);

    if (payload?.criticalGating && payload.criticalGating.capped !== facts.criticalGating.capped) {
      logger.warn(
        { assessmentId, client: payload.criticalGating, server: facts.criticalGating },
        'Client criticalGating disagrees with stored answers; server value used'
      );
    }

    return {
      overallScore,
      domainScores,
      level: level.id,
      levelName: level.name,
      badgeTier: level.tier,
      badgeEligible: level.badge,
      criticalGating: facts.criticalGating,
      hasEvidence: facts.hasEvidence,
      selfCertified: !!levelContext.hasSignature,
      selfCertifiedAt: levelContext.hasSignature ? (payload.selfCertifiedAt ?? new Date().toISOString()) : null,
      completion: facts.completion,
      cappedFrom,
      cappedReason,
      gaps: Array.isArray(payload.gaps) ? payload.gaps.slice(0, 10) : [],
    };
  }
}

module.exports = AssessmentResultService;
module.exports.LEVELS = LEVELS;
module.exports.CRITICAL_QUESTION_IDS = CRITICAL_QUESTION_IDS;
