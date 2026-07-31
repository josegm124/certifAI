/* ==============================================================================
   CertifAI — shared domain model (SINGLE SOURCE OF TRUTH)

   Canonical instrument: Marika's June "AI Adoption & Governance Maturity
   Assessment" — 36 questions, 9 domains, 7 frameworks, 0–5 maturity scale.

   Question numbering matches the June document exactly (Q1–Q36), so any
   question id here can be traced straight back to the source instrument.

   Do not fork these constants. The frontend scoring engine reads this file,
   and it is the only place the instrument is defined.
   ============================================================================== */

export interface MaturityLevel {
  score: number;
  label: string;
  desc: string;
}

export const MATURITY_LEVELS: MaturityLevel[] = [
  { score: 0, label: "Not Present", desc: "No activity, process, or capability in place." },
  { score: 1, label: "Awareness", desc: "On the radar, but nothing formalised yet." },
  { score: 2, label: "Emerging", desc: "Early practices for certain systems or teams." },
  { score: 3, label: "Implemented", desc: "Documented and applied consistently across the organisation." },
  { score: 4, label: "Managed", desc: "Actively measured, monitored, and reviewed." },
  { score: 5, label: "Optimised", desc: "Fully embedded and continuously refined." },
];

export interface Domain {
  id: string;
  name: string;
  weight: number;
  blurb: string;
}

/* ------------------------------------------------------------------------------
   DOMAIN WEIGHTS — 9 domains, must sum to 1.00

   The eight governance domains keep their original relative proportions from
   the MVP; they were scaled by 0.94 to make room for the new Revenue & Value
   Generation domain.

   >>> PROVISIONAL: revenue = 0.06, pending Georges's confirmation. <<<
   Rationale for a low weight: this domain measures business value realisation
   rather than compliance readiness, so a high weight would let commercial
   performance inflate what is presented as a governance readiness score.
   Change the value below and rescale the other eight if a different weight
   is agreed — the total must remain 1.00.
   ------------------------------------------------------------------------------ */
export const DOMAINS: Domain[] = [
  { id: "strategy", name: "Strategy & Leadership", weight: 0.09, blurb: "Whether AI is steered from the top with a documented vision, executive accountability, and funded objectives." },
  { id: "revenue", name: "Revenue & Value Generation through AI", weight: 0.06, blurb: "Whether the organisation can measure and monetise the value AI creates, from attributed revenue through to realised return on investment." },
  { id: "governance", name: "Governance & Oversight", weight: 0.13, blurb: "The policies, inventories, and approval gates that keep every AI system visible and controlled." },
  { id: "risk", name: "Risk & Compliance", weight: 0.19, blurb: "How systematically AI risk is found, assessed, and mapped to EU AI Act obligations, including high-risk classification." },
  { id: "data", name: "Data & Model Governance", weight: 0.17, blurb: "Data suitability, quality, provenance, privacy safeguards, and the ability to prove model behaviour to auditors." },
  { id: "human", name: "Human Oversight & Accountability", weight: 0.12, blurb: "Named ownership of AI outputs and the human review that keeps decisions accountable." },
  { id: "trust", name: "Trust, Transparency & Fairness", weight: 0.12, blurb: "Bias assessment, disclosure of AI use, and the ability to explain how systems reach decisions." },
  { id: "workforce", name: "Workforce & Capability", weight: 0.08, blurb: "AI literacy, governance training, and readiness to manage the workforce implications of AI." },
  { id: "improve", name: "Continuous Improvement", weight: 0.04, blurb: "A structured loop for reviewing and continuously strengthening AI governance over time." },
];

export type FrameworkKey = "aiact" | "gdpr" | "oecd" | "g7" | "gpai" | "iso" | "nist";

export const FRAMEWORKS: Record<FrameworkKey, string> = {
  aiact: "EU AI Act",
  gdpr: "GDPR",
  oecd: "OECD AI Principles",
  g7: "G7 Hiroshima",
  gpai: "GPAI Code",
  iso: "ISO/IEC 42001",
  nist: "NIST AI RMF",
};

