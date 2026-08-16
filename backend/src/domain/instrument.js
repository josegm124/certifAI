const DOMAINS = [
  { id: 'strategy', name: 'Strategy & Leadership', short: 'Strategy', weight: 0.09, questionIds: [1, 2, 3, 4, 5] },
  { id: 'revenue', name: 'Revenue & Value Generation through AI', short: 'Revenue', weight: 0.06, questionIds: [6, 7, 8, 9] },
  { id: 'governance', name: 'Governance & Oversight', short: 'Governance', weight: 0.13, questionIds: [10, 11, 12, 13, 14] },
  { id: 'risk', name: 'Risk & Compliance', short: 'Risk', weight: 0.19, questionIds: [15, 16, 17, 18, 19] },
  { id: 'data', name: 'Data & Model Governance', short: 'Data', weight: 0.17, questionIds: [20, 21, 22, 23, 24, 25] },
  { id: 'human', name: 'Human Oversight & Accountability', short: 'Oversight', weight: 0.12, questionIds: [26, 27, 28] },
  { id: 'trust', name: 'Trust, Transparency & Fairness', short: 'Trust', weight: 0.12, questionIds: [29, 30, 31] },
  { id: 'workforce', name: 'Workforce & Capability', short: 'Workforce', weight: 0.08, questionIds: [32, 33, 34, 35] },
  { id: 'improve', name: 'Continuous Improvement', short: 'Improve', weight: 0.04, questionIds: [36] },
];

const QUESTION_IDS = DOMAINS.flatMap((domain) => domain.questionIds);
const FRAMEWORKS = ['aiact', 'gdpr', 'oecd', 'iso', 'nist'];

// Dashboard labels and mappings are served by the backend together with the
// calculated values. FRAMEWORKS above remains the smaller badge claim set;
// this catalog represents every framework covered by the questionnaire.
const DASHBOARD_FRAMEWORKS = [
  { id: 'aiact', name: 'EU AI Act', short: 'EU AI Act', type: 'Binding law' },
  { id: 'gpai', name: 'GPAI Code of Practice', short: 'GPAI Code', type: 'Voluntary code' },
  { id: 'iso', name: 'ISO/IEC 42001', short: 'ISO 42001', type: 'Certifiable standard' },
  { id: 'nist', name: 'NIST AI RMF', short: 'NIST', type: 'Voluntary code' },
  { id: 'gdpr', name: 'GDPR', short: 'GDPR', type: 'Binding law' },
  { id: 'g7', name: 'G7 Hiroshima Code', short: 'G7', type: 'Voluntary code' },
  { id: 'oecd', name: 'OECD AI Principles', short: 'OECD', type: 'Principles' },
];

const QUESTION_METADATA = {
  1: { domainId: 'strategy', title: 'AI Strategy', frameworks: ['oecd', 'iso'] },
  2: { domainId: 'strategy', title: 'Leadership Commitment', frameworks: ['iso', 'g7'] },
  3: { domainId: 'strategy', title: 'AI Governance Ownership', frameworks: ['iso', 'nist'] },
  4: { domainId: 'strategy', title: 'AI Investment Planning', frameworks: ['iso'] },
  5: { domainId: 'strategy', title: 'AI Business Objectives', frameworks: ['oecd'] },
  6: { domainId: 'revenue', title: 'AI Revenue Contribution', frameworks: ['iso'] },
  7: { domainId: 'revenue', title: 'AI Monetisation Strategy', frameworks: ['iso'] },
  8: { domainId: 'revenue', title: 'AI ROI & Value Realisation', frameworks: ['iso'] },
  9: { domainId: 'revenue', title: 'AI-Driven Customer Growth', frameworks: ['oecd', 'iso'] },
  10: { domainId: 'governance', title: 'AI System Inventory', frameworks: ['aiact', 'iso', 'nist'] },
  11: { domainId: 'governance', title: 'AI Governance Policies', frameworks: ['aiact', 'iso', 'oecd'] },
  12: { domainId: 'governance', title: 'Use-Case Approval', frameworks: ['aiact', 'iso'] },
  13: { domainId: 'governance', title: 'Governance Reporting', frameworks: ['iso', 'nist'] },
  14: { domainId: 'governance', title: 'Third-Party AI Oversight', frameworks: ['aiact', 'iso', 'gpai'] },
  15: { domainId: 'risk', title: 'AI Risk Identification', frameworks: ['aiact', 'nist', 'iso'] },
  16: { domainId: 'risk', title: 'AI Risk Assessments', frameworks: ['aiact', 'nist', 'iso'] },
  17: { domainId: 'risk', title: 'EU AI Act Readiness', frameworks: ['aiact'] },
  18: { domainId: 'risk', title: 'High-Risk AI Identification', frameworks: ['aiact'] },
  19: { domainId: 'risk', title: 'AI Incident Response', frameworks: ['aiact', 'nist'] },
  20: { domainId: 'data', title: 'AI Audit Readiness', frameworks: ['aiact', 'iso'] },
  21: { domainId: 'data', title: 'Data Suitability', frameworks: ['aiact', 'iso'] },
  22: { domainId: 'data', title: 'Data Quality Controls', frameworks: ['aiact', 'iso'] },
  23: { domainId: 'data', title: 'Personal Data Protection', frameworks: ['gdpr', 'aiact'] },
  24: { domainId: 'data', title: 'Privacy Impact Assessments', frameworks: ['gdpr'] },
  25: { domainId: 'data', title: 'Training Data Management', frameworks: ['aiact', 'gpai', 'iso'] },
  26: { domainId: 'human', title: 'Human Accountability', frameworks: ['aiact', 'oecd', 'iso'] },
  27: { domainId: 'human', title: 'Output Verification', frameworks: ['aiact', 'nist'] },
  28: { domainId: 'human', title: 'Human Review Requirements', frameworks: ['aiact', 'oecd'] },
  29: { domainId: 'trust', title: 'AI Bias Assessments', frameworks: ['aiact', 'oecd', 'nist'] },
  30: { domainId: 'trust', title: 'Transparency of AI Use', frameworks: ['aiact', 'oecd'] },
  31: { domainId: 'trust', title: 'Explainability', frameworks: ['aiact', 'oecd', 'nist'] },
  32: { domainId: 'workforce', title: 'Autonomous Agent Oversight', frameworks: ['aiact', 'g7', 'gpai'] },
  33: { domainId: 'workforce', title: 'AI Literacy', frameworks: ['aiact', 'oecd'] },
  34: { domainId: 'workforce', title: 'AI Governance Training', frameworks: ['iso', 'aiact'] },
  35: { domainId: 'workforce', title: 'Workforce Readiness', frameworks: ['oecd', 'g7'] },
  36: { domainId: 'improve', title: 'Continuous Improvement', frameworks: ['iso', 'nist'] },
};

module.exports = {
  DOMAINS,
  QUESTION_IDS,
  FRAMEWORKS,
  DASHBOARD_FRAMEWORKS,
  QUESTION_METADATA,
};
