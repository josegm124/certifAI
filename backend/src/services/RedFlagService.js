const { DOMAINS, QUESTION_METADATA } = require('../domain/instrument');

class RedFlagService {
  constructor(repository) {
    this.repository = repository;
  }

  async evaluate(adoptionStage, answers) {
    const controls = await this.repository.controls(adoptionStage);
    if (controls.length !== 9) {
      const error = new Error(`Expected 9 active critical controls, found ${controls.length}`);
      error.code = 'CRITICAL_CONTROL_CONFIGURATION_INVALID';
      throw error;
    }
    const byId = new Map(answers.map((answer) => [Number(answer.questionId), Number(answer.score)]));
    return controls.map((control) => {
      const scoreGiven = byId.get(Number(control.question_id));
      if (!Number.isInteger(scoreGiven)) {
        const error = new Error(`Missing score for critical question ${control.question_id}`);
        error.code = 'CRITICAL_CONTROL_SCORE_MISSING';
        throw error;
      }
      const thresholdRequired = Number(control.threshold_required);
      return {
        questionId: Number(control.question_id),
        scoreGiven,
        thresholdRequired,
        status: scoreGiven >= thresholdRequired ? 'passed' : 'failed',
      };
    });
  }

  async failures(assessmentId) {
    const domainNames = new Map(DOMAINS.map((domain) => [domain.id, domain.name]));
    return (await this.repository.byAssessment(assessmentId, true)).map((flag) => ({
      questionId: Number(flag.question_id),
      questionTitle: QUESTION_METADATA[flag.question_id].title,
      questionText: QUESTION_METADATA[flag.question_id].text,
      domainId: flag.domain_id,
      domainName: domainNames.get(flag.domain_id),
      scoreGiven: Number(flag.score_given),
      thresholdRequired: Number(flag.threshold_required),
      guidance: flag.guidance_text,
    }));
  }
}

module.exports = RedFlagService;
