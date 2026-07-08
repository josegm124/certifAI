import React, { useState, useMemo, useEffect } from "react";

/* ============================================================
   CertifAI — AI Governance Readiness MVP
   Tiers 1 (Free assessment + gap profile) and 2 (evidence + badge)
   Single-file React. No backend. State in-memory + export/import.
   ============================================================ */

/* ---------- DATA ---------- */
const MATURITY_LEVELS = [
  { score: 0, label: "Not Present", desc: "No activity, process, or capability in place." },
  { score: 1, label: "Awareness", desc: "On the radar, but nothing formalised yet." },
  { score: 2, label: "Emerging", desc: "Early practices for certain systems or teams." },
  { score: 3, label: "Implemented", desc: "Documented and applied consistently across the organisation." },
  { score: 4, label: "Managed", desc: "Actively measured, monitored, and reviewed." },
  { score: 5, label: "Optimised", desc: "Fully embedded and continuously refined." },
];

const DOMAINS = [
  { id: "strategy", name: "Strategy & Leadership", weight: 0.10 },
  { id: "governance", name: "Governance & Oversight", weight: 0.14 },
  { id: "risk", name: "Risk & Compliance", weight: 0.20 },
  { id: "data", name: "Data & Model Governance", weight: 0.18 },
  { id: "human", name: "Human Oversight & Accountability", weight: 0.13 },
  { id: "trust", name: "Trust, Transparency & Fairness", weight: 0.13 },
  { id: "workforce", name: "Workforce & Capability", weight: 0.08 },
  { id: "improve", name: "Continuous Improvement", weight: 0.04 },
];

const FRAMEWORKS = {
  aiact: "EU AI Act", gdpr: "GDPR", oecd: "OECD AI Principles",
  g7: "G7 Hiroshima", gpai: "GPAI Code", iso: "ISO/IEC 42001", nist: "NIST AI RMF",
};

