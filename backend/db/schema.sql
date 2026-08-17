PRAGMA foreign_keys = ON;

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL COLLATE NOCASE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  company_id TEXT UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_systems (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, name)
);

CREATE TABLE certificate_levels (
  id TEXT PRIMARY KEY CHECK(id IN ('aware', 'aligned', 'assured', 'advanced')),
  code TEXT UNIQUE NOT NULL CHECK(code IN ('A1', 'A2', 'A3', 'A4')),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  score_min INTEGER NOT NULL CHECK(score_min BETWEEN 0 AND 100),
  score_max INTEGER NOT NULL CHECK(score_max BETWEEN 0 AND 100),
  rank INTEGER UNIQUE NOT NULL CHECK(rank BETWEEN 1 AND 4),
  badge_eligible INTEGER NOT NULL CHECK(badge_eligible IN (0, 1)),
  CHECK(score_min <= score_max)
);

CREATE TABLE certificate_products (
  id TEXT PRIMARY KEY,
  level_id TEXT NOT NULL REFERENCES certificate_levels(id) ON DELETE RESTRICT,
  code TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL CHECK(product_type = 'certificate'),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  display_order INTEGER UNIQUE NOT NULL
);

CREATE TABLE product_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES certificate_products(id) ON DELETE CASCADE,
  amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
  currency TEXT NOT NULL CHECK(length(currency) = 3),
  billing_period TEXT NOT NULL CHECK(billing_period IN ('one_time', 'year')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  CHECK(valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE certificate_product_features (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES certificate_products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  UNIQUE(product_id, display_order)
);

INSERT INTO certificate_levels
  (id, code, name, description, score_min, score_max, rank, badge_eligible)
VALUES
  ('aware', 'A1', 'Aware', 'Internal readiness result; no public certificate.', 0, 40, 1, 0),
  ('aligned', 'A2', 'Aligned', 'Entry certificate level for an eligible result.', 41, 65, 2, 1),
  ('assured', 'A3', 'Assured', 'Intermediate certificate level for an eligible result.', 66, 85, 3, 1),
  ('advanced', 'A4', 'Advanced', 'Highest certificate level for an eligible result.', 86, 100, 4, 1);

INSERT INTO certificate_products
  (id, level_id, code, product_type, name, description, cta_label, active, display_order)
VALUES
  ('aligned-certificate', 'aligned', 'CERT-ALIGNED', 'certificate', 'Aligned Certificate', 'Available after an eligible evidence dossier.', 'Open evidence dossier', 1, 1),
  ('assured-certificate', 'assured', 'CERT-ASSURED', 'certificate', 'Assured Certificate', 'Available after an eligible evidence dossier.', 'Open evidence dossier', 1, 2),
  ('advanced-certificate', 'advanced', 'CERT-ADVANCED', 'certificate', 'Advanced Certificate', 'Available after an eligible evidence dossier.', 'Open evidence dossier', 1, 3);

INSERT INTO product_prices
  (id, product_id, amount_minor, currency, billing_period, active, valid_from)
VALUES
  ('price-aligned-eur-annual', 'aligned-certificate', 34900, 'EUR', 'year', 1, '2026-01-01 00:00:00'),
  ('price-assured-eur-annual', 'assured-certificate', 64900, 'EUR', 'year', 1, '2026-01-01 00:00:00'),
  ('price-advanced-eur-annual', 'advanced-certificate', 119000, 'EUR', 'year', 1, '2026-01-01 00:00:00');

INSERT INTO certificate_product_features
  (id, product_id, label, display_order)
VALUES
  ('feature-aligned-evidence', 'aligned-certificate', 'Evidence dossier and public certificate', 1),
  ('feature-aligned-annual', 'aligned-certificate', 'Certificate valid for one year', 2),
  ('feature-assured-evidence', 'assured-certificate', 'Evidence dossier and public certificate', 1),
  ('feature-assured-annual', 'assured-certificate', 'Certificate valid for one year', 2),
  ('feature-advanced-evidence', 'advanced-certificate', 'Evidence dossier and public certificate', 1),
  ('feature-advanced-annual', 'advanced-certificate', 'Certificate valid for one year', 2);

CREATE TABLE assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE RESTRICT,
  adoption_stage INTEGER NOT NULL CHECK(adoption_stage BETWEEN 1 AND 4),
  result_level_id TEXT REFERENCES certificate_levels(id) ON DELETE RESTRICT,
  remediation_source_assessment_id TEXT REFERENCES assessments(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('draft', 'finalized')) DEFAULT 'draft',
  completion_percentage REAL NOT NULL DEFAULT 0,
  overall_score REAL CHECK(overall_score BETWEEN 0 AND 100),
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_one_active_assessment
  ON assessments(user_id) WHERE status = 'draft';

CREATE TABLE assessment_answers (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL CHECK(question_id BETWEEN 1 AND 36),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 5),
  evidence TEXT NOT NULL DEFAULT '',
  attestation TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assessment_id, question_id)
);

