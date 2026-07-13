-- Companies (the business entity being assessed; deduplicated by name)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL COLLATE NOCASE,
  tier TEXT CHECK(tier IN ('free', 'starter', 'professional', 'enterprise')) DEFAULT 'free',
  subscription_id TEXT,
  subscription_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users (the person who fills out an assessment; no login/password, just a lead record)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- AI Systems tracked by company
CREATE TABLE IF NOT EXISTS ai_systems (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, name)
);

-- Assessments (one per AI System per cycle; user_id records who started it and when)
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ai_system_id TEXT NOT NULL,
  tier TEXT CHECK(tier IN ('free', 'starter', 'professional', 'enterprise')) DEFAULT 'free',
  completion_percentage REAL DEFAULT 0,
  overall_score REAL DEFAULT 0,
  badge_tier TEXT CHECK(badge_tier IN ('aware', 'aligned', 'assured')) DEFAULT 'aware',
  critical_gating_active BOOLEAN DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(ai_system_id) REFERENCES ai_systems(id) ON DELETE CASCADE
);

-- Assessment Answers (0-5 per question)
CREATE TABLE IF NOT EXISTS assessment_answers (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  score INTEGER CHECK(score >= 0 AND score <= 5),
  evidence TEXT,
  attestation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  UNIQUE(assessment_id, question_id)
);

-- Domain Scores (cached per assessment)
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

-- Badges (issued after completion; the certified entity is the company)
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  tier TEXT CHECK(tier IN ('aware', 'aligned', 'assured')) NOT NULL,
  score REAL NOT NULL,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  verification_token TEXT UNIQUE,
  frameworks_included TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Dossiers (generated reports)
CREATE TABLE IF NOT EXISTS dossiers (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  frameworks TEXT NOT NULL,
  pdf_url TEXT,
  json_url TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  tier TEXT CHECK(tier IN ('free', 'starter', 'professional', 'enterprise')) NOT NULL,
  price_eur REAL,
  starts_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  renewal_email_sent_at DATETIME,
  status TEXT CHECK(status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Audit Logs (for tracking changes)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_system ON assessments(ai_system_id);
CREATE INDEX IF NOT EXISTS idx_answers_assessment ON assessment_answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_badges_assessment ON badges(assessment_id);
CREATE INDEX IF NOT EXISTS idx_badges_company ON badges(company_id);
CREATE INDEX IF NOT EXISTS idx_badges_expires ON badges(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