const QUESTIONS = [
  { id: 1, domain: "strategy", title: "AI Strategy", text: "Does your organisation have a documented AI strategy that defines its vision, objectives, and roadmap for AI adoption?", evidence: ["Approved AI strategy", "AI roadmap", "AI vision statement", "Strategic AI objectives"], kpi: "% business units covered", frameworks: ["oecd", "iso"] },
  { id: 2, domain: "strategy", title: "Leadership Commitment", text: "To what extent is senior leadership actively engaged in and accountable for AI-related decisions and outcomes?", evidence: ["Executive sponsor", "Board minutes", "Steering committee charter"], kpi: "Executive participation rate", frameworks: ["iso", "g7"] },
  { id: 3, domain: "strategy", title: "AI Governance Ownership", text: "Is there a clearly defined owner or body responsible for AI governance across the organisation?", evidence: ["RACI matrix", "Governance structure", "Committee terms of reference"], kpi: "% AI systems with owner assigned", frameworks: ["iso", "nist"] },
  { id: 4, domain: "strategy", title: "AI Investment Planning", text: "Does the organisation have a structured process for planning and prioritising AI investments?", evidence: ["Investment plans", "Business cases", "Budget approvals"], kpi: "AI spend vs budget", frameworks: ["iso"] },
  { id: 5, domain: "strategy", title: "AI Business Objectives", text: "Are clear, measurable business objectives defined for each AI initiative?", evidence: ["Business KPIs", "Benefits register", "Performance dashboards"], kpi: "Value generated", frameworks: ["oecd"] },
  { id: 6, domain: "governance", title: "AI System Inventory", text: "Does the organisation maintain an up-to-date inventory of all AI systems in use or development?", evidence: ["AI inventory", "Asset register", "Model register"], kpi: "% AI systems registered", frameworks: ["aiact", "iso", "nist"] },
  { id: 7, domain: "governance", title: "AI Governance Policies", text: "Are formal AI governance policies in place that define standards, responsibilities, and acceptable use?", evidence: ["AI policy", "Responsible AI policy", "Governance framework"], kpi: "Policy compliance rate", frameworks: ["aiact", "iso", "oecd"] },
  { id: 8, domain: "governance", title: "Use-Case Approval", text: "Is there a defined process for reviewing and approving new AI use cases before deployment?", evidence: ["Approval workflow", "Use-case register", "Sign-off logs"], kpi: "% use-cases reviewed", frameworks: ["aiact", "iso"] },
  { id: 9, domain: "governance", title: "Governance Reporting", text: "Are regular reports on AI governance, risk, and performance provided to leadership?", evidence: ["Governance reports", "Dashboards", "Board packs"], kpi: "Reporting frequency", frameworks: ["iso", "nist"] },
  { id: 10, domain: "governance", title: "Third-Party AI Oversight", text: "Does the organisation have controls to oversee AI systems or services provided by third parties?", evidence: ["Vendor assessments", "Contract clauses", "Due diligence records"], kpi: "% vendors assessed", frameworks: ["aiact", "iso", "gpai"] },
  { id: 11, domain: "risk", title: "AI Risk Identification", text: "Does the organisation have a process for systematically identifying risks associated with AI systems?", evidence: ["Risk register", "Risk taxonomy", "Threat assessments"], kpi: "Risks identified per system", frameworks: ["aiact", "nist", "iso"] },
  { id: 12, domain: "risk", title: "AI Risk Assessments", text: "Are formal risk assessments conducted for AI systems before and during deployment?", evidence: ["Risk assessments", "Mitigation plans", "Residual risk records"], kpi: "% systems assessed", frameworks: ["aiact", "nist", "iso"] },
  { id: 13, domain: "risk", title: "EU AI Act Readiness", critical: true, text: "How prepared is the organisation to comply with the requirements of the EU AI Act?", evidence: ["Gap analysis", "Compliance roadmap", "Annex IV technical file"], kpi: "Compliance maturity score", frameworks: ["aiact"] },
  { id: 14, domain: "risk", title: "High-Risk AI Identification", critical: true, text: "Has the organisation identified which AI systems fall into high-risk categories under Annex III?", evidence: ["Classification methodology", "High-risk register", "Annex III mapping"], kpi: "% systems classified", frameworks: ["aiact"] },
  { id: 15, domain: "risk", title: "AI Incident Response", text: "Is there a defined process for detecting, reporting, and responding to AI-related incidents?", evidence: ["Incident response plan", "Incident log", "Escalation procedures"], kpi: "Incident response time", frameworks: ["aiact", "nist"] },
  { id: 16, domain: "data", title: "AI Audit Readiness", text: "Is the organisation prepared to demonstrate AI system behaviour, decisions, and compliance to auditors?", evidence: ["Audit trails", "Logging records", "Documentation packs"], kpi: "Audit findings", frameworks: ["aiact", "iso"] },
  { id: 17, domain: "data", title: "Data Suitability", text: "Are the data sources used to train or operate AI systems assessed for suitability and quality?", evidence: ["Dataset inventory", "Data quality assessments"], kpi: "Data quality score", frameworks: ["aiact", "iso"] },
  { id: 18, domain: "data", title: "Data Quality Controls", text: "Are controls in place to ensure the quality, accuracy, and consistency of data used by AI systems?", evidence: ["Validation reports", "Data quality controls", "Monitoring records"], kpi: "Data accuracy", frameworks: ["aiact", "iso"] },
  { id: 19, domain: "data", title: "Personal Data Protection", text: "Are appropriate safeguards in place to protect personal data when used by AI systems?", evidence: ["DPIA records", "Processing records", "GDPR controls"], kpi: "Privacy incidents", frameworks: ["gdpr", "aiact"] },
  { id: 20, domain: "data", title: "Privacy Impact Assessments", text: "Are Privacy/Data Protection Impact Assessments conducted for AI systems?", evidence: ["PIAs", "Risk reviews", "Mitigation tracking"], kpi: "% systems assessed", frameworks: ["gdpr"] },
  { id: 21, domain: "data", title: "Training Data Management", text: "Does the organisation manage the provenance, lineage, and versioning of training data?", evidence: ["Dataset documentation", "Data lineage", "Version control records"], kpi: "Documented datasets", frameworks: ["aiact", "gpai", "iso"] },
  { id: 22, domain: "human", title: "Human Accountability", critical: true, text: "Are named individuals accountable for the decisions and outputs produced by AI systems?", evidence: ["Accountability matrix", "Approval records", "Governance roles"], kpi: "Ownership coverage", frameworks: ["aiact", "oecd", "iso"] },
  { id: 23, domain: "human", title: "Output Verification", text: "Are processes in place to verify the accuracy and reliability of AI outputs before they are acted upon?", evidence: ["Testing reports", "Validation procedures", "Monitoring logs"], kpi: "Output accuracy", frameworks: ["aiact", "nist"] },
  { id: 24, domain: "human", title: "Human Review Requirements", text: "Are there defined criteria for when human review of AI outputs is required?", evidence: ["Review procedures", "Exception logs", "Escalation workflows"], kpi: "Human review rate", frameworks: ["aiact", "oecd"] },
  { id: 25, domain: "trust", title: "AI Bias Assessments", text: "Does the organisation conduct assessments to identify and mitigate bias in AI systems?", evidence: ["Bias reports", "Fairness metrics", "Mitigation plans"], kpi: "Bias incidents", frameworks: ["aiact", "oecd", "nist"] },
  { id: 26, domain: "trust", title: "Transparency of AI Use", text: "Are stakeholders or affected individuals informed when AI is used to make or support decisions?", evidence: ["Disclosure notices", "Customer communications", "Usage statements"], kpi: "Disclosure coverage", frameworks: ["aiact", "oecd"] },
  { id: 27, domain: "trust", title: "Explainability", text: "Can the organisation explain how its AI systems reach decisions in understandable terms?", evidence: ["Model cards", "Explainability reports", "Decision records"], kpi: "Explainability coverage", frameworks: ["aiact", "oecd", "nist"] },
  { id: 28, domain: "workforce", title: "Autonomous Agent Oversight", text: "Does the organisation have controls for overseeing AI systems that act autonomously?", evidence: ["Agent governance framework", "Monitoring records", "Intervention logs"], kpi: "Agent review frequency", frameworks: ["aiact", "g7", "gpai"] },
  { id: 29, domain: "workforce", title: "AI Literacy", text: "Do staff across the organisation have a sufficient understanding of AI and its responsible use?", evidence: ["Training records", "Assessment results", "Awareness campaigns"], kpi: "Training completion rate", frameworks: ["aiact", "oecd"] },
  { id: 30, domain: "workforce", title: "AI Governance Training", text: "Are employees with governance, risk, or oversight responsibilities trained on AI governance?", evidence: ["Governance curriculum", "Attendance logs", "Competency tests"], kpi: "Governance training coverage", frameworks: ["iso", "aiact"] },
  { id: 31, domain: "workforce", title: "Workforce Readiness", text: "Is the organisation prepared to manage the workforce implications of AI adoption?", evidence: ["Skills assessments", "Workforce plans", "Change management plans"], kpi: "Readiness score", frameworks: ["oecd", "g7"] },
  { id: 32, domain: "improve", title: "Continuous Improvement", text: "Does the organisation have a structured process for reviewing and continuously improving its AI governance?", evidence: ["Improvement plans", "Lessons learned", "Corrective action logs"], kpi: "Actions completed", frameworks: ["iso", "nist"] },
];

const BADGE_TIERS = [
  { id: "aware", name: "Aware", min: 0, max: 40, blurb: "Assessment completed and gap profile received. Internal-use signal of where you stand." },
  { id: "aligned", name: "Aligned", min: 41, max: 70, blurb: "Structured evidence across core domains. Remediation underway. First displayable badge." },
  { id: "assured", name: "Assured", min: 71, max: 100, blurb: "Strong governance posture across all domains. Audit-ready evidence. Shareable trust badge." },
];
const CRITICAL_IDS = QUESTIONS.filter((q) => q.critical).map((q) => q.id);