CREATE TABLE domain_scores (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  score REAL NOT NULL CHECK(score BETWEEN 0 AND 100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assessment_id, domain_name)
);

CREATE TABLE critical_controls (
  question_id INTEGER PRIMARY KEY CHECK(question_id BETWEEN 1 AND 36),
  domain_id TEXT NOT NULL,
  guidance_text TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE critical_control_thresholds (
  question_id INTEGER NOT NULL REFERENCES critical_controls(question_id) ON DELETE CASCADE,
  adoption_stage INTEGER NOT NULL CHECK(adoption_stage BETWEEN 1 AND 4),
  threshold_required INTEGER NOT NULL CHECK(threshold_required BETWEEN 0 AND 5),
  PRIMARY KEY(question_id, adoption_stage)
);

INSERT INTO critical_controls (question_id, domain_id, guidance_text) VALUES
  (1, 'strategy', 'You don’t yet have a documented AI strategy in place, and that’s the foundation everything else builds on. This is your opportunity to put one together. Start by writing down your organisation’s vision for AI: what you want it to do for your business, which goals it supports, and who is responsible for it. Even a short, approved document with a roadmap of your planned AI initiatives will move you forward. Get it signed off by a senior owner, make sure it reflects your actual business priorities, and commit to reviewing it regularly. Once that foundation is in place, you’ll be surprised how much clearer everything else becomes.'),
  (8, 'revenue', 'Your organisation is using AI, but the value it’s delivering isn’t yet being measured, and that makes it hard to justify investment, prioritise the right initiatives, or demonstrate impact to leadership. The fix is straightforward: start tracking outcomes. For each AI initiative, go back to the original business case and compare it to what actually happened. Did you save the time you expected? Did costs go down? Capture this in a simple value realisation report, get finance or your governance body to sign off on the findings, and repeat the exercise regularly. You don’t need a perfect methodology on day one. What matters is that measurement starts now.'),
  (11, 'governance', 'Right now, your organisation is using AI without a formal policy framework to guide it, and that creates risk for both your people and your business. The good news is that building this doesn’t have to be complicated. Start with an AI acceptable use policy that clearly sets out what AI can and cannot be used for in your organisation, who is responsible, and how decisions are made. Pair that with a responsible AI framework covering ethics, data handling, and accountability. Get both documents formally approved, make sure your staff have read and acknowledged them, and set a date to review them. Clear policies protect your organisation and give your teams the confidence to use AI the right way.'),
  (16, 'risk', 'Every AI system your organisation uses carries some level of risk, to data, to decisions, and to people affected by those decisions. Right now, those risks aren’t being formally assessed before deployment, and under the EU AI Act, that’s a compliance gap that needs to close. The path forward is clear: before any AI system goes live, conduct a structured risk assessment. Document what could go wrong, how likely it is, how serious the impact would be, and what you’re doing to reduce it. Get those assessments reviewed and signed off. Then track how risks evolve over time. This isn’t about creating bureaucracy. It’s about making sure you’re in control of the technology you’re deploying.'),
  (23, 'data', 'Your AI systems are handling personal data, and the safeguards required under GDPR are not yet fully in place. This is one of the most important gaps to close, not just for compliance, but because your customers and employees trust you with their information. Start by conducting Data Protection Impact Assessments for every AI system that processes personal data. Record what data you’re using, why you’re using it, and how long you’re keeping it. Put clear procedures in place for handling data subject rights requests, covering access, erasure and objection. Track any privacy incidents and work to bring that number down to zero. Getting this right demonstrates that your organisation takes data protection seriously, and that’s something regulators, partners, and customers all notice.'),
  (26, 'human', 'At the moment, no named individual is clearly accountable for the decisions and outputs your AI systems produce. That’s a gap, because when AI gets something wrong, or when a decision is questioned, there needs to be a person who owns it. This is about more than compliance: it’s about building trust in your AI systems internally and externally. Create an accountability matrix that assigns a named owner to each AI system. Document who has the authority to approve decisions, who gets escalated to when something goes wrong, and how those escalation paths work in practice. Review these assignments regularly as your AI landscape changes. Clear human accountability is what separates responsible AI use from unmanaged risk.'),
  (29, 'trust', 'AI systems can produce biased outputs, and without formal assessments, those biases can go undetected and cause real harm to real people. The EU AI Act places direct obligations on organisations to assess and mitigate bias, and right now that work isn’t yet being done. Before any AI model is deployed, run a bias assessment. Look at the training data, test how the model performs across different demographic groups, and document your fairness metrics. Where bias is found, produce a mitigation plan and retest after changes are made. Keep records of everything. This isn’t just a regulatory requirement. It’s how you ensure your AI systems treat people fairly, and that’s something worth being proud of getting right.'),
  (34, 'workforce', 'The people in your organisation responsible for governance, risk, legal, and oversight are making decisions about AI every day, but they haven’t yet received the training they need to do that confidently and compliantly. That’s a gap worth closing quickly. Put together a structured training programme that covers your regulatory obligations, your organisation’s own AI policies, and the ethical principles that should guide AI use. Deliver it to everyone with an oversight or governance role. Record who attended, track completion, run assessments to check understanding, and refresh the training regularly as the regulatory landscape evolves. Informed people make better decisions, and better decisions mean better outcomes for your organisation and the people it serves.'),
  (36, 'improve', 'Your organisation is using AI, but there’s no structured process yet for learning from it, improving it, and making sure it keeps performing as expected over time. AI systems don’t stand still: models drift, regulations change, and business needs evolve. Now is the time to build the habit of continuous improvement. After deployment, monitor how your AI systems are performing. Run regular reviews, capture lessons learned, and turn those lessons into concrete actions. Benchmark your practices against what others in your sector are doing. Keep corrective action logs so you can demonstrate that issues are identified and resolved. Organisations that improve continuously don’t just maintain their certificate: they build genuinely better, safer, and more valuable AI capabilities over time.');

INSERT INTO critical_control_thresholds
  (question_id, adoption_stage, threshold_required)
VALUES
  (1,1,1),(1,2,2),(1,3,3),(1,4,4),
  (8,1,0),(8,2,0),(8,3,2),(8,4,3),
  (11,1,1),(11,2,2),(11,3,3),(11,4,4),
  (16,1,2),(16,2,3),(16,3,4),(16,4,4),
  (23,1,2),(23,2,3),(23,3,4),(23,4,4),
  (26,1,1),(26,2,2),(26,3,3),(26,4,4),
  (29,1,2),(29,2,3),(29,3,4),(29,4,4),
  (34,1,1),(34,2,2),(34,3,3),(34,4,4),
  (36,1,1),(36,2,2),(36,3,3),(36,4,4);

CREATE TABLE assessment_critical_flags (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES critical_controls(question_id) ON DELETE RESTRICT,
  score_given INTEGER NOT NULL CHECK(score_given BETWEEN 0 AND 5),
  threshold_required INTEGER NOT NULL CHECK(threshold_required BETWEEN 0 AND 5),
  status TEXT NOT NULL CHECK(status IN ('passed', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(assessment_id, question_id)
);

CREATE TRIGGER assessment_critical_flags_immutable_update
  BEFORE UPDATE ON assessment_critical_flags
  BEGIN SELECT RAISE(ABORT, 'ASSESSMENT_CRITICAL_FLAGS_IMMUTABLE'); END;
CREATE TRIGGER assessment_critical_flags_immutable_delete
  BEFORE DELETE ON assessment_critical_flags
  BEGIN SELECT RAISE(ABORT, 'ASSESSMENT_CRITICAL_FLAGS_IMMUTABLE'); END;

CREATE TABLE evidence_dossiers (
  id TEXT PRIMARY KEY,
  assessment_id TEXT UNIQUE NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  selected_product_id TEXT NOT NULL REFERENCES certificate_products(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('draft', 'issued')) DEFAULT 'draft',
  signatory_name TEXT,
  accepted_declaration INTEGER NOT NULL DEFAULT 0 CHECK(accepted_declaration IN (0, 1)),
  signed_at DATETIME,
  issued_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evidence_items (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES evidence_dossiers(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES critical_controls(question_id) ON DELETE RESTRICT,
  written_reference TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dossier_id, question_id)
);

CREATE TABLE evidence_attachments (
  id TEXT PRIMARY KEY,
  evidence_item_id TEXT UNIQUE NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  stored_name TEXT UNIQUE NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 10485760),
  sha256 TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessment_domain_confirmations (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL,
  confirmed_at DATETIME NOT NULL,
  PRIMARY KEY(assessment_id, domain_id)
);

CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  dossier_id TEXT UNIQUE NOT NULL REFERENCES evidence_dossiers(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES certificate_products(id) ON DELETE RESTRICT,
  assessment_id TEXT UNIQUE NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK(tier IN ('aligned', 'assured', 'advanced')) REFERENCES certificate_levels(id) ON DELETE RESTRICT,
  score REAL NOT NULL CHECK(score BETWEEN 0 AND 100),
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  verification_token TEXT UNIQUE NOT NULL,
  frameworks_included TEXT
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  assessment_id TEXT REFERENCES assessments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_answers_assessment ON assessment_answers(assessment_id);
CREATE INDEX idx_flags_assessment ON assessment_critical_flags(assessment_id);
CREATE INDEX idx_dossiers_assessment ON evidence_dossiers(assessment_id);
CREATE INDEX idx_badges_company ON badges(company_id);
CREATE INDEX idx_badges_expires ON badges(expires_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
