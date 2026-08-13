const test = require('node:test');
const assert = require('node:assert/strict');
const { AssessmentAnswer } = require('../src/domain/entities');
const { QUESTION_IDS, DASHBOARD_FRAMEWORKS, QUESTION_METADATA } = require('../src/domain/instrument');
const ScoringService = require('../src/services/ScoringService');
const TokenService = require('../src/services/TokenService');
const PasswordService = require('../src/services/PasswordService');
const AssessmentFinalizationService = require('../src/services/AssessmentFinalizationService');
const { isPasswordValid } = require('../src/utils/passwordPolicy');

const answers = (score, evidence = '') => QUESTION_IDS.map((questionId) => new AssessmentAnswer({
  assessmentId: 'assessment', questionId, score,
  evidence: questionId === 1 ? evidence : '',
}));

test('server computes the weighted score and Tier 2 level from stored answers', () => {
  const result = new ScoringService().calculate(answers(4, 'policy register'), 2, true);
  assert.equal(result.overallScore, 80);
  assert.equal(result.level.id, 'A3');
  assert.equal(result.completion.answered, 36);
});

test('a failed critical control always caps the server result at A1', () => {
  const rows = answers(5, 'policy register');
  rows.find((answer) => answer.questionId === 17).score = 1;
  const result = new ScoringService().calculate(rows, 2, true);
  assert.equal(result.level.id, 'A1');
  assert.deepEqual(result.criticalGating.failedIds, [17]);
});

test('Tier 1 reports its score band without applying certificate evidence gates', () => {
  const result = new ScoringService().calculate(answers(5, 'policy register'), 1, false);
  assert.equal(result.overallScore, 100);
  assert.equal(result.level.id, 'A4');
  assert.equal(result.cappedFrom, null);
});

test('Tier 1 score-band preview never causes server-side badge issuance', async () => {
  const assessment = {
    id: 'assessment', userId: 'user-1', tier: 1, status: 'draft',
    badgeTier: null, criticalGatingActive: false,
  };
  let badgeIssueCalls = 0;
  const assessmentService = {
    requireOwned: async () => assessment,
    detail: async (stored) => stored,
  };
  const assessmentRepository = { update: async () => assessment };
  const answerRepository = { findByAssessment: async () => answers(5, 'policy register') };
  const badgeService = {
    issueBadge: async () => { badgeIssueCalls += 1; return {}; },
  };
  const service = new AssessmentFinalizationService(
    assessmentService,
    assessmentRepository,
    answerRepository,
    new ScoringService(),
    badgeService
  );

  const finalized = await service.finalize({ id: 'user-1', companyId: 'company-1' }, assessment.id, {});

  assert.equal(finalized.result.level.id, 'A4');
  assert.equal(finalized.badge, null);
  assert.equal(badgeIssueCalls, 0);
});

test('dashboard analytics safely score partial stored progress on the backend', () => {
  const partial = answers(3).slice(0, 5);
  const result = new ScoringService().analyze(partial, 2, false);
  assert.equal(result.overallScore, 60);
  assert.deepEqual(result.completion, { answered: 5, total: 36, percentage: 14 });
  assert.equal(result.domainScores.find((domain) => domain.id === 'strategy').answeredCount, 5);
  assert.equal(result.domainScores.find((domain) => domain.id === 'risk').answeredCount, 0);
  assert.equal(result.frameworkCoverage.length, 7);
  assert.equal(result.gaps.length, 5);
});

test('backend dashboard catalog maps all canonical questions and frameworks', () => {
  assert.equal(Object.keys(QUESTION_METADATA).length, QUESTION_IDS.length);
  assert.equal(DASHBOARD_FRAMEWORKS.length, 7);
  assert.ok(QUESTION_IDS.every((id) => QUESTION_METADATA[id]));
});

test('password hashes are salted and verifiable', async () => {
  const service = new PasswordService();
  const first = await service.hash('password123');
  const second = await service.hash('password123');
  assert.notEqual(first, second);
  assert.equal(await service.verify('password123', first), true);
  assert.equal(await service.verify('wrong-password', first), false);
});

test('registration password policy requires length, uppercase and number', () => {
  assert.equal(isPasswordValid('Ereslomasb0'), true);
  assert.equal(isPasswordValid('Secret1'), true);
  assert.equal(isPasswordValid('secret1'), false);
  assert.equal(isPasswordValid('Password'), false);
  assert.equal(isPasswordValid('Pass1'), false);
});

test('JWT is signed dynamically and expires after five hours', () => {
  const service = new TokenService('test-secret');
  const token = service.sign({ id: 'user-1', companyId: 'company-1' });
  const payload = service.verify(token);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.companyId, 'company-1');
  assert.equal(payload.exp - payload.iat, 5 * 60 * 60);
  assert.throws(() => service.verify(`${token.slice(0, -1)}x`), /Invalid session/);
});
