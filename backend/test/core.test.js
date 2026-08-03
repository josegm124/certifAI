const test = require('node:test');
const assert = require('node:assert/strict');
const { AssessmentAnswer } = require('../src/domain/entities');
const { QUESTION_IDS } = require('../src/domain/instrument');
const ScoringService = require('../src/services/ScoringService');
const TokenService = require('../src/services/TokenService');
const PasswordService = require('../src/services/PasswordService');

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

test('Tier 1 cannot earn a badge even with a perfect score', () => {
  const result = new ScoringService().calculate(answers(5, 'policy register'), 1, false);
  assert.equal(result.level.id, 'A1');
  assert.equal(result.level.badge, false);
});

test('password hashes are salted and verifiable', async () => {
  const service = new PasswordService();
  const first = await service.hash('password123');
  const second = await service.hash('password123');
  assert.notEqual(first, second);
  assert.equal(await service.verify('password123', first), true);
  assert.equal(await service.verify('wrong-password', first), false);
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
