const BaseRepository = require('./BaseRepository');
const { v4: uuid } = require('uuid');

class DossierRepository extends BaseRepository {
  constructor(db) {
    super(db, 'evidence_dossiers');
  }

  async transaction(work) {
    await this.run('BEGIN IMMEDIATE');
    try {
      const result = await work();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  findOwned(id, userId) {
    return this.get(`
      SELECT dossier.*
      FROM evidence_dossiers dossier
      JOIN assessments assessment ON assessment.id = dossier.assessment_id
      WHERE dossier.id = ? AND assessment.user_id = ?
    `, [id, userId]);
  }

  findByAssessment(assessmentId) {
    return this.get('SELECT * FROM evidence_dossiers WHERE assessment_id = ?', [assessmentId]);
  }

  async create(dossier, controls, carriedReferences = new Map()) {
    await this.transaction(async () => {
      await this.run(`
        INSERT INTO evidence_dossiers
          (id, assessment_id, selected_product_id)
        VALUES (?, ?, ?)
      `, [dossier.id, dossier.assessmentId, dossier.selectedProductId]);
      for (const control of controls) {
        await this.run(`
          INSERT INTO evidence_items
            (id, dossier_id, question_id, written_reference)
          VALUES (?, ?, ?, ?)
        `, [uuid(), dossier.id, control.question_id, carriedReferences.get(Number(control.question_id)) || '']);
      }
    });
    return this.findByAssessment(dossier.assessmentId);
  }

  async updateSelectedProduct(id, productId) {
    const result = await this.run(`
      UPDATE evidence_dossiers
      SET selected_product_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'draft'
    `, [productId, id]);
    return result.changes === 1;
  }

  items(dossierId) {
    return this.all(`
      SELECT
        item.*,
        attachment.id AS attachment_id,
        attachment.stored_name,
        attachment.original_name,
        attachment.mime_type,
        attachment.size_bytes,
        attachment.sha256
      FROM evidence_items item
      LEFT JOIN evidence_attachments attachment ON attachment.evidence_item_id = item.id
      WHERE item.dossier_id = ?
      ORDER BY item.question_id
    `, [dossierId]);
  }

  async saveItem(dossierId, questionId, writtenReference) {
    const result = await this.run(`
      UPDATE evidence_items
      SET written_reference = ?, updated_at = CURRENT_TIMESTAMP
      WHERE dossier_id = ? AND question_id = ?
    `, [writtenReference, dossierId, questionId]);
    return result.changes === 1;
  }

  itemByQuestion(dossierId, questionId) {
    return this.get(`
      SELECT
        item.*,
        attachment.id AS attachment_id,
        attachment.stored_name,
        attachment.original_name,
        attachment.mime_type,
        attachment.size_bytes,
        attachment.sha256
      FROM evidence_items item
      LEFT JOIN evidence_attachments attachment ON attachment.evidence_item_id = item.id
      WHERE item.dossier_id = ? AND item.question_id = ?
    `, [dossierId, questionId]);
  }

  async attach(item, metadata) {
    return this.transaction(async () => {
      const old = await this.get('SELECT * FROM evidence_attachments WHERE evidence_item_id = ?', [item.id]);
      if (old) await this.run('DELETE FROM evidence_attachments WHERE id = ?', [old.id]);
      await this.run(`
        INSERT INTO evidence_attachments
          (id, evidence_item_id, stored_name, original_name, mime_type, size_bytes, sha256)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        metadata.id,
        item.id,
        metadata.storedName,
        metadata.originalName,
        metadata.mimeType,
        metadata.sizeBytes,
        metadata.sha256,
      ]);
      await this.run('UPDATE evidence_items SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [item.id]);
      return old;
    });
  }

  async removeAttachment(item) {
    const old = await this.get('SELECT * FROM evidence_attachments WHERE evidence_item_id = ?', [item.id]);
    if (old) await this.run('DELETE FROM evidence_attachments WHERE id = ?', [old.id]);
    return old;
  }

  async issue(id, signatoryName) {
    const result = await this.run(`
      UPDATE evidence_dossiers
      SET status = 'issued',
          signatory_name = ?,
          accepted_declaration = 1,
          signed_at = CURRENT_TIMESTAMP,
          issued_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'draft'
    `, [signatoryName, id]);
    if (result.changes !== 1) throw new Error('DOSSIER_ISSUE_CONFLICT');
  }
}

module.exports = DossierRepository;
