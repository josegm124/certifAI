const test = require('node:test');
const assert = require('node:assert/strict');
const DossierService = require('../src/services/DossierService');
const AssessmentFinalizationService = require('../src/services/AssessmentFinalizationService');
const EligibilityService = require('../src/services/EligibilityService');
const ScoringService = require('../src/services/ScoringService');
const { QUESTION_IDS } = require('../src/domain/instrument');

const user = { id: 'user-1', companyId: 'company-1' };
const assessment = {
  id: 'assessment-1',
  userId: user.id,
  adoptionStage: 2,
  resultLevelId: 'advanced',
  overallScore: 92,
  status: 'finalized',
};
const questionIds = [1, 8, 11, 16, 23, 26, 29, 34, 36];
const catalog = {
  levels: [],
  products: [
    { id: 'aligned-certificate', level: { id: 'aligned' } },
    { id: 'assured-certificate', level: { id: 'assured' } },
    { id: 'advanced-certificate', level: { id: 'advanced' } },
  ],
};

function fixture({ complete = true, initiallyIssued = false, failed = false } = {}) {
  let dossier = {
    id: 'dossier-1',
    assessment_id: assessment.id,
    selected_product_id: 'advanced-certificate',
    status: initiallyIssued ? 'issued' : 'draft',
    signatory_name: initiallyIssued ? 'Ada Lovelace' : null,
    accepted_declaration: initiallyIssued ? 1 : 0,
  };
  let badge = initiallyIssued ? {
    id: 'badge-1',
    productId: 'advanced-certificate',
    tier: 'advanced',
    verificationToken: 'token-1',
  } : null;
  const calls = [];
  const items = questionIds.map((questionId, index) => ({
    id: `item-${questionId}`,
    question_id: questionId,
    written_reference: !complete && index === 8 ? '' : `Evidence ${questionId}`,
    attachment_id: null,
  }));
  const repo = {
    findOwned: async () => dossier,
    findByAssessment: async () => dossier,
    items: async () => items,
    transaction: async (work) => {
      calls.push('transaction:start');
      const result = await work();
      calls.push('transaction:commit');
      return result;
    },
    issue: async (_id, signatoryName) => {
      calls.push(`dossier:${signatoryName}`);
      dossier = { ...dossier, status: 'issued', signatory_name: signatoryName, accepted_declaration: 1 };
    },
  };
  const badges = {
    issueBadge: async (_assessmentId, _companyId, tier, score, _frameworks, dossierId, productId) => {
      calls.push('badge:issue');
      badge = { id: 'badge-1', dossierId, productId, tier, score, verificationToken: 'token-1' };
      return badge;
    },
    getActiveBadge: async () => badge,
  };
  const flags = {
    byAssessment: async () => questionIds.map((questionId, index) => ({
      question_id: questionId,
      status: failed && index === 0 ? 'failed' : 'passed',
    })),
  };
  const service = new DossierService(
    repo,
    { findById: async () => assessment },
    {},
    flags,
    new EligibilityService(),
    badges,
    { getPublicCatalog: async () => catalog },
  );
  return { service, calls };
}

test('dossier issuance validates, writes dossier and badge atomically, and returns the badge', async () => {
  const { service, calls } = fixture();
  const response = await service.issue(user, 'dossier-1', {
    signatoryName: '  Ada   Lovelace ',
    acceptedDeclaration: true,
  });

  assert.deepEqual(calls, [
    'transaction:start',
    'dossier:Ada Lovelace',
    'badge:issue',
    'transaction:commit',
  ]);
  assert.equal(response.dossier.status, 'issued');
  assert.equal(response.badge.verificationToken, 'token-1');
  assert.equal(response.dossier.selectedProductId, 'advanced-certificate');
});

test('dossier issuance rejects missing references, declarations, and failed controls before writing', async () => {
  const incomplete = fixture({ complete: false });
  await assert.rejects(
    incomplete.service.issue(user, 'dossier-1', { signatoryName: 'Ada Lovelace', acceptedDeclaration: true }),
    (error) => error.code === 'EVIDENCE_INCOMPLETE',
  );
  assert.deepEqual(incomplete.calls, []);

  const signature = fixture();
  await assert.rejects(
    signature.service.issue(user, 'dossier-1', { signatoryName: '', acceptedDeclaration: false }),
    (error) => error.code === 'SIGNATURE_REQUIRED',
  );
  assert.deepEqual(signature.calls, []);

  const redFlag = fixture({ failed: true });
  await assert.rejects(
    redFlag.service.issue(user, 'dossier-1', { signatoryName: 'Ada Lovelace', acceptedDeclaration: true }),
    (error) => error.code === 'RED_FLAG_GATE_FAILED',
  );
  assert.deepEqual(redFlag.calls, []);
});

test('retrying an issued dossier returns its existing badge without duplicate writes', async () => {
  const { service, calls } = fixture({ initiallyIssued: true });
  const response = await service.issue(user, 'dossier-1', {
    signatoryName: 'Ada Lovelace',
    acceptedDeclaration: true,
  });
  assert.equal(response.badge.id, 'badge-1');
  assert.deepEqual(calls, []);
});

test('attachment validation enforces private-file allowlist, size, and safe names', () => {
  const { service } = fixture();
  assert.deepEqual(service.validateAttachment({
    buffer: Buffer.from('pdf'),
    size: 3,
    originalname: 'evidence.pdf',
    mimetype: 'application/pdf',
  }), { originalName: 'evidence.pdf', extension: '.pdf' });
  assert.throws(() => service.validateAttachment({
    buffer: Buffer.from('x'), size: 1, originalname: '../secret.pdf', mimetype: 'application/pdf',
  }), (error) => error.code === 'ATTACHMENT_TYPE_NOT_ALLOWED');
  assert.throws(() => service.validateAttachment({
    buffer: Buffer.alloc(1), size: DossierService.MAX_ATTACHMENT_BYTES + 1, originalname: 'large.pdf', mimetype: 'application/pdf',
  }), (error) => error.code === 'ATTACHMENT_TOO_LARGE');
  assert.throws(() => service.validateAttachment({
    buffer: Buffer.from('x'), size: 1, originalname: 'script.exe', mimetype: 'application/octet-stream',
  }), (error) => error.code === 'ATTACHMENT_TYPE_NOT_ALLOWED');
});

test('the official result returns the issued badge and backend-filtered products', async () => {
  const answers = QUESTION_IDS.map((questionId) => ({ questionId, score: 5 }));
  const badge = { id: 'badge-1', tier: 'advanced', verificationToken: 'token-1' };
  const service = new AssessmentFinalizationService(
    { detail: async (record) => ({ id: record.id }) },
    {},
    { findByAssessment: async () => answers },
    new ScoringService(),
    { failures: async () => [] },
    { byAssessment: async () => questionIds.map((questionId) => ({ question_id: questionId, status: 'passed' })) },
    new EligibilityService(),
    { getActiveBadge: async () => badge },
    { getPublicCatalog: async () => catalog },
  );

  const result = await service.result(assessment, user.companyId);
  assert.equal(result.badge, badge);
  assert.deepEqual(result.eligibleProducts, [
    'aligned-certificate',
    'assured-certificate',
    'advanced-certificate',
  ]);
});