/* ---------- SCORING ---------- */
function domainScores(answers) {
  return DOMAINS.map((d) => {
    const qs = QUESTIONS.filter((q) => q.domain === d.id);
    const answered = qs.filter((q) => answers[q.id]?.score != null);
    const sum = answered.reduce((a, q) => a + answers[q.id].score, 0);
    const pct = answered.length ? (sum / (answered.length * 5)) * 100 : 0;
    return { ...d, answeredCount: answered.length, totalCount: qs.length, rawAvg: answered.length ? sum / answered.length : 0, pct: Math.round(pct) };
  });
}
function overallScore(answers) {
  const ds = domainScores(answers);
  const totalW = ds.reduce((a, d) => a + (d.answeredCount ? d.weight : 0), 0);
  if (!totalW) return 0;
  return Math.round(ds.reduce((a, d) => a + (d.answeredCount ? d.pct * d.weight : 0), 0) / totalW);
}
function gatingStatus(answers) {
  const failed = CRITICAL_IDS.filter((id) => answers[id]?.score != null && answers[id].score <= 1);
  return { capped: failed.length > 0, failedIds: failed };
}
function resolveTier(answers) {
  const overall = overallScore(answers);
  const gate = gatingStatus(answers);
  let tier = BADGE_TIERS.find((t) => overall >= t.min && overall <= t.max) || BADGE_TIERS[0];
  let cappedFrom = null;
  if (gate.capped && tier.id !== "aware") { cappedFrom = tier.id; tier = BADGE_TIERS[0]; }
  return { overall, tier, gate, cappedFrom };
}
function gapAnalysis(answers) {
  const dmap = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
  return QUESTIONS.filter((q) => answers[q.id]?.score != null).map((q) => {
    const score = answers[q.id].score; const w = dmap[q.domain].weight;
    const base = (5 - score) * w; const priority = q.critical ? base * 2.2 : base;
    return { id: q.id, title: q.title, domainName: dmap[q.domain].name, score, critical: !!q.critical, priority, gapSize: 5 - score, evidence: q.evidence, frameworks: q.frameworks };
  }).filter((g) => g.gapSize > 0).sort((a, b) => b.priority - a.priority);
}
function completion(answers) {
  const answered = QUESTIONS.filter((q) => answers[q.id]?.score != null).length;
  return { answered, total: QUESTIONS.length, pct: Math.round((answered / QUESTIONS.length) * 100) };
}

/* ---------- THEME ---------- */
const C = {
  ink: "#0F2230", inkSoft: "#33485A", mute: "#6B7C8A", line: "#DCE4E8",
  paper: "#FBFCFC", panel: "#FFFFFF", mist: "#EEF3F3",
  pine: "#0E6B53", pineDk: "#0A5240", pineSoft: "#E4F1EC",
  ocean: "#10566E", oceanSoft: "#E2EEF2", gold: "#B8893B",
  red: "#A8392E", redSoft: "#F6E7E4",
};
const tierColor = (id) => (id === "assured" ? C.pine : id === "aligned" ? C.ocean : C.mute);

/* ---------- ROOT ---------- */
const API_BASE = "http://localhost:3001/api";

export default function App() {
  const [stage, setStage] = useState("intro"); // intro | assess | results
  const [tier, setTier] = useState(1); // 1 = free (score+note), 2 = evidence attest
  const [org, setOrg] = useState("");
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [orgId, setOrgId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [badge, setBadge] = useState(null);
  const [scoring, setScoring] = useState(null);

  const comp = useMemo(() => completion(answers), [answers]);

  async function startAssessment(selectedTier) {
    try {
      // 1. Create org in backend
      const orgRes = await fetch(`${API_BASE}/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: org, email: `${org.replace(/\s+/g, "").toLowerCase()}@certifai.local` })
      });
      const orgData = await orgRes.json();
      setOrgId(orgData.id);

      // 2. Create assessment in backend
      const assessRes = await fetch(`${API_BASE}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgData.id, aiSystemId: `system-${Date.now()}`, tier: selectedTier === 1 ? "free" : "professional" })
      });
      const assessData = await assessRes.json();
      setAssessmentId(assessData.id);

      setTier(selectedTier);
      setStage("assess");
      setIdx(0);
    } catch (err) {
      console.error("Error starting assessment:", err);
      alert("Failed to start assessment. Check backend is running on port 3001.");
    }
  }

  async function setAnswer(qid, patch) {
    setAnswers((p) => ({ ...p, [qid]: { ...p[qid], ...patch } }));

    // Save to backend
    if (assessmentId) {
      try {
        await fetch(`${API_BASE}/assessments/${assessmentId}/answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: String(qid), score: patch.score, evidence: patch.evidence || "", attestation: patch.attestation || "" })
        });
      } catch (err) {
        console.error("Error saving answer:", err);
      }
    }
  }

  async function computeScores() {
    if (!assessmentId) return;
    try {
      const questionMapping = Object.fromEntries(QUESTIONS.map(q => [q.id, { domain: q.domain, description: q.title }]));
      const res = await fetch(`${API_BASE}/assessments/${assessmentId}/compute-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionMapping })
      });
      const data = await res.json();
      setScoring(data);
      return data;
    } catch (err) {
      console.error("Error computing scores:", err);
    }
  }

  async function issueBadge() {
    if (!assessmentId || !scoring || tier !== 2 || comp.pct !== 100) return null;
    try {
      const res = await fetch(`${API_BASE}/assessments/${assessmentId}/badges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          tier: scoring.badgeTier,
          overallScore: scoring.overallScore,
          frameworks: ["aiact", "gdpr", "oecd", "iso", "nist"]
        })
      });
      const badgeData = await res.json();
      setBadge(badgeData);
      return badgeData;
    } catch (err) {
      console.error("Error issuing badge:", err);
    }
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ org, tier, answers, ts: Date.now() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `certifai-${(org || "assessment").replace(/\s+/g, "-").toLowerCase()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const d = JSON.parse(reader.result); setOrg(d.org || ""); setTier(d.tier || 1); setAnswers(d.answers || {}); setStage("results"); } catch { alert("Could not read this file."); } };
    reader.readAsText(file);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{CSS}</style>
      <Header stage={stage} comp={comp} onHome={() => setStage("intro")} />
      {stage === "intro" && <Intro org={org} setOrg={setOrg} onStart={startAssessment} onImport={importJSON} />}
      {stage === "assess" && (
        <Assessment tier={tier} answers={answers} idx={idx} setIdx={setIdx} setAnswer={setAnswer} comp={comp} onFinish={async () => { await computeScores(); setStage("results"); }} />
      )}
      {stage === "results" && (
        <Results org={org} tier={tier} answers={answers} scoring={scoring} badge={badge} onBack={() => setStage("assess")} onExport={exportJSON} onUpgrade={() => { setTier(2); setStage("assess"); setIdx(0); }} onIssueBadge={issueBadge} />
      )}
    </div>
  );
}

