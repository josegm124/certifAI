const test = require('node:test');
const assert = require('node:assert/strict');
const { v4: uuid } = require('uuid');
const { openDatabase, run, get, close } = require('./helpers');
const { DOMAINS, QUESTION_IDS } = require('../src/domain/instrument');
const AssessmentRepository = require('../src/repositories/AssessmentRepository');
const AssessmentAnswerRepository = require('../src/repositories/AssessmentAnswerRepository');
const AiSystemRepository = require('../src/repositories/AiSystemRepository');
const RedFlagRepository = require('../src/repositories/RedFlagRepository');
const CertificateCatalogRepository = require('../src/repositories/CertificateCatalogRepository');
const DossierRepository = require('../src/repositories/DossierRepository');
const BadgeRepository = require('../src/repositories/BadgeRepository');
const AssessmentService = require('../src/services/AssessmentService');
const DomainAnswerService = require('../src/services/DomainAnswerService');
const AssessmentFinalizationService = require('../src/services/AssessmentFinalizationService');
const RedFlagService = require('../src/services/RedFlagService');
const EligibilityService = require('../src/services/EligibilityService');
const ScoringService = require('../src/services/ScoringService');
const CertificateCatalogService = require('../src/services/CertificateCatalogService');
const RemediationService = require('../src/services/RemediationService');
const DossierService = require('../src/services/DossierService');
const BadgeService = require('../src/services/BadgeService');

const user = { id: 'user-1', companyId: 'company-1' };
const CRITICAL_IDS = new Set([1, 8, 11, 16, 23, 26, 29, 34, 36]);

