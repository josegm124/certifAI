/* ============================================================
   CertifAI — certification / framework catalog
   Researched reference content for the seven frameworks the
   assessment maps to. Sub-scores are computed live from the
   user's answers by filtering QUESTIONS on `frameworks`.
   Sources are cited in the UI and README.
   ============================================================ */
import type { FrameworkKey } from "./data";
// Counts interpolated rather than typed — the notes below said "eight domains"
// and went stale when the ninth landed.
import { TOTAL_DOMAINS, numberWord } from "./data";

export type CertType = "Binding law" | "Certifiable standard" | "Voluntary code" | "Principles";

export interface Certification {
  key: FrameworkKey;
  name: string;
  short: string;
  type: CertType;
  binding: boolean;
  certifiable: boolean;
  tagline: string;
  /** what the framework is, in substantive prose */
  what: string[];
  /** what "being compliant / aligned" concretely requires */
  requires: string[];
  /** what it investigates / examines about an organisation */
  investigates: string[];
  /** current status / key dates */
  status: string;
  /** teeth: penalties or consequences, where relevant */
  stakes: string;
  /** how CertifAI relates to it */
  certifaiNote: string;
  source: { label: string; url: string };
}

export const CERTIFICATIONS: Record<FrameworkKey, Certification> = {
  aiact: {
    key: "aiact",
    name: "EU AI Act",
    short: "EU AI Act",
    type: "Binding law",
    binding: true,
    certifiable: true,
    tagline: "The world's first horizontal, risk-tiered AI law.",
    what: [
      "The EU AI Act is the first comprehensive, legally binding regulation of artificial intelligence. It classifies AI systems by risk: prohibited practices, high-risk systems, limited-risk systems with transparency duties, and minimal-risk systems. The heaviest obligations fall on high-risk systems, including AI used in recruitment, credit, education, essential services, and biometric identification.",
      "For high-risk systems the Act requires a documented risk-management system, data and data-governance controls, technical documentation (Annex IV), automatic record-keeping/logging, transparency to deployers, human oversight, and appropriate accuracy, robustness and cybersecurity. All of this is demonstrated through a conformity assessment and registration in an EU database before the system goes to market.",
    ],
    requires: [
      "Classify each AI system by risk tier and identify high-risk systems under Annex III",
      "Operate a risk-management system across the AI lifecycle",
      "Maintain Annex IV technical documentation and automatic logging",
      "Ensure human oversight, accuracy, robustness and cybersecurity",
      "Complete a conformity assessment and register high-risk systems before deployment",
    ],
    investigates: [
      "Whether high-risk systems have been identified and classified",
      "Whether risk, data-governance and oversight controls are documented and operating",
      "Whether the organisation can produce an audit-ready technical file",
    ],
    status:
      "In force. Prohibited-practice bans apply since 2 Feb 2025 and GPAI-model obligations since 2 Aug 2025. High-risk obligations were set for 2 Aug 2026, but the proposed 'AI Omnibus' would defer stand-alone Annex III high-risk duties to 2 Dec 2027 (and product-embedded systems to 2 Aug 2028), subject to formal adoption.",
    stakes: "Fines up to €35 million or 7% of global annual turnover, higher than GDPR.",
    certifaiNote:
      "CertifAI maps your maturity to the Act's control themes so you can see readiness and gaps. It is not the official conformity assessment required by law.",
    source: { label: "EU AI Act implementation timeline", url: "https://artificialintelligenceact.eu/implementation-timeline/" },
  },

  gdpr: {
    key: "gdpr",
    name: "GDPR",
    short: "GDPR",
    type: "Binding law",
    binding: true,
    certifiable: false,
    tagline: "The data-protection backbone that AI must respect.",
    what: [
      "The General Data Protection Regulation governs any AI that processes personal data. Every processing activity needs a documented lawful basis under Article 6, and a Data Protection Impact Assessment (DPIA) is mandatory where AI performs systematic, extensive evaluation of individuals, such as profiling that informs decisions with legal or similarly significant effects.",
      "Article 22 gives individuals the right not to be subject to decisions based solely on automated processing that significantly affect them. Even where an exception applies (contract, law, or explicit consent), the person retains the right to human intervention, to express their view, and to contest the decision.",
    ],
    requires: [
      "Establish and document a lawful basis for each AI processing activity",
      "Run a DPIA for high-risk profiling and automated evaluation",
      "Provide human intervention and contestability for Article 22 decisions",
      "Apply data minimisation, purpose limitation and transparency",
      "Safeguard personal data used to train and operate models",
    ],
    investigates: [
      "Whether DPIAs exist for AI that profiles or evaluates people",
      "Whether solely-automated decisions have human-review safeguards",
      "Whether personal data in AI systems is protected and lawfully processed",
    ],
    status: "In force since 2018; actively applied to AI and generative systems by EU data-protection authorities.",
    stakes: "Fines up to €20 million or 4% of global annual turnover.",
    certifaiNote:
      "CertifAI surfaces your data-protection and privacy maturity for AI systems. It complements, but does not replace, formal GDPR compliance work led by your DPO.",
    source: { label: "GDPR Article 22: automated decision-making", url: "https://gdprlocal.com/automated-decision-making-gdpr/" },
  },

  oecd: {
    key: "oecd",
    name: "OECD AI Principles",
    short: "OECD",
    type: "Principles",
    binding: false,
    certifiable: false,
    tagline: "The values foundation most other frameworks build on.",
    what: [
      "The OECD AI Principles, adopted in 2019 and updated in May 2024, are the first intergovernmental standard for trustworthy AI. They set five values-based principles: inclusive growth, sustainable development and well-being; respect for the rule of law, human rights and democratic values (including fairness and privacy); transparency and explainability; robustness, security and safety; and accountability.",
      "The 2024 update responded to generative AI by strengthening guidance on information integrity, addressing mis- and disinformation, and adding environmental sustainability. Though non-binding, the principles are the conceptual backbone that the EU AI Act, the G7 code, and NIST's framework all echo.",
    ],
    requires: [
      "Steer AI toward inclusive growth, well-being and sustainability",
      "Respect human rights, democratic values, fairness and privacy",
      "Provide meaningful transparency and explainability",
      "Ensure robustness, security and safety across the lifecycle",
      "Hold actors accountable for AI outcomes",
    ],
    investigates: [
      "Whether the organisation's AI principles reflect these five values",
      "Whether transparency, fairness and accountability are operationalised",
    ],
    status: "Updated May 2024; adhered to by 47+ governments and referenced across the G20.",
    stakes: "Non-binding, but the reference point for regulators and procurement due-diligence worldwide.",
    certifaiNote:
      `CertifAI treats the OECD principles as the values lens across all ${numberWord(TOTAL_DOMAINS)} domains, showing how your practice expresses them.`,
    source: { label: "OECD AI Principles", url: "https://www.oecd.org/en/topics/ai-principles.html" },
  },

  g7: {
    key: "g7",
    name: "G7 Hiroshima Code",
    short: "G7 Hiroshima",
    type: "Voluntary code",
    binding: false,
    certifiable: false,
    tagline: "A voluntary code of conduct for advanced and frontier AI.",
    what: [
      "The Hiroshima Process International Code of Conduct, agreed by G7 leaders in October 2023, sets eleven principles and actions for organisations developing the most advanced AI systems, including frontier foundation models and generative AI. It spans the full lifecycle: risk identification and mitigation, incident reporting, cybersecurity, content provenance and watermarking, public transparency, responsible information sharing, privacy, and bias mitigation.",
      "It also asks developers to invest in safety, prioritise the most significant societal risks, and support international AI-safety research and common evaluation methods. The OECD runs a pilot to monitor how organisations apply the code.",
    ],
    requires: [
      "Identify, assess and mitigate risks across the AI lifecycle",
      "Report safety incidents and share information responsibly",
      "Enable identification of AI-generated content (provenance/watermarking)",
      "Publish transparency reporting on model capabilities and limitations",
      "Advance bias mitigation, privacy protection and safety research",
    ],
    investigates: [
      "Whether autonomous and advanced systems have oversight and monitoring",
      "Whether incident reporting and transparency practices exist",
    ],
    status: "Agreed Oct 2023; voluntary, with an OECD reporting framework launched in 2024.",
    stakes: "Voluntary, but increasingly expected of frontier developers and referenced in enterprise assurance.",
    certifaiNote:
      "CertifAI reflects the code through controls on autonomous-agent oversight, incident response and transparency.",
    source: { label: "Hiroshima Process International Code of Conduct", url: "https://digital-strategy.ec.europa.eu/en/library/hiroshima-process-international-code-conduct-advanced-ai-systems" },
  },

  gpai: {
    key: "gpai",
    name: "GPAI Code of Practice",
    short: "GPAI Code",
    type: "Voluntary code",
    binding: false,
    certifiable: false,
    tagline: "The operational bridge to EU AI Act obligations for general-purpose models.",
    what: [
      "Published by the European Commission on 10 July 2025, the General-Purpose AI Code of Practice gives providers of general-purpose AI models a concrete way to meet Articles 53 and 55 of the AI Act. It has three chapters. Transparency and Copyright apply to all GPAI providers, while Safety & Security applies only to models posing systemic risk (above the 10^25 FLOP threshold).",
      "Although voluntary, signatories gain a presumption of compliance and reduced administrative burden: EU regulators treat adherence as evidence the corresponding legal obligations are met. It covers model documentation, training-data transparency, and copyright policy, adding systemic-risk assessment and mitigation for the largest models.",
    ],
    requires: [
      "Maintain model documentation and a transparency 'model card'",
      "Operate a copyright policy covering training data",
      "Document data provenance, lineage and versioning",
      "For systemic-risk models: assess and mitigate systemic risk",
      "Cooperate with the EU AI Office and downstream providers",
    ],
    investigates: [
      "Whether training-data provenance and documentation are managed",
      "Whether third-party / general-purpose models are governed and disclosed",
    ],
    status: "Published 10 July 2025; underpins GPAI obligations in force since 2 Aug 2025.",
    stakes: "Voluntary, but non-signatories must prove compliance by other means under the AI Act.",
    certifaiNote:
      "CertifAI maps to the Code through training-data management, third-party oversight and transparency controls.",
    source: { label: "The General-Purpose AI Code of Practice", url: "https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai" },
  },

  iso: {
    key: "iso",
    name: "ISO/IEC 42001",
    short: "ISO 42001",
    type: "Certifiable standard",
    binding: false,
    certifiable: true,
    tagline: "The world's first certifiable AI management-system standard.",
    what: [
      "ISO/IEC 42001:2023 is the first international standard for an Artificial Intelligence Management System (AIMS). Like ISO 27001 for information security, it is certifiable by an accredited body. It applies to any organisation that develops or uses AI, and covers the full lifecycle from design through deployment, monitoring and decommissioning.",
      "Its management-system clauses (4–10) address context, leadership, planning, support, operation, performance evaluation and improvement. Annex A adds 38 controls across nine areas, including AI policy, AI impact assessment, the AI system lifecycle, and data governance. An organisation implements these controls and continually improves them.",
    ],
    requires: [
      "Establish an AI management system with defined scope and policy",
      "Assign leadership accountability and governance structures",
      "Conduct AI impact assessments and manage lifecycle controls",
      "Operate Annex A controls (policy, data governance, oversight)",
      "Run internal audits, management review and continual improvement",
    ],
    investigates: [
      "Whether governance, ownership and policy are formally established",
      "Whether AI-specific controls operate and are audited over time",
      "Whether continual improvement is embedded",
    ],
    status:
      "Published Dec 2023. Certification via accredited bodies runs a Stage 1 + Stage 2 audit, is valid three years with annual surveillance.",
    stakes: "Voluntary certification, but a growing market signal for enterprise and public-sector procurement.",
    certifaiNote:
      `CertifAI's ${numberWord(TOTAL_DOMAINS)} domains align closely with the AIMS structure, making it a strong readiness pre-check before a formal ISO 42001 audit.`,
    source: { label: "ISO/IEC 42001 explained", url: "https://www.iso.org/standard/42001" },
  },

  nist: {
    key: "nist",
    name: "NIST AI RMF",
    short: "NIST AI RMF",
    type: "Voluntary code",
    binding: false,
    certifiable: false,
    tagline: "The practical, function-based playbook for AI risk.",
    what: [
      "The NIST AI Risk Management Framework (AI RMF 1.0) is a voluntary, widely-adopted framework for managing AI risk. Its core has four interconnected functions. Govern establishes a cross-cutting culture of accountability, policy and oversight; Map contextualises the system, its stakeholders and potential harms; Measure assesses and tracks risk with quantitative and qualitative methods; and Manage prioritises and responds to the risks identified.",
      "The functions are iterative rather than sequential, and are supported by a companion Playbook and a Generative AI Profile. NIST frames the goal as trustworthy AI, meaning valid, reliable, safe, secure, accountable, transparent, explainable, privacy-enhanced and fair.",
    ],
    requires: [
      "Govern: establish AI risk culture, accountability and policy",
      "Map: identify context, stakeholders, system boundaries and harms",
      "Measure: assess, analyse and track AI risks over time",
      "Manage: prioritise, respond to and monitor identified risks",
      "Pursue the trustworthy-AI characteristics throughout",
    ],
    investigates: [
      "Whether risk is systematically identified, measured and managed",
      "Whether governance informs risk decisions across the lifecycle",
    ],
    status: "Released Jan 2023; Generative AI Profile added 2024. Voluntary and cross-sector.",
    stakes: "Voluntary, but a de-facto reference for US and global AI-risk programmes and vendor assurance.",
    certifaiNote:
      "CertifAI's risk, governance and measurement controls trace directly to the Govern–Map–Measure–Manage functions.",
    source: { label: "NIST AI RMF Core", url: "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/" },
  },
};

export const CERT_ORDER: FrameworkKey[] = ["aiact", "gpai", "iso", "nist", "gdpr", "g7", "oecd"];