export interface Question {
  id: number;
  domain: string;
  title: string;
  text: string;
  evidence: string[];
  kpi: string;
  frameworks: FrameworkKey[];
  critical?: boolean;
}

/* NOTE ON FRAMEWORK MAPPING
   The per-question framework tags originate from the prototype, not from
   Marika's June document, which specifies evidence and KPIs but does not
   assign frameworks per question. The tags on the four Revenue & Value
   questions (Q6–Q9) are provisional and should be confirmed by the team
   before the written report claims a framework mapping for that domain. */

export const QUESTIONS: Question[] = [
  /* ---------- Strategy & Leadership (Q1–Q5) ---------- */
  { id: 1, domain: "strategy", title: "AI Strategy", text: "Does your organisation have a documented AI strategy that defines its vision, objectives, and roadmap for AI adoption?", evidence: ["Approved AI strategy", "AI roadmap", "AI vision statement", "Strategic AI objectives"], kpi: "% business units covered", frameworks: ["oecd", "iso"] },
  { id: 2, domain: "strategy", title: "Leadership Commitment", text: "To what extent is senior leadership actively engaged in and accountable for AI-related decisions and outcomes?", evidence: ["Executive sponsor", "Board minutes", "Steering committee charter"], kpi: "Executive participation rate", frameworks: ["iso", "g7"] },
  { id: 3, domain: "strategy", title: "AI Governance Ownership", text: "Is there a clearly defined owner or body responsible for AI governance across the organisation?", evidence: ["RACI matrix", "Governance structure", "Committee terms of reference"], kpi: "% AI systems with owner assigned", frameworks: ["iso", "nist"] },
  { id: 4, domain: "strategy", title: "AI Investment Planning", text: "Does the organisation have a structured process for planning and prioritising AI investments?", evidence: ["Investment plans", "Business cases", "Budget approvals"], kpi: "AI spend vs budget", frameworks: ["iso"] },
  { id: 5, domain: "strategy", title: "AI Business Objectives", text: "Are clear, measurable business objectives defined for each AI initiative?", evidence: ["Business KPIs", "Benefits register", "Performance dashboards"], kpi: "Value generated", frameworks: ["oecd"] },

  /* ---------- Revenue & Value Generation through AI (Q6–Q9) — NEW ---------- */
  { id: 6, domain: "revenue", title: "AI Revenue Contribution", text: "Does the organisation track and report the proportion of revenue directly attributable to AI-enabled products, services, or features?", evidence: ["AI revenue attribution methodology", "Product/service revenue breakdowns", "Management reporting on AI-linked revenue", "Finance sign-off on attribution model"], kpi: "% of total revenue attributable to AI-enabled offerings", frameworks: ["iso"] },
  { id: 7, domain: "revenue", title: "AI Monetisation Strategy", text: "Has the organisation defined a strategy for monetising AI capabilities, whether through new products, premium features, pricing changes, or new business models?", evidence: ["AI monetisation strategy or business case", "New AI product/feature launch plans", "Pricing and packaging documentation", "Commercial roadmap referencing AI"], kpi: "% of product roadmap items with an identified AI monetisation path", frameworks: ["iso"] },
  { id: 8, domain: "revenue", title: "AI ROI & Value Realisation", text: "Does the organisation measure the financial return on its AI investments, including cost savings, efficiency gains, and incremental revenue?", evidence: ["AI value realisation reports", "Business case vs actuals tracking", "ROI calculation methodology", "Finance or governance sign-off on results"], kpi: "% of AI initiatives with a measured ROI", frameworks: ["iso"] },
  { id: 9, domain: "revenue", title: "AI-Driven Customer Growth", text: "Does the organisation measure the impact of AI on customer acquisition, retention, and account growth (upsell or cross-sell)?", evidence: ["Customer analytics linking AI to growth metrics", "Upsell/cross-sell performance data", "Retention and churn reports segmented by AI use", "A/B test or experiment results for AI features"], kpi: "% change in customer retention attributable to AI features", frameworks: ["oecd", "iso"] },

  /* ---------- Governance & Oversight (Q10–Q14) ---------- */
  { id: 10, domain: "governance", title: "AI System Inventory", text: "Does the organisation maintain an up-to-date inventory of all AI systems in use or development?", evidence: ["AI inventory", "Asset register", "Model register"], kpi: "% AI systems registered", frameworks: ["aiact", "iso", "nist"] },
  { id: 11, domain: "governance", title: "AI Governance Policies", text: "Are formal AI governance policies in place that define standards, responsibilities, and acceptable use?", evidence: ["AI policy", "Responsible AI policy", "Governance framework"], kpi: "Policy compliance rate", frameworks: ["aiact", "iso", "oecd"] },
  { id: 12, domain: "governance", title: "Use-Case Approval", text: "Is there a defined process for reviewing and approving new AI use cases before deployment?", evidence: ["Approval workflow", "Use-case register", "Sign-off logs"], kpi: "% use-cases reviewed", frameworks: ["aiact", "iso"] },
  { id: 13, domain: "governance", title: "Governance Reporting", text: "Are regular reports on AI governance, risk, and performance provided to leadership?", evidence: ["Governance reports", "Dashboards", "Board packs"], kpi: "Reporting frequency", frameworks: ["iso", "nist"] },
  { id: 14, domain: "governance", title: "Third-Party AI Oversight", text: "Does the organisation have controls to oversee AI systems or services provided by third parties?", evidence: ["Vendor assessments", "Contract clauses", "Due diligence records"], kpi: "% vendors assessed", frameworks: ["aiact", "iso", "gpai"] },

  /* ---------- Risk & Compliance (Q15–Q19) ---------- */
  { id: 15, domain: "risk", title: "AI Risk Identification", text: "Does the organisation have a process for systematically identifying risks associated with AI systems?", evidence: ["Risk register", "Risk taxonomy", "Threat assessments"], kpi: "Risks identified per system", frameworks: ["aiact", "nist", "iso"] },
  { id: 16, domain: "risk", title: "AI Risk Assessments", text: "Are formal risk assessments conducted for AI systems before and during deployment?", evidence: ["Risk assessments", "Mitigation plans", "Residual risk records"], kpi: "% systems assessed", frameworks: ["aiact", "nist", "iso"] },
  { id: 17, domain: "risk", title: "EU AI Act Readiness", critical: true, text: "How prepared is the organisation to comply with the requirements of the EU AI Act?", evidence: ["Gap analysis", "Compliance roadmap", "Annex IV technical file"], kpi: "Compliance maturity score", frameworks: ["aiact"] },
  { id: 18, domain: "risk", title: "High-Risk AI Identification", critical: true, text: "Has the organisation identified which AI systems fall into high-risk categories under Annex III?", evidence: ["Classification methodology", "High-risk register", "Annex III mapping"], kpi: "% systems classified", frameworks: ["aiact"] },
  { id: 19, domain: "risk", title: "AI Incident Response", text: "Is there a defined process for detecting, reporting, and responding to AI-related incidents?", evidence: ["Incident response plan", "Incident log", "Escalation procedures"], kpi: "Incident response time", frameworks: ["aiact", "nist"] },

  /* ---------- Data & Model Governance (Q20–Q25) ---------- */
  { id: 20, domain: "data", title: "AI Audit Readiness", text: "Is the organisation prepared to demonstrate AI system behaviour, decisions, and compliance to auditors?", evidence: ["Audit trails", "Logging records", "Documentation packs"], kpi: "Audit findings", frameworks: ["aiact", "iso"] },
  { id: 21, domain: "data", title: "Data Suitability", text: "Are the data sources used to train or operate AI systems assessed for suitability and quality?", evidence: ["Dataset inventory", "Data quality assessments"], kpi: "Data quality score", frameworks: ["aiact", "iso"] },
  { id: 22, domain: "data", title: "Data Quality Controls", text: "Are controls in place to ensure the quality, accuracy, and consistency of data used by AI systems?", evidence: ["Validation reports", "Data quality controls", "Monitoring records"], kpi: "Data accuracy", frameworks: ["aiact", "iso"] },
  { id: 23, domain: "data", title: "Personal Data Protection", text: "Are appropriate safeguards in place to protect personal data when used by AI systems?", evidence: ["DPIA records", "Processing records", "GDPR controls"], kpi: "Privacy incidents", frameworks: ["gdpr", "aiact"] },
  { id: 24, domain: "data", title: "Privacy Impact Assessments", text: "Are Privacy/Data Protection Impact Assessments conducted for AI systems?", evidence: ["PIAs", "Risk reviews", "Mitigation tracking"], kpi: "% systems assessed", frameworks: ["gdpr"] },
  { id: 25, domain: "data", title: "Training Data Management", text: "Does the organisation manage the provenance, lineage, and versioning of training data?", evidence: ["Dataset documentation", "Data lineage", "Version control records"], kpi: "Documented datasets", frameworks: ["aiact", "gpai", "iso"] },

  /* ---------- Human Oversight & Accountability (Q26–Q28) ---------- */
  { id: 26, domain: "human", title: "Human Accountability", critical: true, text: "Are named individuals accountable for the decisions and outputs produced by AI systems?", evidence: ["Accountability matrix", "Approval records", "Governance roles"], kpi: "Ownership coverage", frameworks: ["aiact", "oecd", "iso"] },
  { id: 27, domain: "human", title: "Output Verification", text: "Are processes in place to verify the accuracy and reliability of AI outputs before they are acted upon?", evidence: ["Testing reports", "Validation procedures", "Monitoring logs"], kpi: "Output accuracy", frameworks: ["aiact", "nist"] },
  { id: 28, domain: "human", title: "Human Review Requirements", text: "Are there defined criteria for when human review of AI outputs is required?", evidence: ["Review procedures", "Exception logs", "Escalation workflows"], kpi: "Human review rate", frameworks: ["aiact", "oecd"] },

  /* ---------- Trust, Transparency & Fairness (Q29–Q31) ---------- */
  { id: 29, domain: "trust", title: "AI Bias Assessments", text: "Does the organisation conduct assessments to identify and mitigate bias in AI systems?", evidence: ["Bias reports", "Fairness metrics", "Mitigation plans"], kpi: "Bias incidents", frameworks: ["aiact", "oecd", "nist"] },
  { id: 30, domain: "trust", title: "Transparency of AI Use", text: "Are stakeholders or affected individuals informed when AI is used to make or support decisions?", evidence: ["Disclosure notices", "Customer communications", "Usage statements"], kpi: "Disclosure coverage", frameworks: ["aiact", "oecd"] },
  { id: 31, domain: "trust", title: "Explainability", text: "Can the organisation explain how its AI systems reach decisions in understandable terms?", evidence: ["Model cards", "Explainability reports", "Decision records"], kpi: "Explainability coverage", frameworks: ["aiact", "oecd", "nist"] },

  /* ---------- Workforce & Capability (Q32–Q35) ---------- */
  { id: 32, domain: "workforce", title: "Autonomous Agent Oversight", text: "Does the organisation have controls for overseeing AI systems that act autonomously?", evidence: ["Agent governance framework", "Monitoring records", "Intervention logs"], kpi: "Agent review frequency", frameworks: ["aiact", "g7", "gpai"] },
  { id: 33, domain: "workforce", title: "AI Literacy", text: "Do staff across the organisation have a sufficient understanding of AI and its responsible use?", evidence: ["Training records", "Assessment results", "Awareness campaigns"], kpi: "Training completion rate", frameworks: ["aiact", "oecd"] },
  { id: 34, domain: "workforce", title: "AI Governance Training", text: "Are employees with governance, risk, or oversight responsibilities trained on AI governance?", evidence: ["Governance curriculum", "Attendance logs", "Competency tests"], kpi: "Governance training coverage", frameworks: ["iso", "aiact"] },
  { id: 35, domain: "workforce", title: "Workforce Readiness", text: "Is the organisation prepared to manage the workforce implications of AI adoption?", evidence: ["Skills assessments", "Workforce plans", "Change management plans"], kpi: "Readiness score", frameworks: ["oecd", "g7"] },

  /* ---------- Continuous Improvement (Q36) ---------- */
  { id: 36, domain: "improve", title: "Continuous Improvement", text: "Does the organisation have a structured process for reviewing and continuously improving its AI governance?", evidence: ["Improvement plans", "Lessons learned", "Corrective action logs"], kpi: "Actions completed", frameworks: ["iso", "nist"] },
];

