const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const httpError = require('../utils/httpError');
const logger = require('../config/logger');
const { DOMAINS, FRAMEWORKS, QUESTION_METADATA } = require('../domain/instrument');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/evidence');
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENTS = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

class DossierService {
  constructor(repo, assessments, answers, flags, eligibility, badges, catalog) {
    Object.assign(this, { repo, assessments, answers, flags, eligibility, badges, catalog });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  async eligibilityFor(assessment) {
    const [flags, catalog] = await Promise.all([
      this.flags.byAssessment(assessment.id),
      this.catalog.getPublicCatalog(),
    ]);
    const activeProductIds = catalog.products.map((product) => product.id);
    return {
      flags,
      catalog,
      eligibleProductIds: this.eligibility.products(assessment.resultLevelId, flags, activeProductIds),
    };
  }

  async requireEligibleProduct(assessment, selectedProductId) {
    const eligibility = await this.eligibilityFor(assessment);
    if (eligibility.flags.length !== 9) {
      throw httpError(409, 'The persisted red-flag evaluation is incomplete', 'RED_FLAG_GATE_FAILED');
    }
    if (eligibility.flags.some((flag) => flag.status === 'failed')) {
      throw httpError(409, 'One or more critical controls failed', 'RED_FLAG_GATE_FAILED');
    }
    if (assessment.resultLevelId === 'aware') {
      throw httpError(409, 'The readiness score is not certificate eligible', 'SCORE_NOT_CERTIFICATE_ELIGIBLE');
    }
    if (!eligibility.eligibleProductIds.includes(selectedProductId)) {
      throw httpError(409, 'Certificate product is not eligible', 'CERTIFICATE_PRODUCT_NOT_ELIGIBLE');
    }
    const product = eligibility.catalog.products.find((candidate) => candidate.id === selectedProductId);
    if (!product?.level) {
      throw httpError(409, 'Certificate product is not eligible', 'CERTIFICATE_PRODUCT_NOT_ELIGIBLE');
    }
    return product;
  }

  async create(user, assessmentId, selectedProductId) {
    const assessment = await this.assessments.findById(assessmentId);
    if (!assessment || assessment.userId !== user.id) {
      throw httpError(404, 'Assessment not found', 'ASSESSMENT_NOT_FOUND');
    }
    if (assessment.status !== 'finalized') {
      throw httpError(409, 'Assessment is not finalized', 'ASSESSMENT_NOT_FINALIZED');
    }
    await this.requireEligibleProduct(assessment, selectedProductId);

    const existing = await this.repo.findByAssessment(assessment.id);
    if (existing) {
      if (existing.status === 'draft' && existing.selected_product_id !== selectedProductId) {
        await this.repo.updateSelectedProduct(existing.id, selectedProductId);
        logger.audit.info({
          event: 'evidence_dossier.product_changed',
          dossierId: existing.id,
          assessmentId,
          selectedProductId,
          userId: user.id,
          companyId: user.companyId,
        });
      }
      return this.detail(user.id, existing.id);
    }

    const [controls, answers] = await Promise.all([
      this.flags.controls(assessment.adoptionStage),
      this.answers.findByAssessment(assessment.id),
    ]);
    if (controls.length !== 9) throw new Error('CRITICAL_CONTROL_CONFIGURATION_INVALID');
    const carriedReferences = new Map(answers.map((answer) => [
      Number(answer.questionId),
      String(answer.evidence || '').trim(),
    ]));
    const dossier = await this.repo.create({
      id: uuid(),
      assessmentId: assessment.id,
      selectedProductId,
    }, controls, carriedReferences);

    logger.audit.info({
      event: 'evidence_dossier.created',
      dossierId: dossier.id,
      assessmentId,
      selectedProductId,
      userId: user.id,
      companyId: user.companyId,
    });
    return this.detail(user.id, dossier.id);
  }

  async owned(userId, id) {
    const dossier = await this.repo.findOwned(id, userId);
    if (!dossier) throw httpError(404, 'Evidence dossier not found', 'DOSSIER_NOT_FOUND');
    return dossier;
  }

  async detail(userId, id) {
    const dossier = await this.owned(userId, id);
    const [items, badge, catalog] = await Promise.all([
      this.repo.items(id),
      this.badges.getActiveBadge(dossier.assessment_id),
      this.catalog.getPublicCatalog(),
    ]);
    const domainNames = new Map(DOMAINS.map((domain) => [domain.id, domain.name]));
    return {
      dossier: {
        id: dossier.id,
        assessmentId: dossier.assessment_id,
        selectedProductId: dossier.selected_product_id,
        status: dossier.status,
        signatoryName: dossier.signatory_name,
        acceptedDeclaration: Boolean(dossier.accepted_declaration),
        signedAt: dossier.signed_at,
        issuedAt: dossier.issued_at,
      },
      selectedProduct: catalog.products.find((product) => product.id === dossier.selected_product_id) || null,
      items: items.map((item) => {
        const metadata = QUESTION_METADATA[item.question_id];
        return {
          id: item.id,
          questionId: Number(item.question_id),
          questionTitle: metadata.title,
          questionText: metadata.text,
          domainId: metadata.domainId,
          domainName: domainNames.get(metadata.domainId),
          writtenReference: item.written_reference,
          attachment: item.attachment_id ? {
            id: item.attachment_id,
            originalName: item.original_name,
            mimeType: item.mime_type,
            sizeBytes: Number(item.size_bytes),
            sha256: item.sha256,
          } : null,
        };
      }),
      completion: {
        completedItems: items.filter((item) => String(item.written_reference).trim()).length,
        totalItems: items.length,
        complete: items.length === 9 && items.every((item) => String(item.written_reference).trim()),
      },
      badge,
    };
  }

  async saveItem(userId, id, questionId, writtenReference) {
    const dossier = await this.owned(userId, id);
    if (dossier.status !== 'draft') throw httpError(409, 'Dossier is issued', 'DOSSIER_ISSUED');
    const normalizedQuestionId = Number(questionId);
    const value = String(writtenReference || '').trim();
    if (!Number.isInteger(normalizedQuestionId) || !await this.repo.saveItem(id, normalizedQuestionId, value)) {
      throw httpError(404, 'Evidence item not found', 'EVIDENCE_ITEM_NOT_FOUND');
    }
    logger.audit.info({ event: 'evidence_reference.saved', dossierId: id, questionId: normalizedQuestionId, userId });
    return this.detail(userId, id);
  }

  validateAttachment(file) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size <= 0) {
      throw httpError(400, 'Attachment is required', 'ATTACHMENT_REQUIRED');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw httpError(413, 'Attachment exceeds the 10 MB limit', 'ATTACHMENT_TOO_LARGE');
    }
    const originalName = String(file.originalname || '');
    if (!originalName || path.basename(originalName) !== originalName || path.win32.basename(originalName) !== originalName) {
      throw httpError(415, 'Attachment filename is not allowed', 'ATTACHMENT_TYPE_NOT_ALLOWED');
    }
    const extension = path.extname(originalName).toLowerCase();
    if (!ALLOWED_ATTACHMENTS[extension] || ALLOWED_ATTACHMENTS[extension] !== file.mimetype) {
      throw httpError(415, 'Attachment type is not allowed', 'ATTACHMENT_TYPE_NOT_ALLOWED');
    }
    return { originalName, extension };
  }

  async attach(userId, id, questionId, file) {
    const dossier = await this.owned(userId, id);
    if (dossier.status !== 'draft') throw httpError(409, 'Dossier is issued', 'DOSSIER_ISSUED');
    const item = await this.repo.itemByQuestion(id, Number(questionId));
    if (!item) throw httpError(404, 'Evidence item not found', 'EVIDENCE_ITEM_NOT_FOUND');
    const { originalName, extension } = this.validateAttachment(file);
    const storedName = `${uuid()}${extension}`;
    const target = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(target, file.buffer, { flag: 'wx' });
    const metadata = {
      id: uuid(),
      storedName,
      originalName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    };
    try {
      const old = await this.repo.attach(item, metadata);
      if (old) fs.rmSync(path.join(UPLOAD_DIR, old.stored_name), { force: true });
    } catch (error) {
      fs.rmSync(target, { force: true });
      throw error;
    }
    logger.audit.info({ event: 'evidence_attachment.stored', dossierId: id, questionId: Number(questionId), sizeBytes: file.size });
    logger.metric.info({ event: 'evidence_attachment.store', dossierId: id, sizeBytes: file.size });
    return this.detail(userId, id);
  }

  async removeAttachment(userId, id, questionId) {
    const dossier = await this.owned(userId, id);
    if (dossier.status !== 'draft') throw httpError(409, 'Dossier is issued', 'DOSSIER_ISSUED');
    const item = await this.repo.itemByQuestion(id, Number(questionId));
    if (!item) throw httpError(404, 'Evidence item not found', 'EVIDENCE_ITEM_NOT_FOUND');
    const old = await this.repo.removeAttachment(item);
    if (old) fs.rmSync(path.join(UPLOAD_DIR, old.stored_name), { force: true });
    logger.audit.info({ event: 'evidence_attachment.removed', dossierId: id, questionId: Number(questionId), userId });
    return this.detail(userId, id);
  }

  async download(userId, id, questionId) {
    await this.owned(userId, id);
    const item = await this.repo.itemByQuestion(id, Number(questionId));
    if (!item?.stored_name) throw httpError(404, 'Attachment not found', 'ATTACHMENT_NOT_FOUND');
    if (!/^[0-9a-f-]{36}\.(pdf|docx|png|jpe?g)$/i.test(item.stored_name)) {
      throw httpError(404, 'Attachment not found', 'ATTACHMENT_NOT_FOUND');
    }
    const filePath = path.join(UPLOAD_DIR, item.stored_name);
    if (!fs.existsSync(filePath)) throw httpError(404, 'Attachment not found', 'ATTACHMENT_NOT_FOUND');
    return { path: filePath, name: item.original_name, mime: item.mime_type };
  }

  async issue(user, id, input) {
    const dossier = await this.owned(user.id, id);
    if (dossier.status === 'issued') return this.detail(user.id, id);

    const assessment = await this.assessments.findById(dossier.assessment_id);
    if (!assessment || assessment.status !== 'finalized') {
      throw httpError(409, 'Assessment is not finalized', 'ASSESSMENT_NOT_FINALIZED');
    }
    const product = await this.requireEligibleProduct(assessment, dossier.selected_product_id);
    const items = await this.repo.items(id);
    if (items.length !== 9 || items.some((item) => !String(item.written_reference).trim())) {
      throw httpError(409, 'All nine evidence references are required', 'EVIDENCE_INCOMPLETE');
    }
    const signatoryName = String(input.signatoryName || '').trim().replace(/\s+/g, ' ');
    if (!signatoryName || input.acceptedDeclaration !== true) {
      throw httpError(400, 'Signature and declaration are required', 'SIGNATURE_REQUIRED');
    }

    try {
      await this.repo.transaction(async () => {
        await this.repo.issue(id, signatoryName);
        await this.badges.issueBadge(
          assessment.id,
          user.companyId,
          product.level.id,
          assessment.overallScore,
          FRAMEWORKS,
          id,
          product.id,
        );
      });
    } catch (error) {
      if (error.message === 'DOSSIER_ISSUE_CONFLICT') {
        const current = await this.repo.findByAssessment(assessment.id);
        if (current?.status === 'issued') return this.detail(user.id, current.id);
      }
      throw error;
    }
    logger.audit.info({
      event: 'evidence_dossier.issued',
      dossierId: id,
      assessmentId: assessment.id,
      selectedProductId: product.id,
      userId: user.id,
      companyId: user.companyId,
    });
    logger.metric.info({ event: 'evidence_dossier.issue', dossierId: id, assessmentId: assessment.id });
    return this.detail(user.id, id);
  }
}

DossierService.UPLOAD_DIR = UPLOAD_DIR;
DossierService.MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_BYTES;
module.exports = DossierService;
