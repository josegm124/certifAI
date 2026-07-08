const logger = require('../config/logger');

// Mapeo de dominios y preguntas (del frontend)
const DOMAINS = {
  'governance': { name: 'AI Governance & Oversight', weight: 0.15 },
  'risks': { name: 'Risk Management & Mitigation', weight: 0.15 },
  'transparency': { name: 'Transparency & Explainability', weight: 0.12 },
  'fairness': { name: 'Fairness & Bias Management', weight: 0.13 },
  'security': { name: 'Security & Data Protection', weight: 0.15 },
  'compliance': { name: 'Legal & Regulatory Compliance', weight: 0.16 },
  'monitoring': { name: 'Monitoring & Adaptation', weight: 0.10 },
  'culture': { name: 'Organization & Culture', weight: 0.04 }
};

const CRITICAL_QUESTION_IDS = [
  'q1', 'q5', 'q12', 'q18', 'q24', 'q31'  // Placeholder - map to actual critical controls
];

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

  // Resuelve badge tier con lógica de gating
  resolveBadgeTier(overallScore, isCriticalGating) {
    let tier = 'aware'; // Default
    let cappedFrom = null;

    if (overallScore >= 4) {
      tier = 'assured';
    } else if (overallScore >= 3) {
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