/* ---------- HEADER ---------- */
function Header({ stage, comp, onHome }) {
  return (
    <header className="hdr">
      <div className="hdr-in">
        <button className="brand" onClick={onHome} aria-label="CertifAI home">
          <Mark />
          <span className="brand-txt">CertifAI</span>
          <span className="brand-sub">AI Governance Readiness</span>
        </button>
        {stage === "assess" && (
          <div className="hdr-prog">
            <div className="hdr-prog-bar"><div className="hdr-prog-fill" style={{ width: `${comp.pct}%` }} /></div>
            <span className="hdr-prog-txt">{comp.answered}/{comp.total}</span>
          </div>
        )}
      </div>
    </header>
  );
}
function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 2L28 7v8c0 7.5-5 13.5-12 15C9 28.5 4 22.5 4 15V7l12-5z" fill={C.pine} />
      <path d="M16 5.2L24.7 9v6c0 5.7-3.6 10.4-8.7 11.6V5.2z" fill={C.pineDk} opacity="0.55" />
      <path d="M11 16.2l3.4 3.4L21 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- INTRO ---------- */
function Intro({ org, setOrg, onStart, onImport }) {
  const [picked, setPicked] = useState(null);
  return (
    <main className="wrap">
      <div className="intro-grid">
        <section className="intro-lead">
          <div className="eyebrow">EU AI Act · 8 domains · 32 controls</div>
          <h1 className="h1">Know exactly where your AI governance stands.</h1>
          <p className="lead">A structured readiness assessment for organisations deploying AI under the EU AI Act. Answer 32 questions across 8 governance domains, see your maturity by domain and framework, and get a prioritised remediation path — in about 20 minutes.</p>
          <div className="field">
            <label className="lbl" htmlFor="org">Organisation name</label>
            <input id="org" className="inp" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Northstar Recruitment AI" />
          </div>
          <div className="import-row">
            <label className="link-btn">
              Resume a saved assessment
              <input type="file" accept="application/json" onChange={onImport} hidden />
            </label>
          </div>
        </section>

        <section className="tiers">
          <TierCard
            active={picked === 1} onClick={() => setPicked(1)}
            tag="Tier 1 · Free" name="Readiness Snapshot"
            points={["Self-scored across all 32 controls", "Maturity by domain + framework", "Prioritised gap profile", "No badge issued"]}
            cta="Start free assessment"
            onStart={() => onStart(1)} disabled={!org.trim()}
          />
          <TierCard
            active={picked === 2} onClick={() => setPicked(2)} accent
            tag="Tier 2 · Evidence" name="Evidence & Badge"
            points={["Everything in Tier 1", "Attest + note evidence per control", "Earn Aligned or Assured badge", "Audit-ready evidence record"]}
            cta="Start with evidence"
            onStart={() => onStart(2)} disabled={!org.trim()}
          />
        </section>
      </div>

      <DomainStrip />
      <p className="disclaimer">CertifAI produces a self-assessed, evidence-backed readiness signal. It is not a certification, legal advice, or a conformity assessment under the EU AI Act.</p>
    </main>
  );
}

function TierCard({ active, onClick, tag, name, points, cta, onStart, disabled, accent }) {
  return (
    <div className={`tier ${active ? "tier-on" : ""} ${accent ? "tier-accent" : ""}`} onClick={onClick}>
      <div className="tier-tag">{tag}</div>
      <div className="tier-name">{name}</div>
      <ul className="tier-pts">
        {points.map((p, i) => (
          <li key={i}><Check /> {p}</li>
        ))}
      </ul>
      <button className={`btn ${accent ? "btn-accent" : "btn-primary"}`} disabled={disabled} onClick={(e) => { e.stopPropagation(); onStart(); }}>
        {cta}
      </button>
      {disabled && <div className="tier-hint">Enter an organisation name to begin</div>}
    </div>
  );
}

