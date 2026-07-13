const logger = require('../config/logger');

// Domain ids/weights/critical ids must mirror DOMAINS/QUESTIONS in CertifAI_MVP.jsx exactly —
// they are the source of truth for the 32-question model. Keep both in sync when questions change.
const DOMAINS = {
  'strategy': { name: 'Strategy & Leadership', weight: 0.10 },
  'governance': { name: 'Governance & Oversight', weight: 0.14 },
  'risk': { name: 'Risk & Compliance', weight: 0.20 },
  'data': { name: 'Data & Model Governance', weight: 0.18 },
  'human': { name: 'Human Oversight & Accountability', weight: 0.13 },
  'trust': { name: 'Trust, Transparency & Fairness', weight: 0.13 },
  'workforce': { name: 'Workforce & Capability', weight: 0.08 },
  'improve': { name: 'Continuous Improvement', weight: 0.04 }
};

// Critical controls: Q13 (EU AI Act Readiness), Q14 (High-Risk AI Identification), Q22 (Human Accountability)
const CRITICAL_QUESTION_IDS = ['13', '14', '22'];

class ScoringService {
  constructor(answerRepository) {
    this.answerRepository = answerRepository;
  }

  // Calcula scores por dominio
  async computeDomainScores(assessmentId, questionMapping) {
    const answers = await this.answerRepository.findByAssessment(assessmentId);
    const domainScores = {};

    // Agrupar respuestas por dominio
    for (const answer of answers) {
      if (!answer.isAnswered()) continue;

      const question = questionMapping[answer.questionId];
      if (!question) continue;

      const domain = question.domain;
      if (!domainScores[domain]) {
        domainScores[domain] = { scores: [], count: 0 };
      }
      domainScores[domain].scores.push(answer.score);
      domainScores[domain].count++;
    }

    // Calcular promedio por dominio
    const result = {};
    for (const [domain, data] of Object.entries(domainScores)) {
      const average = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const percentage = (average / 5) * 100;
      result[domain] = {
        average,
        percentage: Math.round(percentage),
        answeredCount: data.count
      };
    }

    logger.debug({ assessmentId, domainScores: result }, 'Domain scores computed');
    return result;
  }

  // Calcula score overall ponderado
  computeOverallScore(domainScores) {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [domain, data] of Object.entries(domainScores)) {
      if (!data.average) continue; // Solo dominios respondidos

      const weight = DOMAINS[domain]?.weight || 0;
      weightedSum += (data.average / 5) * weight;
      totalWeight += weight;
    }

    // Normalizar por peso total respondido
    const overallScore = totalWeight > 0 ? (weightedSum / totalWeight) * 5 : 0;
    logger.debug({ overallScore }, 'Overall score computed');
    return Math.round(overallScore * 100) / 100;
  }

  // Resuelve badge tier con lógica de gating.
  // Thresholds mirror frontend BADGE_TIERS (0-40 aware, 41-70 aligned, 71-100 assured),
  // applied to overallScore converted from its 0-5 scale to a 0-100 percentage.
  resolveBadgeTier(overallScore, isCriticalGating) {
    const percentage = (overallScore / 5) * 100;
    let tier = 'aware'; // Default
    let cappedFrom = null;

    if (percentage >= 71) {
      tier = 'assured';
    } else if (percentage >= 41) {
      tier = 'aligned';
    }

    // Gating: si hay critical control ≤1, capping a "aware"
    if (isCriticalGating && tier !== 'aware') {
      cappedFrom = tier;
      tier = 'aware';
    }

    return { tier, cappedFrom };
  }

  // Chequea si hay critical controls ≤1
  async checkCriticalGating(assessmentId, questionMapping) {
    const answers = await this.answerRepository.findByAssessment(assessmentId);

    for (const answer of answers) {
      if (CRITICAL_QUESTION_IDS.includes(answer.questionId)) {
        if (answer.score <= 1) {
          logger.warn({ assessmentId, questionId: answer.questionId }, 'Critical gating triggered');
          return true;
        }
      }
    }

    return false;
  }

  // Gap analysis - prioridades de mejora
  async computeGapAnalysis(assessmentId, domainScores, questionMapping) {
    const answers = await this.answerRepository.findByAssessment(assessmentId);
    const gaps = [];

    for (const answer of answers) {
      if (!answer.isAnswered()) continue;

      const question = questionMapping[answer.questionId];
      if (!question) continue;

      const gap = 5 - answer.score;
      const domainWeight = DOMAINS[question.domain]?.weight || 0.1;
      const isCritical = CRITICAL_QUESTION_IDS.includes(answer.questionId);
      const priority = gap * domainWeight * (isCritical ? 2.2 : 1);

      if (gap > 0) {
        gaps.push({
          questionId: answer.questionId,
          question: question.description,
          domain: question.domain,
          currentScore: answer.score,
          gapSize: gap,
          priority: Math.round(priority * 100) / 100,
          isCritical
        });
      }
    }

    gaps.sort((a, b) => b.priority - a.priority);
    logger.debug({ assessmentId, gapCount: gaps.length }, 'Gap analysis computed');
    return gaps;
  }

  // Calcula % de completitud
  async computeCompletion(assessmentId, totalQuestions) {
    const answered = await this.answerRepository.countAnswered(assessmentId);
    const percentage = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
    return {
      answered,
      total: totalQuestions,
      percentage: Math.round(percentage)
    };
  }
}

module.exports = ScoringService;
