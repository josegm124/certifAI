CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL COLLATE NOCASE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MVP rule: one company is one account. Both constraints enforce that rule.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_systems (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, name)
);

-- Commercial catalog. Assessment mode (the legacy Tier 1/Tier 2 field) is
-- deliberately separate from certificate level: a free assessment may make a
-- customer eligible for any certificate level without issuing one.
CREATE TABLE IF NOT EXISTS certificate_levels (
  id TEXT PRIMARY KEY CHECK(id IN ('aware', 'aligned', 'assured', 'advanced')),
  code TEXT UNIQUE NOT NULL CHECK(code IN ('A1', 'A2', 'A3', 'A4')),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  score_min INTEGER NOT NULL CHECK(score_min BETWEEN 0 AND 100),
  score_max INTEGER NOT NULL CHECK(score_max BETWEEN 0 AND 100),
  rank INTEGER UNIQUE NOT NULL CHECK(rank BETWEEN 1 AND 4),
  badge_eligible INTEGER NOT NULL CHECK(badge_eligible IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK(score_min <= score_max)
);

CREATE TABLE IF NOT EXISTS certificate_products (
  id TEXT PRIMARY KEY,
  level_id TEXT,
  code TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL CHECK(product_type IN ('assessment', 'certificate')),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  display_order INTEGER UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(level_id) REFERENCES certificate_levels(id) ON DELETE RESTRICT,
  CHECK(
    (product_type = 'assessment' AND level_id IS NULL) OR
    (product_type = 'certificate' AND level_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS product_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
  currency TEXT NOT NULL CHECK(length(currency) = 3),
  billing_period TEXT NOT NULL CHECK(billing_period IN ('one_time', 'year')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES certificate_products(id) ON DELETE CASCADE,
  CHECK(valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE IF NOT EXISTS certificate_product_features (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  FOREIGN KEY(product_id) REFERENCES certificate_products(id) ON DELETE CASCADE,
  UNIQUE(product_id, display_order)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_product_price
  ON product_prices(product_id, currency)
  WHERE active = 1 AND valid_until IS NULL;

INSERT OR IGNORE INTO certificate_levels
  (id, code, name, description, score_min, score_max, rank, badge_eligible)
VALUES
  ('aware', 'A1', 'Aware', 'Internal readiness result. No public badge is issued.', 0, 40, 1, 0),
  ('aligned', 'A2', 'Aligned', 'Entry certificate level for an eligible assessment.', 41, 65, 2, 1),
  ('assured', 'A3', 'Assured', 'Intermediate certificate level for an eligible assessment.', 66, 85, 3, 1),
  ('advanced', 'A4', 'Advanced', 'Highest certificate level for an eligible assessment.', 86, 100, 4, 1);

INSERT OR IGNORE INTO certificate_products
  (id, level_id, code, product_type, name, description, cta_label, display_order)
VALUES
  ('readiness-assessment', NULL, 'READINESS', 'assessment', 'Readiness Assessment', 'Complete 36 questions and receive a score out of 100 before choosing whether to buy a certificate.', 'Start free assessment', 1),
  ('aligned-certificate', 'aligned', 'CERT-ALIGNED', 'certificate', 'Aligned Certificate', 'Available when the assessment supports Aligned or a higher level.', 'Complete assessment first', 2),
  ('assured-certificate', 'assured', 'CERT-ASSURED', 'certificate', 'Assured Certificate', 'Available when the assessment supports Assured or Advanced.', 'Complete assessment first', 3),
  ('advanced-certificate', 'advanced', 'CERT-ADVANCED', 'certificate', 'Advanced Certificate', 'Available only when the assessment supports Advanced.', 'Complete assessment first', 4);

INSERT OR IGNORE INTO product_prices
  (id, product_id, amount_minor, currency, billing_period, active, valid_from)
VALUES
  ('price-readiness-eur', 'readiness-assessment', 0, 'EUR', 'one_time', 1, '2026-01-01 00:00:00'),
  ('price-aligned-eur-annual', 'aligned-certificate', 49000, 'EUR', 'year', 1, '2026-01-01 00:00:00'),
  ('price-assured-eur-annual', 'assured-certificate', 119000, 'EUR', 'year', 1, '2026-01-01 00:00:00'),
  ('price-advanced-eur-annual', 'advanced-certificate', 249000, 'EUR', 'year', 1, '2026-01-01 00:00:00');

INSERT OR IGNORE INTO certificate_product_features
  (id, product_id, label, display_order)
VALUES
  ('feature-readiness-questions', 'readiness-assessment', 'All 36 assessment questions', 1),
  ('feature-readiness-score', 'readiness-assessment', 'Score out of 100 before any purchase', 2),
  ('feature-readiness-dashboard', 'readiness-assessment', 'Maturity dashboard and prioritised gaps', 3),
  ('feature-aligned-eligibility', 'aligned-certificate', 'Requires an Aligned, Assured or Advanced eligible result', 1),
  ('feature-aligned-public', 'aligned-certificate', 'Aligned badge and public verification page', 2),
  ('feature-aligned-annual', 'aligned-certificate', 'Certificate valid for one year', 3),
  ('feature-assured-eligibility', 'assured-certificate', 'Requires an Assured or Advanced eligible result', 1),
  ('feature-assured-public', 'assured-certificate', 'Assured badge and public verification page', 2),
  ('feature-assured-annual', 'assured-certificate', 'Certificate valid for one year', 3),
  ('feature-advanced-eligibility', 'advanced-certificate', 'Requires an Advanced eligible result', 1),
  ('feature-advanced-public', 'advanced-certificate', 'Advanced badge and public verification page', 2),
  ('feature-advanced-annual', 'advanced-certificate', 'Certificate valid for one year', 3);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ai_system_id TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK(tier IN (1, 2)),
  status TEXT NOT NULL CHECK(status IN ('draft', 'finalized')) DEFAULT 'draft',
  completion_percentage REAL NOT NULL DEFAULT 0,
  overall_score REAL,
  badge_tier TEXT CHECK(badge_tier IN ('aware', 'aligned', 'assured', 'advanced')),
  critical_gating_active INTEGER NOT NULL DEFAULT 0,
  signatory_name TEXT,
  self_certified_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(ai_system_id) REFERENCES ai_systems(id) ON DELETE CASCADE,
  FOREIGN KEY(badge_tier) REFERENCES certificate_levels(id) ON DELETE RESTRICT
);

-- SQLite partial index: at most one unfinished assessment per account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_assessment
  ON assessments(user_id) WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS assessment_answers (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  question_id INTEGER NOT NULL CHECK(question_id BETWEEN 1 AND 36),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 5),
  evidence TEXT NOT NULL DEFAULT '',
  attestation TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  UNIQUE(assessment_id, question_id)
);

CREATE TABLE IF NOT EXISTS domain_scores (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  domain_name TEXT NOT NULL,
  score REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  UNIQUE(assessment_id, domain_name)
);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  assessment_id TEXT UNIQUE NOT NULL,
  company_id TEXT NOT NULL,
  tier TEXT CHECK(tier IN ('aligned', 'assured', 'advanced')) NOT NULL,
  score REAL NOT NULL CHECK(score BETWEEN 0 AND 100),
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  verification_token TEXT UNIQUE NOT NULL,
  frameworks_included TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(tier) REFERENCES certificate_levels(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  user_id TEXT,
  assessment_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_products_level ON certificate_products(level_id);
CREATE INDEX IF NOT EXISTS idx_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_answers_assessment ON assessment_answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_badges_company ON badges(company_id);
CREATE INDEX IF NOT EXISTS idx_badges_expires ON badges(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
