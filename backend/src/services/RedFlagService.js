class RedFlagService {
  constructor(repository) { this.repository=repository; }
  async evaluate(adoptionStage, answers) {
    const controls=await this.repository.controls(adoptionStage); const byId=new Map(answers.map(a=>[Number(a.questionId),Number(a.score)]));
    return controls.map(c=>({ ...c, actualScore:byId.get(c.question_id), failed:byId.get(c.question_id)<c.minimum_score }));
  }
  async failures(assessmentId) { return (await this.repository.byAssessment(assessmentId,true)).map(f=>({ questionId:f.question_id,domainId:f.domain_id,score:f.actual_score,threshold:f.threshold,guidance:f.guidance })); }
}
module.exports=RedFlagService;
