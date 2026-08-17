const test = require('node:test');
const assert = require('node:assert/strict');
const { AssessmentAnswer } = require('../src/domain/entities');
const {
  QUESTION_IDS,
  DASHBOARD_FRAMEWORKS,
  QUESTION_METADATA,
  PROVISIONAL_ADOPTION_STAGE,
} = require('../src/domain/instrument');
const ScoringService = require('../src/services/ScoringService');
const RedFlagRepository = require('../src/repositories/RedFlagRepository');
const RedFlagService = require('../src/services/RedFlagService');
const EligibilityService = require('../src/services/EligibilityService');
const TokenService = require('../src/services/TokenService');
const PasswordService = require('../src/services/PasswordService');
const { isPasswordValid } = require('../src/utils/passwordPolicy');
const { isCurrentSchema } = require('../src/config/database');
const { openDatabase, run, get, close } = require('./helpers');

const CONTROL_IDS = [1, 8, 11, 16, 23, 26, 29, 34, 36];
const MATRIX = {
  1: [1, 2, 3, 4],
  8: [0, 0, 2, 3],
  11: [1, 2, 3, 4],
  16: [2, 3, 4, 4],
  23: [2, 3, 4, 4],
  26: [1, 2, 3, 4],
  29: [2, 3, 4, 4],
  34: [1, 2, 3, 4],
  36: [1, 2, 3, 4],
};
const answers = (score) => QUESTION_IDS.map((questionId) => new AssessmentAnswer({
  assessmentId: 'assessment-1',
  questionId,
  score,
}));

test('scoring keeps the true score and score band without a red-flag cap', () => {
  const rows = answers(5);
  rows.find((answer) => answer.questionId === 16).score = 0;
  const result = new ScoringService().calculate(rows);
  assert.equal(result.level.id, 'A4');
  assert.ok(result.overallScore > 90);
  assert.equal(result.completion.total, 36);
});

test('the backend seeds only the approved controls and exact four-stage matrix', async (context) => {
  const db = await openDatabase();
  context.after(() => close(db));
  const repository = new RedFlagRepository(db);

  for (let stage = 1; stage <= 4; stage += 1) {
    const controls = await repository.controls(stage);
    assert.deepEqual(controls.map((control) => control.question_id), CONTROL_IDS);
    assert.deepEqual(
      controls.map((control) => control.threshold_required),
      CONTROL_IDS.map((questionId) => MATRIX[questionId][stage - 1]),
    );
  }

  assert.equal((await get(db, 'SELECT COUNT(*) AS count FROM critical_control_thresholds')).count, 36);
  const guidance = await get(db, 'SELECT guidance_text FROM critical_controls WHERE question_id = 23');
  assert.match(guidance.guidance_text, /Data Protection Impact Assessments/);
  assert.ok(guidance.guidance_text.length > 500);
});

test('Stage 2 flags block every product while passed flags allow the earned level and lower', async (context) => {
  const db = await openDatabase();
  context.after(() => close(db));
  const rows = answers(5);
  rows.find((answer) => answer.questionId === 16).score = 2;
  const flags = await new RedFlagService(new RedFlagRepository(db)).evaluate(PROVISIONAL_ADOPTION_STAGE, rows);

  assert.equal(flags.length, 9);
  assert.deepEqual(flags.filter((flag) => flag.status === 'failed').map((flag) => flag.questionId), [16]);
  assert.deepEqual(new EligibilityService().products('advanced', flags), []);

  const passed = flags.map((flag) => ({ ...flag, status: 'passed' }));
  assert.deepEqual(new EligibilityService().products('assured', passed), [
    'aligned-certificate',
    'assured-certificate',
  ]);
  assert.deepEqual(new EligibilityService().products('aware', passed), []);
  assert.deepEqual(new EligibilityService().products('advanced', passed.slice(0, 8)), []);
  assert.deepEqual(new EligibilityService().products('advanced', []), []);
});

test('persisted critical flags are immutable in SQLite', async (context) => {
  const db = await openDatabase();
  context.after(() => close(db));
  await run(db, "INSERT INTO companies(id,name) VALUES('company-1','Acme')");
  await run(db, "INSERT INTO users(id,company_id,email,password_hash,name,role) VALUES('user-1','company-1','a@b.test','hash','Ada','Owner')");
  await run(db, "INSERT INTO ai_systems(id,company_id,name) VALUES('system-1','company-1','Assistant')");
  await run(db, "INSERT INTO assessments(id,user_id,ai_system_id,adoption_stage) VALUES('assessment-1','user-1','system-1',2)");
  await run(db, "INSERT INTO assessment_critical_flags(assessment_id,question_id,score_given,threshold_required,status) VALUES('assessment-1',1,2,2,'passed')");

  await assert.rejects(run(db, "UPDATE assessment_critical_flags SET score_given=1 WHERE assessment_id='assessment-1'"), /IMMUTABLE/);
  await assert.rejects(run(db, "DELETE FROM assessment_critical_flags WHERE assessment_id='assessment-1'"), /IMMUTABLE/);
});

test('backend metadata covers all 36 canonical questions and seven frameworks', () => {
  assert.equal(Object.keys(QUESTION_METADATA).length, QUESTION_IDS.length);
  assert.equal(DASHBOARD_FRAMEWORKS.length, 7);
  assert.deepEqual(CONTROL_IDS.map((id) => QUESTION_METADATA[id].domainId), [
    'strategy', 'revenue', 'governance', 'risk', 'data', 'human', 'trust', 'workforce', 'improve',
  ]);
});

test('database startup recognizes only the complete current schema', () => {
  const tables = new Set([
    'assessment_critical_flags',
    'evidence_dossiers',
    'evidence_items',
    'assessment_domain_confirmations',
  ]);
  assert.equal(isCurrentSchema(tables, [
    { name: 'adoption_stage' },
    { name: 'remediation_source_assessment_id' },
  ]), true);
  assert.equal(isCurrentSchema(tables, [{ name: 'adoption_stage' }, { name: 'tier' }]), false);
  assert.equal(isCurrentSchema(new Set(['evidence_dossiers']), [{ name: 'adoption_stage' }]), false);
});

test('password and token primitives remain valid', async () => {
  const passwords = new PasswordService();
  const hash = await passwords.hash('Secret1');
  assert.equal(await passwords.verify('Secret1', hash), true);
  assert.equal(isPasswordValid('Secret1'), true);
  const tokens = new TokenService('test-secret');
  assert.equal(tokens.verify(tokens.sign({ id: 'user-1', companyId: 'company-1' })).sub, 'user-1');
});