function DomainStrip() {
  return (
    <div className="dstrip">
      {DOMAINS.map((d) => (
        <div key={d.id} className="dstrip-item">
          <span className="dstrip-w">{Math.round(d.weight * 100)}%</span>
          <span className="dstrip-n">{d.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- ASSESSMENT ---------- */
function Assessment({ tier, answers, idx, setIdx, setAnswer, comp, onFinish }) {
  const q = QUESTIONS[idx];
  const a = answers[q.id] || {};
  const dom = DOMAINS.find((d) => d.id === q.domain);
  const isLast = idx === QUESTIONS.length - 1;
  const isFirst = idx === 0;

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [idx]);

  // domain progress dots
  const domainQs = QUESTIONS.filter((x) => x.domain === q.domain);
  const domainPos = domainQs.findIndex((x) => x.id === q.id) + 1;

  return (
    <main className="wrap">
      <div className="assess">
        <aside className="assess-side">
          <div className="side-dom" style={{ color: C.pine }}>{dom.name}</div>
          <div className="side-pos">Control {domainPos} of {domainQs.length} in domain</div>
          <DomainNav answers={answers} currentId={q.id} onJump={(qid) => setIdx(QUESTIONS.findIndex((x) => x.id === qid))} />
        </aside>

        <section className="assess-main">
          <div className="q-head">
            <span className="q-num">Q{q.id}<span className="q-of"> / 32</span></span>
            {q.critical && <span className="q-crit">Critical control</span>}
            <span className="q-frameworks">{q.frameworks.map((f) => FRAMEWORKS[f]).join(" · ")}</span>
          </div>
          <h2 className="q-title">{q.title}</h2>
          <p className="q-text">{q.text}</p>

          <div className="scale">
            {MATURITY_LEVELS.map((m) => {
              const on = a.score === m.score;
              return (
                <button key={m.score} className={`opt ${on ? "opt-on" : ""}`} onClick={() => setAnswer(q.id, { score: m.score })}>
                  <span className="opt-score">{m.score}</span>
                  <span className="opt-body">
                    <span className="opt-label">{m.label}</span>
                    <span className="opt-desc">{m.desc}</span>
                  </span>
                  <span className="opt-radio" aria-hidden>{on ? <Dot /> : null}</span>
                </button>
              );
            })}
          </div>

          {tier === 2 && (
            <div className="ev">
              <div className="ev-head">
                <span className="ev-title">Evidence</span>
                <span className="ev-sub">Typical artefacts: {q.evidence.join(", ")}</span>
              </div>
              <label className="ev-attest">
                <input type="checkbox" checked={!!a.attested} onChange={(e) => setAnswer(q.id, { attested: e.target.checked })} />
                <span>We hold documented evidence supporting this score.</span>
              </label>
              <textarea className="ev-note" placeholder="Optional: name the document, owner, or location of the evidence." value={a.note || ""} onChange={(e) => setAnswer(q.id, { note: e.target.value })} />
            </div>
          )}

          <div className="nav">
            <button className="btn btn-ghost" disabled={isFirst} onClick={() => setIdx(idx - 1)}>← Previous</button>
            <div className="nav-right">
              {a.score != null && !isLast && <button className="btn btn-primary" onClick={() => setIdx(idx + 1)}>Next →</button>}
              {a.score == null && !isLast && <button className="btn btn-ghost" onClick={() => setIdx(idx + 1)}>Skip →</button>}
              {isLast && <button className="btn btn-accent" onClick={onFinish}>See results →</button>}
            </div>
          </div>
          <button className="finish-link" onClick={onFinish}>Finish & view results now ({comp.answered}/{comp.total} answered)</button>
        </section>
      </div>
    </main>
  );
}

function DomainNav({ answers, currentId, onJump }) {
  return (
    <nav className="dnav">
      {DOMAINS.map((d) => {
        const qs = QUESTIONS.filter((q) => q.domain === d.id);
        const done = qs.filter((q) => answers[q.id]?.score != null).length;
        const hasCurrent = qs.some((q) => q.id === currentId);
        return (
          <div key={d.id} className={`dnav-grp ${hasCurrent ? "dnav-grp-on" : ""}`}>
            <div className="dnav-name">{d.name}</div>
            <div className="dnav-dots">
              {qs.map((q) => {
                const ans = answers[q.id]?.score != null;
                const cur = q.id === currentId;
                return <button key={q.id} className={`dot-btn ${ans ? "dot-ans" : ""} ${cur ? "dot-cur" : ""} ${q.critical ? "dot-crit" : ""}`} title={`Q${q.id} · ${q.title}`} onClick={() => onJump(q.id)} />;
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* ---------- RESULTS ---------- */
function Results({ org, tier, answers, scoring, badge, onBack, onExport, onUpgrade, onIssueBadge }) {
  const { overall, tier: badgeTier, gate, cappedFrom } = useMemo(() => resolveTier(answers), [answers]);
  const ds = useMemo(() => domainScores(answers), [answers]);
  const gaps = useMemo(() => gapAnalysis(answers), [answers]);
  const comp = completion(answers);
  const fw = useMemo(() => Object.entries(FRAMEWORKS).map(([k, name]) => {
    const qs = QUESTIONS.filter((q) => q.frameworks.includes(k));
    const ans = qs.filter((q) => answers[q.id]?.score != null);
    const sum = ans.reduce((a, q) => a + answers[q.id].score, 0);
    return { k, name, pct: ans.length ? Math.round((sum / (ans.length * 5)) * 100) : 0 };
  }), [answers]);

  // Use backend scoring if available
  const displayScoring = scoring || { overallScore: overall, badgeTier: badgeTier, domainScores: ds };
  const badgeEarned = tier === 2 && comp.pct === 100;

  useEffect(() => {
    if (badgeEarned && !badge) {
      onIssueBadge();
    }
  }, [badgeEarned, badge]);

  return (
    <main className="wrap">
      <div className="res-top">
        <div>
          <div className="eyebrow">Readiness report{org ? ` · ${org}` : ""}</div>
          <h1 className="h1 h1-res">AI Governance Readiness</h1>
        </div>
        <div className="res-actions">
          <button className="btn btn-ghost" onClick={onBack}>← Edit answers</button>
          <button className="btn btn-ghost" onClick={onExport}>Save / export</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      {comp.pct < 100 && (
        <div className="banner banner-warn">
          <strong>{comp.answered} of {comp.total} controls answered.</strong> Unanswered controls are excluded from the score. Complete all 32 for a defensible result.
        </div>
      )}

      <div className="res-hero">
        <ScoreDial pct={displayScoring.overallScore} tier={{ id: displayScoring.badgeTier }} />
        <div className="res-hero-body">
          <BadgePanel tier={{ id: displayScoring.badgeTier, name: displayScoring.badgeTier.charAt(0).toUpperCase() + displayScoring.badgeTier.slice(1) }} earned={badgeEarned} tierMode={tier} cappedFrom={cappedFrom} gate={gate} badge={badge} />
        </div>
      </div>

      {cappedFrom && (
        <div className="banner banner-cap">
          <ShieldAlert />
          <div>
            <strong>Badge capped at Aware.</strong> Your overall score reaches <b>{cappedFrom.charAt(0).toUpperCase() + cappedFrom.slice(1)}</b>, but one or more critical controls — {gate.failedIds.map((id) => `Q${id} ${QUESTIONS.find((q) => q.id === id).title}`).join(", ")} — scored at or below Awareness. Critical controls gate the badge so a readiness signal can't outrun core EU AI Act obligations.
          </div>
        </div>
      )}

      <h3 className="sec-h">Maturity by domain</h3>
      <div className="dbars">
        {ds.map((d) => (
          <div key={d.id} className="dbar">
            <div className="dbar-top">
              <span className="dbar-name">{d.name}</span>
              <span className="dbar-meta"><span className="dbar-w">weight {Math.round(d.weight * 100)}%</span><span className="dbar-pct">{d.answeredCount ? `${d.pct}%` : "—"}</span></span>
            </div>
            <div className="dbar-track"><div className="dbar-fill" style={{ width: `${d.pct}%`, background: barColor(d.pct) }} /></div>
          </div>
        ))}
      </div>

      <div className="res-split">
        <div>
          <h3 className="sec-h">Framework coverage</h3>
          <div className="fw">
            {fw.map((f) => (
              <div key={f.k} className="fw-item">
                <div className="fw-ring" style={{ background: `conic-gradient(${barColor(f.pct)} ${f.pct * 3.6}deg, ${C.line} 0deg)` }}>
                  <div className="fw-ring-in">{f.pct}%</div>
                </div>
                <span className="fw-name">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="sec-h">Priority remediation</h3>
          <p className="sec-note">Ranked by domain weight and gap size. Critical controls are boosted.</p>
          <ol className="gaps">
            {gaps.slice(0, 8).map((g) => (
              <li key={g.id} className="gap">
                <div className="gap-l">
                  <span className={`gap-score gap-score-${g.score <= 1 ? "lo" : g.score <= 3 ? "mid" : "hi"}`}>{g.score}</span>
                </div>
                <div className="gap-body">
                  <div className="gap-title">{g.title}{g.critical && <span className="gap-crit">critical</span>}</div>
                  <div className="gap-meta">{g.domainName} · raise to close {g.gapSize} {g.gapSize === 1 ? "level" : "levels"}</div>
                </div>
              </li>
            ))}
            {gaps.length === 0 && <div className="gap-none">No gaps — every answered control is at Managed or above.</div>}
          </ol>
        </div>
      </div>

      {tier === 1 && (
        <div className="upsell">
          <div className="upsell-body">
            <div className="upsell-tag">Tier 2 · Evidence & Badge</div>
            <h3 className="upsell-h">Turn this snapshot into a credential.</h3>
            <p className="upsell-p">Attach evidence to each control to build an audit-ready record and earn a displayable Aligned or Assured badge your clients and partners can verify.</p>
          </div>
          <button className="btn btn-accent" onClick={onUpgrade}>Add evidence →</button>
        </div>
      )}

      <p className="disclaimer">Self-assessed, evidence-backed readiness signal. Not a certification, legal advice, or a conformity assessment under the EU AI Act.</p>
    </main>
  );
}

function ScoreDial({ pct, tier }) {
  const col = tierColor(tier.id);
  const r = 64, circ = 2 * Math.PI * r, off = circ * (1 - pct / 100);
  return (
    <div className="dial">
      <svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={r} fill="none" stroke={C.line} strokeWidth="11" />
        <circle cx="85" cy="85" r={r} fill="none" stroke={col} strokeWidth="11" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 85 85)" style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }} />
        <text x="85" y="80" textAnchor="middle" className="dial-num">{pct}</text>
        <text x="85" y="103" textAnchor="middle" className="dial-pct">/ 100</text>
      </svg>
      <div className="dial-label">Overall readiness</div>
    </div>
  );
}

function BadgePanel({ tier, earned, tierMode, cappedFrom, badge }) {
  const col = tierColor(tier.id);
  const verifyUrl = badge ? `${API_BASE}/badges/${badge.verificationToken}/verify` : null;
  const shareLink = badge ? `http://localhost:5173?verify=${badge.verificationToken}` : null;

  return (
    <div className="badge-panel">
      <div className="badge-vis" style={{ borderColor: col }}>
        <div className="badge-shield" style={{ background: col }}>
          <ShieldGlyph />
        </div>
        <div className="badge-meta">
          <div className="badge-tier" style={{ color: col }}>{tier.name}</div>
          <div className="badge-state">
            {badge ? `✓ Badge issued on ${new Date(badge.issuedAt).toLocaleDateString()}` : earned ? "Processing badge..." : tierMode === 1 ? "Tier 1 — no badge issued" : cappedFrom ? "Capped — critical control gap" : "Complete all controls to earn"}
          </div>
        </div>
      </div>
      <p className="badge-blurb">{BADGE_TIERS.find(t => t.id === tier.id)?.blurb || "Badge credential"}</p>
      {badge && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: C.mist, borderRadius: "4px" }}>
          <div className="badge-verify" style={{ fontSize: "0.85rem", color: C.mute, marginBottom: "0.5rem" }}>
            Token: {badge.verificationToken.slice(0, 12)}...
          </div>
          <div className="badge-verify" style={{ fontSize: "0.75rem", color: C.mute }}>
            Expires: {new Date(badge.expiresAt).toLocaleDateString()}
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
            <a href={shareLink} target="_blank" rel="noopener noreferrer" style={{ color: C.ocean, textDecoration: "underline" }}>
              → Share verification link
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- ICONS ---------- */
const Check = () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8.5l3.2 3.2L13 5" stroke={C.pine} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const Dot = () => (<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden><circle cx="6" cy="6" r="6" fill="#fff" /></svg>);
const ShieldGlyph = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2l8 3.2v5.3c0 5-3.3 9-8 10-4.7-1-8-5-8-10V5.2L12 2z" fill="#fff" opacity=".22" /><path d="M8 12l2.6 2.6L16 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const ShieldAlert = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2l8 3.2v5.3c0 5-3.3 9-8 10-4.7-1-8-5-8-10V5.2L12 2z" fill={C.red} opacity=".15" stroke={C.red} strokeWidth="1.4" /><path d="M12 8v4.5M12 15.5v.5" stroke={C.red} strokeWidth="2" strokeLinecap="round" /></svg>);

function barColor(pct) { return pct >= 71 ? C.pine : pct >= 41 ? C.ocean : pct > 0 ? C.gold : C.line; }

/* ---------- CSS ---------- */
const CSS = `
*{box-sizing:border-box}
body{margin:0}
.wrap{max-width:1080px;margin:0 auto;padding:34px 24px 80px}
.eyebrow{font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:${C.pine};font-weight:600;margin-bottom:14px}
.h1{font-size:40px;line-height:1.1;font-weight:700;letter-spacing:-.02em;color:${C.ink};margin:0 0 16px;font-family:'Lora',Georgia,serif}
.h1-res{margin-bottom:4px;font-size:32px}
.lead{font-size:16.5px;line-height:1.6;color:${C.inkSoft};max-width:46ch;margin:0 0 26px}

/* header */
.hdr{position:sticky;top:0;z-index:20;background:rgba(251,252,252,.88);backdrop-filter:blur(10px);border-bottom:1px solid ${C.line}}
.hdr-in{max-width:1080px;margin:0 auto;padding:13px 24px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px;background:none;border:0;cursor:pointer;padding:0}
.brand-txt{font-family:'Lora',Georgia,serif;font-weight:700;font-size:19px;color:${C.ink};letter-spacing:-.01em}
.brand-sub{font-size:11px;color:${C.mute};border-left:1px solid ${C.line};padding-left:10px;margin-left:2px}
.hdr-prog{display:flex;align-items:center;gap:10px}
.hdr-prog-bar{width:140px;height:6px;background:${C.mist};border-radius:99px;overflow:hidden}
.hdr-prog-fill{height:100%;background:${C.pine};border-radius:99px;transition:width .4s ease}
.hdr-prog-txt{font-size:12px;color:${C.mute};font-variant-numeric:tabular-nums;font-weight:600}

/* intro */
.intro-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:start;margin-bottom:40px}
.field{margin-bottom:18px}
.lbl{display:block;font-size:12.5px;font-weight:600;color:${C.inkSoft};margin-bottom:7px;letter-spacing:.01em}
.inp{width:100%;padding:13px 15px;font-size:15px;border:1.5px solid ${C.line};border-radius:10px;background:${C.panel};color:${C.ink};outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit}
.inp:focus{border-color:${C.pine};box-shadow:0 0 0 3px ${C.pineSoft}}
.import-row{margin-top:6px}
.link-btn{font-size:13.5px;color:${C.ocean};cursor:pointer;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.tiers{display:flex;flex-direction:column;gap:16px}
.tier{border:1.5px solid ${C.line};border-radius:14px;padding:22px;background:${C.panel};cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s}
.tier:hover{border-color:${C.pine};box-shadow:0 8px 28px rgba(14,107,83,.08)}
.tier-on{border-color:${C.pine}}
.tier-accent.tier-on{border-color:${C.ocean}}
.tier-tag{font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:${C.pine};margin-bottom:6px}
.tier-accent .tier-tag{color:${C.ocean}}
.tier-name{font-family:'Lora',serif;font-size:21px;font-weight:600;color:${C.ink};margin-bottom:14px}
.tier-pts{list-style:none;padding:0;margin:0 0 18px}
.tier-pts li{display:flex;align-items:center;gap:9px;font-size:13.5px;color:${C.inkSoft};padding:5px 0}
.btn{font-family:inherit;font-size:14.5px;font-weight:600;border-radius:10px;padding:12px 20px;cursor:pointer;border:1.5px solid transparent;transition:all .15s;width:100%}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:${C.pine};color:#fff;border-color:${C.pine}}
.btn-primary:hover:not(:disabled){background:${C.pineDk}}
.btn-accent{background:${C.ocean};color:#fff;border-color:${C.ocean}}
.btn-accent:hover:not(:disabled){background:#0d4459}
.btn-ghost{background:transparent;color:${C.inkSoft};border-color:${C.line};width:auto}
.btn-ghost:hover:not(:disabled){border-color:${C.inkSoft};color:${C.ink}}
.tier-hint{font-size:12px;color:${C.mute};text-align:center;margin-top:8px}
.dstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:${C.line};border:1px solid ${C.line};border-radius:12px;overflow:hidden;margin-bottom:20px}
.dstrip-item{background:${C.panel};padding:13px 15px;display:flex;flex-direction:column;gap:3px}
.dstrip-w{font-size:16px;font-weight:700;color:${C.pine};font-variant-numeric:tabular-nums}
.dstrip-n{font-size:11.5px;color:${C.mute};line-height:1.3}
.disclaimer{font-size:11.5px;color:${C.mute};line-height:1.5;max-width:70ch;border-top:1px solid ${C.line};padding-top:16px}

/* assessment */
.assess{display:grid;grid-template-columns:236px 1fr;gap:36px;align-items:start}
.assess-side{position:sticky;top:78px}
.side-dom{font-size:13px;font-weight:700;margin-bottom:3px}
.side-pos{font-size:11.5px;color:${C.mute};margin-bottom:16px}
.dnav{display:flex;flex-direction:column;gap:11px}
.dnav-grp{opacity:.62;transition:opacity .2s}
.dnav-grp-on{opacity:1}
.dnav-name{font-size:11.5px;color:${C.inkSoft};font-weight:600;margin-bottom:5px}
.dnav-dots{display:flex;gap:5px;flex-wrap:wrap}
.dot-btn{width:13px;height:13px;border-radius:4px;border:1.5px solid ${C.line};background:${C.panel};cursor:pointer;padding:0;transition:all .15s}
.dot-btn:hover{border-color:${C.pine}}
.dot-ans{background:${C.pine};border-color:${C.pine}}
.dot-crit{border-radius:50%}
.dot-cur{box-shadow:0 0 0 3px ${C.pineSoft};border-color:${C.pine}}
.assess-main{min-width:0}
.q-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.q-num{font-family:'Lora',serif;font-size:15px;font-weight:700;color:${C.pine}}
.q-of{color:${C.mute};font-weight:400}
.q-crit{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.red};background:${C.redSoft};padding:3px 9px;border-radius:99px}
.q-frameworks{font-size:11.5px;color:${C.mute};margin-left:auto}
.q-title{font-family:'Lora',serif;font-size:25px;font-weight:600;color:${C.ink};margin:0 0 10px;letter-spacing:-.01em}
.q-text{font-size:15.5px;line-height:1.55;color:${C.inkSoft};margin:0 0 24px;max-width:60ch}
.scale{display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
.opt{display:flex;align-items:center;gap:15px;text-align:left;padding:13px 16px;border:1.5px solid ${C.line};border-radius:11px;background:${C.panel};cursor:pointer;transition:all .14s;font-family:inherit}
.opt:hover{border-color:${C.pine};background:${C.pineSoft}}
.opt-on{border-color:${C.pine};background:${C.pineSoft};box-shadow:0 0 0 1px ${C.pine}}
.opt-score{flex-shrink:0;width:34px;height:34px;border-radius:9px;background:${C.mist};color:${C.inkSoft};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;transition:all .14s}
.opt-on .opt-score{background:${C.pine};color:#fff}
.opt-body{display:flex;flex-direction:column;gap:2px;flex:1}
.opt-label{font-size:14.5px;font-weight:600;color:${C.ink}}
.opt-desc{font-size:12.5px;color:${C.mute};line-height:1.4}
.opt-radio{flex-shrink:0;width:20px;height:20px;border-radius:50%;border:2px solid ${C.line};display:flex;align-items:center;justify-content:center;background:${C.panel}}
.opt-on .opt-radio{background:${C.pine};border-color:${C.pine}}

/* evidence */
.ev{border:1.5px solid ${C.oceanSoft};background:${C.oceanSoft};border-radius:12px;padding:17px 18px;margin-bottom:24px}
.ev-head{margin-bottom:12px}
.ev-title{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.ocean};display:block;margin-bottom:3px}
.ev-sub{font-size:12.5px;color:${C.inkSoft};line-height:1.4}
.ev-attest{display:flex;align-items:center;gap:10px;font-size:14px;color:${C.ink};cursor:pointer;margin-bottom:11px;font-weight:500}
.ev-attest input{width:17px;height:17px;accent-color:${C.ocean};cursor:pointer}
.ev-note{width:100%;min-height:62px;padding:11px 13px;font-size:14px;border:1.5px solid ${C.line};border-radius:9px;background:${C.panel};color:${C.ink};outline:none;resize:vertical;font-family:inherit}
.ev-note:focus{border-color:${C.ocean};box-shadow:0 0 0 3px ${C.oceanSoft}}

/* nav */
.nav{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:8px}
.nav-right{display:flex;gap:10px}
.finish-link{display:block;margin:18px auto 0;background:none;border:0;color:${C.mute};font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;font-family:inherit}
.finish-link:hover{color:${C.inkSoft}}

/* results */
.res-top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.res-actions{display:flex;gap:9px;flex-wrap:wrap}
.banner{border-radius:11px;padding:14px 17px;font-size:13.5px;line-height:1.5;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start}
.banner-warn{background:#FBF5E6;border:1px solid #E8D9A8;color:#6B5618}
.banner-cap{background:${C.redSoft};border:1px solid #E5C3BD;color:#7A2B22}
.res-hero{display:grid;grid-template-columns:auto 1fr;gap:34px;align-items:center;padding:26px;border:1.5px solid ${C.line};border-radius:16px;background:${C.panel};margin-bottom:22px}
.dial{display:flex;flex-direction:column;align-items:center;gap:8px}
.dial-num{font-family:'Lora',serif;font-size:46px;font-weight:700;fill:${C.ink}}
.dial-pct{font-size:13px;fill:${C.mute}}
.dial-label{font-size:12px;color:${C.mute};font-weight:600;letter-spacing:.04em}
.badge-panel{min-width:0}
.badge-vis{display:flex;align-items:center;gap:14px;border:1.5px solid;border-radius:12px;padding:14px 16px;margin-bottom:13px;background:${C.paper}}
.badge-shield{width:46px;height:46px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.badge-tier{font-family:'Lora',serif;font-size:23px;font-weight:700;line-height:1}
.badge-state{font-size:12.5px;color:${C.mute};margin-top:3px}
.badge-blurb{font-size:14px;line-height:1.55;color:${C.inkSoft};margin:0}
.badge-verify{margin-top:10px;font-family:ui-monospace,monospace;font-size:12px;color:${C.ocean};background:${C.oceanSoft};padding:7px 11px;border-radius:7px;display:inline-block}
.sec-h{font-family:'Lora',serif;font-size:19px;font-weight:600;color:${C.ink};margin:28px 0 14px}
.sec-note{font-size:13px;color:${C.mute};margin:-8px 0 14px}
.dbars{display:flex;flex-direction:column;gap:13px}
.dbar-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.dbar-name{font-size:14px;font-weight:600;color:${C.ink}}
.dbar-meta{display:flex;align-items:baseline;gap:12px}
.dbar-w{font-size:11.5px;color:${C.mute}}
.dbar-pct{font-size:14px;font-weight:700;color:${C.ink};font-variant-numeric:tabular-nums;min-width:38px;text-align:right}
.dbar-track{height:9px;background:${C.mist};border-radius:99px;overflow:hidden}
.dbar-fill{height:100%;border-radius:99px;transition:width .8s cubic-bezier(.22,1,.36,1)}
.res-split{display:grid;grid-template-columns:1fr 1.2fr;gap:36px;margin-top:8px}
.fw{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.fw-item{display:flex;align-items:center;gap:11px}
.fw-ring{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fw-ring-in{width:34px;height:34px;border-radius:50%;background:${C.panel};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${C.ink};font-variant-numeric:tabular-nums}
.fw-name{font-size:13px;color:${C.inkSoft};font-weight:500;line-height:1.3}
.gaps{list-style:none;padding:0;margin:0;counter-reset:g}
.gap{display:flex;gap:13px;padding:12px 0;border-bottom:1px solid ${C.line};align-items:center}
.gap:last-child{border-bottom:0}
.gap-score{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums}
.gap-score-lo{background:${C.redSoft};color:${C.red}}
.gap-score-mid{background:#FBF1DC;color:${C.gold}}
.gap-score-hi{background:${C.pineSoft};color:${C.pine}}
.gap-title{font-size:14px;font-weight:600;color:${C.ink};display:flex;align-items:center;gap:8px}
.gap-crit{font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${C.red};background:${C.redSoft};padding:2px 7px;border-radius:99px}
.gap-meta{font-size:12.5px;color:${C.mute};margin-top:2px}
.gap-none{font-size:13.5px;color:${C.pine};padding:10px 0}
.upsell{display:flex;align-items:center;justify-content:space-between;gap:24px;background:${C.ink};border-radius:16px;padding:26px 28px;margin-top:34px}
.upsell-tag{font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:#7FB8C9;margin-bottom:7px}
.upsell-h{font-family:'Lora',serif;font-size:21px;font-weight:600;color:#fff;margin:0 0 7px}
.upsell-p{font-size:14px;line-height:1.5;color:#B9C7D0;margin:0;max-width:52ch}
.upsell .btn-accent{width:auto;white-space:nowrap;flex-shrink:0}
@media(max-width:860px){
 .intro-grid,.res-split{grid-template-columns:1fr}
 .assess{grid-template-columns:1fr}
 .assess-side{position:static;margin-bottom:8px}
 .dnav{flex-direction:row;flex-wrap:wrap;gap:10px}
 .res-hero{grid-template-columns:1fr;text-align:center}
 .dstrip{grid-template-columns:repeat(2,1fr)}
 .upsell{flex-direction:column;align-items:flex-start}
}
@media print{
 .hdr,.res-actions,.upsell,.finish-link{display:none}
 .wrap{padding:0}
}
`;