/* Critical controls gate the badge level. Under the June numbering these are
   Q17 (EU AI Act Readiness), Q18 (High-Risk AI Identification), and
   Q26 (Human Accountability). Previously 13, 14 and 22 under MVP numbering. */
export const CRITICAL_IDS: number[] = QUESTIONS.filter((q) => q.critical).map((q) => q.id);

/* Guard rails — cheap invariants so a bad edit fails loudly rather than
   silently skewing every score. */
export const TOTAL_QUESTIONS = QUESTIONS.length; // 36
export const TOTAL_DOMAINS = DOMAINS.length; // 9
export const TOTAL_FRAMEWORKS = Object.keys(FRAMEWORKS).length; // 7
export const MAX_SCORE = MATURITY_LEVELS[MATURITY_LEVELS.length - 1].score; // 5

/* ------------------------------------------------------------------------------
   DERIVED FACTS — every user-facing statement of "how big is the instrument"
   must come from here.

   The landing page previously hardcoded "32 controls" and "8 domains" in five
   places and went stale the moment the ninth domain landed, telling visitors
   the wrong instrument while the page rendered the right one. Nothing below is
   typed; it is all counted from the arrays above.
   ------------------------------------------------------------------------------ */

/** Canonical sentence from the project brief, section 3, with live numbers. */
export const CANONICAL_SENTENCE =
  `${TOTAL_QUESTIONS} questions across ${TOTAL_DOMAINS} governance domains, ` +
  `mapped to ${TOTAL_FRAMEWORKS} regulatory frameworks and scored on a 0 to ${MAX_SCORE} maturity scale`;

