import type { Answers } from "./scoring";

/**
 * A realistic seeded profile so the dashboard is "alive" immediately.
 *
 * REWRITTEN FOR THE CANONICAL INSTRUMENT (36 questions, 9 domains). The previous
 * version was authored against the old 32-question / 8-domain set: its domain
 * comments no longer matched the numbering, it left Q33-Q36 unanswered so the
 * assessment could never reach 100% completion, and it carried no evidence at
 * all — which meant the backend correctly refused to issue a badge and the demo
 * dead-ended.
 *
 * Profile: a mid-journey organisation. Strong on strategy, governance and risk;
 * visibly weaker on trust, workforce and the new revenue domain.
 *
 * Lands at 69/100 → Assured (A3), once signed and submitted.
 */
export const SAMPLE_ORG = "Northstar Recruitment AI";

/** Shorthand: score + evidence reference + attestation. */
const e = (score: number, detail: string) => ({ score, detail, attested: true });

export const SAMPLE_ANSWERS: Answers = {
  /* Strategy & Leadership (Q1-Q5) */
  1: e(4, "AI Strategy 2026-28, board-approved Mar 2026"),
  2: e(4, "Exec sponsor: COO. Steering committee minutes, quarterly"),
  3: e(4, "RACI matrix; AI Governance Lead appointed"),
  4: e(3, "Annual AI investment plan, business cases per initiative"),
  5: e(4, "Benefits register with KPIs per initiative"),

  /* Revenue & Value Generation through AI (Q6-Q9) — newest domain, weakest */
  6: e(3, "AI-linked revenue reported in management pack; attribution model draft"),
  7: e(3, "Monetisation options paper; premium screening tier scoped"),
  8: e(2, "ROI tracked for 2 of 7 initiatives; no standard methodology yet"),
  9: e(3, "Retention analysis by AI feature; A/B results for match ranking"),

  /* Governance & Oversight (Q10-Q14) */
  10: e(4, "AI system inventory, 14 systems registered, reviewed monthly"),
  11: e(4, "Responsible AI Policy v3, published on intranet"),
  12: e(4, "Use-case intake form + approval gate before deployment"),
  13: e(4, "Quarterly AI governance report to the board"),
  14: e(3, "Vendor AI due-diligence questionnaire; 6 of 9 vendors assessed"),

  /* Risk & Compliance (Q15-Q19) */
  15: e(4, "AI risk taxonomy; risks logged per system in the register"),
  16: e(4, "Pre-deployment risk assessment mandatory; residual risk recorded"),
  17: e(4, "EU AI Act gap analysis Feb 2026; compliance roadmap to Aug 2026"),
  18: e(4, "Annex III mapping complete; 2 systems classified high-risk"),
  19: e(3, "AI incident procedure drafted; not yet exercised"),

  /* Data & Model Governance (Q20-Q25) */
  20: e(4, "Decision logs retained 24 months; audit pack template"),
  21: e(4, "Dataset inventory with suitability assessments"),
  22: e(3, "Data quality checks on ingestion; monitoring partial"),
  23: e(4, "DPIA completed for candidate-screening model"),
  24: e(4, "PIA process embedded in the intake gate"),
  25: e(3, "Training data versioned; lineage documented for 4 of 7 models"),

  /* Human Oversight & Accountability (Q26-Q28) */
  26: e(4, "Named accountable owner per system in the RACI"),
  27: e(3, "Output sampling and validation for shortlisting decisions"),
  28: e(4, "Human review mandatory for all rejection decisions"),

  /* Trust, Transparency & Fairness (Q29-Q31) — weakest area */
  29: e(3, "Bias testing on the screening model; other models pending"),
  30: e(2, "Candidate-facing AI disclosure drafted, not yet published"),
  31: e(3, "Model cards for 3 of 7 models"),

  /* Workforce & Capability (Q32-Q35) */
  32: e(3, "Agent oversight policy; no autonomous agents in production"),
  33: e(3, "AI literacy module, 71% completion"),
  34: e(3, "Governance training for risk and compliance staff"),
  35: e(2, "Workforce impact assessment scheduled for Q4"),

  /* Continuous Improvement (Q36) */
  36: e(3, "Annual governance review; lessons-learned log maintained"),
};
