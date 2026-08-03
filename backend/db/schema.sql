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
  FOREIGN KEY(ai_system_id) REFERENCES ai_systems(id) ON DELETE CASCADE
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
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_answers_assessment ON assessment_answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_badges_company ON badges(company_id);
CREATE INDEX IF NOT EXISTS idx_badges_expires ON badges(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
