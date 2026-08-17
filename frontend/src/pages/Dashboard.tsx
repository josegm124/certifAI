import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  createRemediationAssessment,
  getAssessmentDashboard,
  getAssessments,
  publicVerificationUrl,
  type AssessmentDashboardResponse,
  type AssessmentRecord,
  type FinalizationResponse,
} from "../lib/api";
import { useStore } from "../store/useStore";
import { C, barColor } from "../theme";
import MaturityMatrix, { type MaturityMatrixRow } from "../components/MaturityMatrix";
import RadarChart, { type RadarPoint } from "../components/RadarChart";
import ScoreDial from "../components/ScoreDial";
import LevelBadge, { LEVEL_COLOR } from "../components/Badges";
import CertificateOptions from "../components/CertificateOptions";
import { Arrow, ShieldAlert } from "../components/icons";

const caseDate = (item: AssessmentRecord) => new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date(item.completedAt || item.createdAt));

export default function Dashboard() {
  const { profile, assessment, setAssessment, setServer } = useStore();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AssessmentDashboardResponse | null>(null);
  const [radarView, setRadarView] = useState<"domains" | "frameworks">("domains");
  const [loading, setLoading] = useState(true);
  const [remediating, setRemediating] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setError("");
    getAssessments()
      .then(({ assessments }) => {
        if (!active) return;
        setHistory(assessments);
        setSelectedId((selected) => {
          if (selected && assessments.some((item) => item.id === selected)) return selected;
          if (assessment && assessments.some((item) => item.id === assessment.id)) return assessment.id;
          return assessments[0]?.id ?? null;
        });
        if (!assessments.length) setLoading(false);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Could not load dashboard");
        setLoading(false);
      });
    return () => { active = false; };
  }, [assessment?.id, assessment?.status]);

  useEffect(() => {
    if (!selectedId) {
      setDashboard(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    getAssessmentDashboard(selectedId)
      .then((response) => { if (active) setDashboard(response); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load this assessment"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const result = dashboard?.result;
  const record = dashboard?.assessment;
  const activeAssessment = history.find((item) => item.status === "draft");

  const domainRadar: RadarPoint[] = useMemo(() => result?.domainScores.map((domain) => ({
    id: domain.id,
    label: domain.name,
    short: domain.short,
    pct: domain.pct,
  })) ?? [], [result]);

  const frameworkRadar: RadarPoint[] = useMemo(() => result?.frameworkCoverage.map((framework) => ({
    id: framework.id,
    label: framework.name,
    short: framework.short,
    pct: framework.pct,
  })) ?? [], [result]);

  const matrixRows: MaturityMatrixRow[] = useMemo(() => result?.domainScores.map((domain) => {
    const weak = domain.weakestQuestionTitle != null && domain.weakestScore != null
      ? { title: domain.weakestQuestionTitle, score: domain.weakestScore }
      : undefined;
    return {
      id: domain.id,
      name: domain.name,
      level: domain.maturityLevel,
      pct: domain.pct,
      answered: domain.answeredCount,
      weak,
      improve: weak
        ? `Raise “${weak.title}” (now ${weak.score}/5) with documented evidence.`
        : "Answer this domain’s controls to see guidance.",
    };
  }) ?? [], [result]);

  function selectForNavigation() {
    if (!dashboard) return false;
    setAssessment(dashboard.assessment, false);
    return true;
  }

  function openAssessment() {
    if (!selectForNavigation() || !dashboard || !result) return;
    if (dashboard.assessment.status === "finalized") {
      setServer(dashboard as FinalizationResponse);
      navigate("/results");
    } else {
      navigate("/assess");
    }
  }

  function openDomain(domainId: string) {
    if (!selectForNavigation()) return;
    navigate(`/dimensions/${domainId}`);
  }

  function openFramework(frameworkId: string) {
    if (!selectForNavigation()) return;
    navigate(`/certifications/${frameworkId}`);
  }

  async function startRemediation() {
    if (!record || remediating) return;
    setRemediating(true);
    setError("");
    try {
      const response = await createRemediationAssessment(record.id);
      setAssessment(response.assessment, false);
      navigate("/assess");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start remediation");
      setRemediating(false);
    }
  }

  return <main className="wrap wrap-wide">
    <div className="dash-top">
      <div><div className="eyebrow">Dashboard · {profile?.company.name}</div><h1 className="h1" style={{ fontSize: 32, marginBottom: 4 }}>AI governance assessments</h1></div>
      <Link className="btn btn-primary" to="/start">{activeAssessment ? "Resume assessment" : "New assessment"}</Link>
    </div>

    {error && <div className="banner banner-cap" role="alert">{error}</div>}

    {history.length > 0 && <section aria-label="Assessment cases" className="assessment-cases">
      <div className="assessment-cases-head"><span className="card-t">Assessment history</span><span className="card-sub">Select a readiness assessment · analytics loaded from the backend</span></div>
      <div className="assessment-tabs" role="tablist" aria-label="Select an assessment">
        {history.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={selectedId === item.id} className={`assessment-tab ${selectedId === item.id ? "assessment-tab-on" : ""}`} onClick={() => setSelectedId(item.id)}>
          <span className="assessment-tab-tag">Case {String(index + 1).padStart(2, "0")} · {item.status}{item.remediationSourceAssessmentId ? " · remediation" : ""}</span>
          <strong>{item.aiSystem.name}</strong>
          <span>{caseDate(item)} · {item.completionPercentage}% complete{item.overallScore != null ? ` · ${item.overallScore}/100` : ""}</span>
        </button>)}
      </div>
    </section>}

    {!loading && history.length === 0 && <div className="card" style={{ textAlign: "center", padding: 44, marginTop: 22 }}><h2 className="h2">Your dashboard is waiting.</h2><p className="lead" style={{ margin: "0 auto 22px" }}>Create an organisational readiness assessment and record the AI systems in scope.</p><Link className="btn btn-primary" to="/start">Start assessment</Link></div>}
    {loading && history.length > 0 && <div className="card dashboard-loading" role="status">Loading the selected assessment from the backend…</div>}

    {!loading && dashboard && record && result && <>
      <div className="dash-top selected-case-head">
        <div><div className="eyebrow">{record.status === "finalized" ? "Final readiness assessment" : "Assessment in progress"} · Adoption stage {record.adoptionStage}</div><h2 className="h2" style={{ marginBottom: 4 }}>AI systems in scope: {record.aiSystem.name}</h2><div className="case-meta">Created {caseDate(record)} · {result.completion.answered}/{result.completion.total} controls stored</div></div>
        <button className="btn btn-ghost" onClick={openAssessment}>{record.status === "finalized" ? "Full report" : "Continue assessment"} <Arrow /></button>
      </div>

      {record.status === "draft" && <div className="banner banner-info">This backend-driven progress preview is not an official result. Final score, red flags and eligibility are written only when the assessment is finalised.</div>}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="res-hero">
        <ScoreDial pct={result.overallScore} color={LEVEL_COLOR[result.level.id]} />
        <div className="lvlpanel" style={{ border: 0, padding: 0 }}><LevelBadge level={result.level.id} size={62} /><div className="lvlpanel-body"><div className="lvlpanel-name">{result.level.name}<span className="rung-code" style={{ background: LEVEL_COLOR[result.level.id] }}>{result.level.id}</span></div><div className="lvlpanel-state">{record.status === "draft" ? "Progress preview · not certified" : dashboard.badge ? "Certificate issued" : "Readiness result · score of record"} · {result.completion.percentage}% complete</div><div className="lvlpanel-blurb">{result.level.blurb}</div></div></div>
      </motion.div>

      {dashboard.failedControls.length > 0 && <section className="red-flag-section">
        <div className="banner banner-cap"><ShieldAlert /><div><strong>{dashboard.failedControls.length} critical control{dashboard.failedControls.length === 1 ? "" : "s"} failed.</strong> Your score and {result.level.name} band remain unchanged, but every certificate option is blocked for this assessment.</div></div>
        <h3 className="sec-h">Remediation guidance</h3>
        <div className="red-flag-list">{dashboard.failedControls.map((control) => <article className="card red-flag-card" key={control.questionId}>
          <div className="card-h"><div><span className="card-t">Q{control.questionId} · {control.questionTitle}</span><div className="card-sub">{control.domainName}</div></div><span className="gap-score gap-score-lo">{control.scoreGiven}/{control.thresholdRequired}</span></div>
          <p className="q-text">{control.questionText}</p>
          <div className="case-meta">Score given {control.scoreGiven}/5 · score required {control.thresholdRequired}/5</div>
          <p className="remediation-copy">{control.guidance}</p>
        </article>)}</div>
        <button className="btn btn-primary" disabled={remediating || Boolean(activeAssessment)} onClick={startRemediation}>{remediating ? "Creating remediation…" : activeAssessment ? "Finish the current draft before remediation" : "Start remediation assessment"}</button>
      </section>}

      {record.status === "finalized" && dashboard.badge && <div className="banner banner-info"><div><strong>{dashboard.badge.tier} certificate issued</strong><br />Verification token {dashboard.badge.verificationToken.slice(0, 8)}… · <a href={publicVerificationUrl(dashboard.badge.verificationToken)} target="_blank" rel="noreferrer">Open public verification</a></div></div>}
      {record.status === "finalized" && !dashboard.badge && <CertificateOptions assessmentId={record.id} levelId={result.level.id} />}

      <div className="dash-grid">
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}><div className="card-h"><span className="card-t">Maturity valuation matrix</span><span className="card-sub">domain × maturity level</span></div><p className="sec-note" style={{ margin: "2px 0 14px" }}>Hover a row for its drivers · click to open the deep-dive.</p><MaturityMatrix rows={matrixRows} onOpen={openDomain} /></motion.div>
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}><div className="card-h"><span className="card-t">Coverage radar</span><div className="seg"><button className={radarView === "domains" ? "on" : ""} onClick={() => setRadarView("domains")}>Domains</button><button className={radarView === "frameworks" ? "on" : ""} onClick={() => setRadarView("frameworks")}>Frameworks</button></div></div><RadarChart key={radarView} data={radarView === "domains" ? domainRadar : frameworkRadar} benchmark={result.nextLevel?.min} benchmarkLabel={result.nextLevel ? `${result.nextLevel.name} target` : undefined} accent={LEVEL_COLOR[result.level.id] === C.mute ? C.pine : LEVEL_COLOR[result.level.id]} linkBase={null} onSelect={radarView === "domains" ? openDomain : openFramework} /></motion.div>
      </div>

      <h3 className="sec-h">Certificate status</h3>
      <div className="certs"><div className="cert"><div><div className="cert-tag">Readiness assessment</div><div className="cert-name">AI Governance Readiness Result</div></div><div className="cert-lvl"><LevelBadge level={result.level.id} size={30} /><div className="cert-track"><div className="cert-fill" style={{ width: `${result.completion.percentage}%`, background: barColor(result.completion.percentage) }} /></div><span className="metric-pct">{result.completion.percentage}%</span></div><button className="btn btn-ghost" onClick={openAssessment}>{record.status === "draft" ? "Continue assessment" : "View result"} <Arrow /></button></div>
        <div className={`cert ${!dashboard.certificateEligibility.allowed && !dashboard.badge ? "cert-locked" : ""}`}><div><div className="cert-tag">Evidence dossier and certificate</div><div className="cert-name">{dashboard.badge ? `${dashboard.badge.tier} certificate issued` : dashboard.certificateEligibility.allowed ? `${result.level.name} or lower available` : "Certificate gate blocked"}</div></div><div className="cert-lvl"><LevelBadge level={result.level.id} size={30} /><div className="cert-track"><div className="cert-fill" style={{ width: `${result.overallScore}%`, background: barColor(result.overallScore) }} /></div><span className="metric-pct">{result.overallScore}%</span></div><div className="case-meta">{dashboard.badge ? `Issued from selected product ${dashboard.badge.productId}.` : dashboard.certificateEligibility.failedCriticalCount ? "Use the guidance above and create a new remediation assessment." : result.level.id === "A1" ? "Aware results do not support a certificate." : "Complete the evidence dossier and self-certification declaration."}</div></div></div>

      <h3 className="sec-h">Explore the frameworks</h3><p className="sec-note">Backend-calculated readiness for the controls mapped to each framework.</p>
      <div className="certs framework-cards">{result.frameworkCoverage.map((framework) => <motion.button key={framework.id} className="cert" style={{ textAlign: "left", cursor: "pointer", font: "inherit" }} whileHover={{ y: -4 }} onClick={() => openFramework(framework.id)}><div><div className="cert-tag">{framework.type}</div><div className="cert-name">{framework.name}</div><div className="case-meta">{framework.answeredCount}/{framework.totalCount} mapped controls stored</div></div><div className="cert-lvl"><div className="cert-track"><div className="cert-fill" style={{ width: `${framework.pct}%`, background: barColor(framework.pct) }} /></div><span className="metric-pct">{framework.pct}%</span></div><span className="hdr-link" style={{ paddingLeft: 0, color: C.ocean, fontSize: 13 }}>Dig in →</span></motion.button>)}</div>

      <h3 className="sec-h">What to do next</h3>
      <div className="rail"><div className="rail-next"><div className="rail-next-t">{result.nextLevel ? "Next level" : "Current position"}</div><div className="rail-next-h">{result.nextLevel ? `${result.nextLevel.pointsNeeded} points from ${result.nextLevel.name}` : "Highest score band reached"}</div><div className="rail-next-p">The score band is independent of the certificate gate. Strengthen the highest-priority gaps and keep supporting evidence current.</div></div><div className="card"><div className="card-h"><span className="card-t">Top priority gaps</span><span className="card-sub">weighted by domain</span></div><ul className="gaps">{result.gaps.slice(0, 6).map((gap) => <li key={gap.id} className="gap" onClick={() => openDomain(gap.domainId)}><span className={`gap-score gap-score-${gap.score <= 1 ? "lo" : gap.score <= 3 ? "mid" : "hi"}`}>{gap.score}</span><div><div className="gap-title">{gap.title}</div><div className="gap-meta">{gap.domainName} · raise {gap.gapSize} {gap.gapSize === 1 ? "level" : "levels"} to close</div></div></li>)}</ul></div></div>
    </>}
  </main>;
}