/** English word for the small counts the copy uses ("Nine weighted domains."). */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);

/** Sentence-case variant for the start of a sentence. */
export const NumberWord = (n: number): string => {
  const w = numberWord(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
};

/**
 * Short axis labels for the radar and any tight layout.
 *
 * SINGLE SOURCE. This lived as a private copy in both Landing.tsx and
 * Dashboard.tsx; both were missing "revenue" when the ninth domain was added,
 * so the radar silently drew an unlabelled axis. Derived from DOMAINS so a new
 * domain gets a usable label automatically, with overrides only where the full
 * name is too long for an axis.
 */
const SHORT_OVERRIDES: Record<string, string> = {
  human: "Oversight",
  trust: "Trust",
  improve: "Improve",
  revenue: "Revenue",
};
export const DOMAIN_SHORT: Record<string, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.id, SHORT_OVERRIDES[d.id] ?? d.name.split(/[\s&]/)[0]])
);

const WEIGHT_SUM = DOMAINS.reduce((a, d) => a + d.weight, 0);
if (Math.abs(WEIGHT_SUM - 1) > 0.0001) {
  throw new Error(
    `CertifAI domain weights must sum to 1.00, got ${WEIGHT_SUM.toFixed(4)}. Check DOMAINS in data.ts.`
  );
}

/* Every domain must have a short label, or the radar draws a blank axis —
   which is exactly how the missing "revenue" entry went unnoticed. */
const MISSING_SHORT = DOMAINS.filter((d) => !DOMAIN_SHORT[d.id]).map((d) => d.id);
if (MISSING_SHORT.length) {
  throw new Error(`CertifAI: no short label for domain(s) ${MISSING_SHORT.join(", ")}. Check DOMAIN_SHORT in data.ts.`);
}
