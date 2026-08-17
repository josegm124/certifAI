class AssessmentDashboardService {
  constructor(assessmentService, answerRepository, scoringService, finalizationService) {
    this.assessmentService = assessmentService;
    this.answers = answerRepository;
    this.scoring = scoringService;
    this.finalization = finalizationService;
  }

  async get(userId, assessmentId) {
    const assessment = await this.assessmentService.requireOwned(assessmentId, userId);
    if (assessment.status === 'finalized') return this.finalization.result(assessment, null);
    const answers = await this.answers.findByAssessment(assessment.id);
    return {
      assessment: await this.assessmentService.detail(assessment),
      result: this.scoring.analyze(answers),
      adoptionStage: assessment.adoptionStage,
      failedControls: [],
      certificateEligibility: {
        allowed: false,
        earnedLevel: null,
        failedCriticalCount: 0,
        eligibleProductIds: [],
      },
      eligibleProducts: [],
      badge: null,
    };
  }
}

module.exports = AssessmentDashboardService;