test('finalization, remediation, dossier issuance, and retry form one durable workflow', async (context) => {
  const db = await openDatabase();
  context.after(() => close(db));

  await run(db, "INSERT INTO companies(id,name) VALUES('company-1','Acme AI')");
  await run(db, "INSERT INTO users(id,company_id,email,password_hash,name,role) VALUES('user-1','company-1','ada@acme.test','hash','Ada Lovelace','Owner')");
  await run(db, "INSERT INTO ai_systems(id,company_id,name) VALUES('system-1','company-1','Customer Assistant')");
  await run(db, "INSERT INTO assessments(id,user_id,ai_system_id,adoption_stage,status,completion_percentage) VALUES('source-1','user-1','system-1',2,'draft',100)");
  for (const questionId of QUESTION_IDS) {
    await run(db, `
      INSERT INTO assessment_answers(id,assessment_id,question_id,score,evidence,attestation)
      VALUES(?,?,?,?,?,?)
    `, [
      uuid(),
      'source-1',
      questionId,
      questionId === 16 ? 2 : 5,
      CRITICAL_IDS.has(questionId) ? `Evidence reference Q${questionId}` : '',
      '',
    ]);
  }

  const assessmentRepository = new AssessmentRepository(db);
  const answerRepository = new AssessmentAnswerRepository(db);
  const assessmentService = new AssessmentService(
    assessmentRepository,
    answerRepository,
    new AiSystemRepository(db),
  );
  const flagRepository = new RedFlagRepository(db);
  const redFlags = new RedFlagService(flagRepository);
  const eligibility = new EligibilityService();
  const scoring = new ScoringService();
  const catalog = new CertificateCatalogService(new CertificateCatalogRepository(db));
  const noBadges = { getActiveBadge: async () => null };
  const finalization = new AssessmentFinalizationService(
    assessmentService,
    assessmentRepository,
    answerRepository,
    scoring,
    redFlags,
    flagRepository,
    eligibility,
    noBadges,
    catalog,
  );

  const first = await finalization.finalize(user, 'source-1');
  assert.equal(first.result.level.id, 'A4');
  assert.ok(first.result.overallScore > 90);
  assert.deepEqual(first.failedControls.map((control) => control.questionId), [16]);
  assert.equal(first.failedControls[0].thresholdRequired, 3);
  assert.match(first.failedControls[0].guidance, /structured risk assessment/);
  assert.deepEqual(first.eligibleProducts, []);
  assert.equal((await get(db, "SELECT COUNT(*) AS count FROM assessment_critical_flags WHERE assessment_id='source-1'")).count, 9);
  assert.equal((await get(db, "SELECT COUNT(*) AS count FROM domain_scores WHERE assessment_id='source-1'")).count, 9);

  const retry = await finalization.finalize(user, 'source-1');
  assert.equal(retry.result.overallScore, first.result.overallScore);
  assert.deepEqual(retry.failedControls, first.failedControls);
  assert.equal((await get(db, "SELECT COUNT(*) AS count FROM assessment_critical_flags WHERE assessment_id='source-1'")).count, 9);

  const remediation = await new RemediationService(db, assessmentService, assessmentRepository).create(user, 'source-1');
  assert.equal(remediation.remediationSourceAssessmentId, 'source-1');
  assert.equal(remediation.adoptionStage, 2);
  assert.equal(Object.keys(remediation.answers).length, 36);
  assert.equal(remediation.answers[16].evidence, 'Evidence reference Q16');

  await assert.rejects(
    finalization.finalize(user, remediation.id),
    (error) => error.code === 'REMEDIATION_CONFIRMATIONS_INCOMPLETE',
  );

  const domainAnswers = new DomainAnswerService(assessmentService, answerRepository, assessmentRepository);
  for (const domain of DOMAINS) {
    const copied = await answerRepository.findByAssessment(remediation.id);
    const byId = new Map(copied.map((answer) => [answer.questionId, answer]));
    const payload = domain.questionIds.map((questionId) => ({
      questionId,
      score: questionId === 16 ? 3 : byId.get(questionId).score,
      evidence: byId.get(questionId).evidence,
      attestation: byId.get(questionId).attestation,
    }));
    await domainAnswers.save(user.id, remediation.id, domain.id, { answers: payload, confirmed: true });
  }
  assert.equal(await assessmentRepository.countDomainConfirmations(remediation.id), 9);

  const remediated = await finalization.finalize(user, remediation.id);
  assert.deepEqual(remediated.failedControls, []);
  assert.equal(remediated.certificateEligibility.allowed, true);
  assert.deepEqual(remediated.eligibleProducts, [
    'aligned-certificate',
    'assured-certificate',
    'advanced-certificate',
  ]);

  const badgeService = new BadgeService(new BadgeRepository(db), assessmentRepository);
  const dossierService = new DossierService(
    new DossierRepository(db),
    assessmentRepository,
    answerRepository,
    flagRepository,
    eligibility,
    badgeService,
    catalog,
  );
  const draftDossier = await dossierService.create(user, remediation.id, 'advanced-certificate');
  assert.equal(draftDossier.items.length, 9);
  assert.equal(draftDossier.completion.complete, true);
  assert.equal(draftDossier.items.find((item) => item.questionId === 16).writtenReference, 'Evidence reference Q16');

  const lowerProduct = await dossierService.create(user, remediation.id, 'assured-certificate');
  assert.equal(lowerProduct.dossier.id, draftDossier.dossier.id);
  assert.equal(lowerProduct.dossier.selectedProductId, 'assured-certificate');

  const issued = await dossierService.issue(user, draftDossier.dossier.id, {
    signatoryName: 'Ada Lovelace',
    acceptedDeclaration: true,
  });
  assert.equal(issued.dossier.status, 'issued');
  assert.equal(issued.badge.productId, 'assured-certificate');
  assert.equal(issued.badge.tier, 'assured');
  assert.equal((await dossierService.issue(user, draftDossier.dossier.id, {
    signatoryName: 'Ada Lovelace', acceptedDeclaration: true,
  })).badge.id, issued.badge.id);
  assert.equal((await badgeService.verifyBadge(issued.badge.verificationToken)).adoptionStage, 2);
  await assert.rejects(
    dossierService.saveItem(user.id, draftDossier.dossier.id, 16, 'Changed after issue'),
    (error) => error.code === 'DOSSIER_ISSUED',
  );

  await assert.rejects(
    assessmentService.create(user, { aiSystemName: 'Another system', tier: 2 }),
    (error) => error.code === 'TIER_2_IS_DOSSIER_WORKFLOW',
  );
  const normalDraft = await assessmentService.create(user, { aiSystemName: 'Another system' });
  const strategyPayload = DOMAINS[0].questionIds.map((questionId) => ({
    questionId, score: 4, evidence: 'must not persist', attestation: 'must not persist',
  }));
  await domainAnswers.save(user.id, normalDraft.id, DOMAINS[0].id, { answers: strategyPayload, confirmed: true });
  const normalEvidence = await get(db, 'SELECT evidence,attestation FROM assessment_answers WHERE assessment_id=? AND question_id=1', [normalDraft.id]);
  assert.deepEqual(normalEvidence, { evidence: '', attestation: '' });
});
