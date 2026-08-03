class AssessmentDashboardService {
  constructor(assessmentService, answerRepository, scoringService, badgeService) {
    this.assessmentService = assessmentService;
    this.answers = answerRepository;
    this.scoring = scoringService;
    this.badges = badgeService;
  }

  async get(userId, assessmentId) {
    const assessment = await this.assessmentService.requireOwned(assessmentId, userId);
    const [answers, badge, detail] = await Promise.all([
      this.answers.findByAssessment(assessment.id),
      this.badges.getActiveBadge(assessment.id),
      this.assessmentService.detail(assessment),
    ]);
    const result = this.scoring.analyze(
      answers,
      assessment.tier,
      Boolean(assessment.signatoryName)
    );

    return { assessment: detail, result, badge };
  }
}

module.exports = AssessmentDashboardService;
