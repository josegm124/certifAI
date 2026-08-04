import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getAssessmentDashboard,
  getAssessments,
  type AssessmentDashboardResponse,
  type AssessmentRecord,
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
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    let current = true;
    setError(null);
    getAssessments()
      .then(({ assessments }) => {
        if (!current) return;
        setHistory(assessments);
        setSelectedId((selected) => {
          if (selected && assessments.some((item) => item.id === selected)) return selected;
          if (assessment && assessments.some((item) => item.id === assessment.id)) return assessment.id;
          return assessments[0]?.id ?? null;
        });
        if (!assessments.length) setLoading(false);
      })
      .catch((err) => {
        if (!current) return;
        setError(err instanceof Error ? err.message : "Could not load dashboard");
        setLoading(false);
      });
    return () => { current = false; };
  }, [assessment?.id, assessment?.status]);

  useEffect(() => {
    if (!selectedId) {
      setDashboard(null);
      return;
    }
    let current = true;
    setDashboard(null);
    setLoading(true);
    setError(null);
    getAssessmentDashboard(selectedId)
      .then((response) => { if (current) setDashboard(response); })
      .catch((err) => {
        if (current) setError(err instanceof Error ? err.message : "Could not load this assessment");
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
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
        ? `Raise "${weak.title}" (now ${weak.score}/5) with documented evidence.`
        : "Answer this domain's controls to see guidance.",
    };
  }) ?? [], [result]);

  function useSelectedAssessment() {
    if (!dashboard) return false;
    setAssessment(dashboard.assessment, false);
    return true;
  }

  function openAssessment() {
    if (!useSelectedAssessment() || !dashboard) return;
    if (dashboard.assessment.status === "finalized") {
      setServer(dashboard);
      nav("/results");
    } else {
      nav("/assess");
    }
  }

  function openDomain(domainId: string) {
    if (!useSelectedAssessment()) return;
    nav(`/dimensions/${domainId}`);
  }

  function openFramework(frameworkId: string) {
    if (!useSelectedAssessment()) return;
    nav(`/certifications/${frameworkId}`);
  }

  return (
    <main className="wrap wrap-wide">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Dashboard · {profile?.company.name}</div>
          <h1 className="h1" style={{ fontSize: 32, marginBottom: 4 }}>AI governance assessments</h1>
        </div>
        <Link className="btn btn-primary" to="/start">
          {activeAssessment ? "Resume assessment" : "New assessment"}
        </Link>
      </div>

      {error && <div className="banner banner-cap">{error}</div>}

      {history.length > 0 && (
        <section aria-label="Assessment cases" className="assessment-cases">
          <div className="assessment-cases-head">
            <span className="card-t">Assessment cases</span>
            <span className="card-sub">Select a case · analytics loaded from the backend</span>
          </div>
          <div className="assessment-tabs" role="tablist" aria-label="Select an assessment">
            {history.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selectedId === item.id}
                className={`assessment-tab ${selectedId === item.id ? "assessment-tab-on" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="assessment-tab-tag">Case {String(index + 1).padStart(2, "0")} · Tier {item.tier} · {item.status}</span>
                <strong>{item.aiSystem.name}</strong>
                <span>{caseDate(item)} · {item.completionPercentage}% complete{item.overallScore != null ? ` · ${item.overallScore}/100` : ""}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && history.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 44, marginTop: 22 }}>
          <h2 className="h2">Your dashboard is waiting.</h2>
          <p className="lead" style={{ margin: "0 auto 22px" }}>Create an assessment for a real AI system.</p>
          <Link className="btn btn-primary" to="/start">Start assessment</Link>
        </div>
      )}

      {loading && history.length > 0 && (
        <div className="card dashboard-loading" role="status">Loading the selected case from the backend…</div>
      )}

      {!loading && dashboard && record && result && (
        <>
          <div className="dash-top selected-case-head">
            <div>
              <div className="eyebrow">{record.status === "finalized" ? "Final assessment" : "Assessment in progress"} · Tier {record.tier}</div>
              <h2 className="h2" style={{ marginBottom: 4 }}>{record.aiSystem.name}</h2>
              <div className="case-meta">Created {caseDate(record)} · {result.completion.answered}/{result.completion.total} controls stored</div>
            </div>
            <button className="btn btn-ghost" onClick={openAssessment}>
              {record.status === "finalized" ? "Full report" : "Continue assessment"} <Arrow />
            </button>
          </div>

          {record.status === "draft" && (
            <div className="banner banner-info">
              This is a backend progress preview based only on saved answers. The score and level are not final until the assessment is completed.
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="res-hero"
          >
            <ScoreDial pct={result.overallScore} color={LEVEL_COLOR[result.level.id]} />
            <div className="lvlpanel" style={{ border: 0, padding: 0 }}>
              <LevelBadge level={result.level.id} size={62} />
              <div className="lvlpanel-body">
                <div className="lvlpanel-name">
                  {result.level.name}
                  <span className="rung-code" style={{ background: LEVEL_COLOR[result.level.id] }}>{result.level.id}</span>
                </div>
                <div className="lvlpanel-state">
                  {record.status === "draft"
                    ? "Backend progress preview · not certified"
                    : record.tier === 1
                      ? "Readiness result · badge preview only"
                      : dashboard.badge
                      ? "Issued by CertifAI"
                      : "Score of record · no badge issued"}
                  {" · "}{result.completion.percentage}% complete
                </div>
                <div className="lvlpanel-blurb">{result.level.blurb}</div>
              </div>
            </div>
          </motion.div>

          {result.cappedReason && (
            <div className="banner banner-cap">
              <ShieldAlert />
              <div>
                <strong>Level held at {result.level.name}.</strong> {result.cappedReason}
                {result.criticalGating.failedIds.length > 0 && ` Failed critical controls: ${result.criticalGating.failedIds.map((id) => `Q${id}`).join(", ")}.`}
              </div>
            </div>
          )}

          {record.status === "finalized" && record.tier === 1 && (
            <CertificateOptions assessmentId={record.id} levelId={result.level.id} />
          )}

          <div className="dash-grid">
            <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="card-h">
                <span className="card-t">Maturity valuation matrix</span>
                <span className="card-sub">domain × maturity level</span>
              </div>
              <p className="sec-note" style={{ margin: "2px 0 14px" }}>Hover a row for its drivers · click to open the deep-dive.</p>
              <MaturityMatrix rows={matrixRows} onOpen={openDomain} />
            </motion.div>

            <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
              <div className="card-h">
                <span className="card-t">Coverage radar</span>
                <div className="seg">
                  <button className={radarView === "domains" ? "on" : ""} onClick={() => setRadarView("domains")}>Domains</button>
                  <button className={radarView === "frameworks" ? "on" : ""} onClick={() => setRadarView("frameworks")}>Frameworks</button>
                </div>
              </div>
              <RadarChart
                key={radarView}
                data={radarView === "domains" ? domainRadar : frameworkRadar}
                benchmark={result.nextLevel?.min}
                benchmarkLabel={result.nextLevel ? `${result.nextLevel.name} target` : undefined}
                accent={LEVEL_COLOR[result.level.id] === C.mute ? C.pine : LEVEL_COLOR[result.level.id]}
                linkBase={null}
                onSelect={radarView === "domains" ? openDomain : openFramework}
              />
            </motion.div>
          </div>

          <h3 className="sec-h">Certificate status</h3>
          <div className="certs">
            <div className="cert">
              <div>
                <div className="cert-tag">Tier 1 · readiness snapshot</div>
                <div className="cert-name">AI Governance Readiness Snapshot</div>
              </div>
              <div className="cert-lvl">
                <LevelBadge level={result.level.id} size={30} />
                <div className="cert-track"><div className="cert-fill" style={{ width: `${result.completion.percentage}%`, background: barColor(result.completion.percentage) }} /></div>
                <span className="metric-pct">{result.completion.percentage}%</span>
              </div>
              <button className="btn btn-ghost" onClick={openAssessment}>
                {record.status === "draft" ? "Continue assessment" : "View result"} <Arrow />
              </button>
            </div>

            <div className={`cert ${record.tier === 1 && result.level.id === "A1" ? "cert-locked" : ""}`}>
              <div>
                <div className="cert-tag">Tier 2 · evidence-based certificate</div>
                <div className="cert-name">{record.tier === 1 ? result.level.id === "A1" ? "No certificate available" : `${result.level.name} certificate preview` : dashboard.badge ? `${dashboard.badge.tier} badge issued` : "Certificate requirements"}</div>
              </div>
              <div className="cert-lvl">
                <LevelBadge level={result.level.id} size={30} />
                <div className="cert-track"><div className="cert-fill" style={{ width: `${result.overallScore}%`, background: barColor(result.overallScore) }} /></div>
                <span className="metric-pct">{result.overallScore}%</span>
              </div>
              <div className="case-meta">
                {record.tier === 1
                  ? result.level.id === "A1" ? "Improve the dashboard gaps and take a new assessment later." : `This score supports certificates up to ${result.level.name}. Preview only; nothing has been issued.`
                  : dashboard.badge
                    ? `Verification token ${dashboard.badge.verificationToken.slice(0, 8)}…`
                    : record.status === "draft" ? "Complete and sign the assessment to request a badge." : "The final result did not meet the badge gates."}
              </div>
              {record.tier === 2 && <div className="case-meta">The current release stores evidence references and requires stored evidence before a certificate can be issued. Automated review is in development.</div>}
            </div>
          </div>

          <h3 className="sec-h">Explore the frameworks</h3>
          <p className="sec-note">Backend-calculated readiness for the controls mapped to each framework.</p>
          <div className="certs framework-cards">
            {result.frameworkCoverage.map((framework) => (
              <motion.button
                key={framework.id}
                className="cert"
                style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                onClick={() => openFramework(framework.id)}
              >
                <div>
                  <div className="cert-tag">{framework.type}</div>
                  <div className="cert-name">{framework.name}</div>
                  <div className="case-meta">{framework.answeredCount}/{framework.totalCount} mapped controls stored</div>
                </div>
                <div className="cert-lvl">
                  <div className="cert-track"><div className="cert-fill" style={{ width: `${framework.pct}%`, background: barColor(framework.pct) }} /></div>
                  <span className="metric-pct">{framework.pct}%</span>
                </div>
                <span className="hdr-link" style={{ paddingLeft: 0, color: C.ocean, fontSize: 13 }}>Dig in →</span>
              </motion.button>
            ))}
          </div>

          <h3 className="sec-h">What to do next</h3>
          <div className="rail">
            <div className="rail-next">
              <div className="rail-next-t">{result.nextLevel ? "Next level" : "Current position"}</div>
              <div className="rail-next-h">
                {result.nextLevel
                  ? result.nextLevel.pointsNeeded > 0
                    ? `${result.nextLevel.pointsNeeded} points from ${result.nextLevel.name}`
                    : `Score band reached for ${result.nextLevel.name}`
                  : "Highest score band reached"}
              </div>
              <div className="rail-next-p">
                {result.nextLevel
                  ? result.nextLevel.pointsNeeded > 0
                    ? `Close the highest-priority gaps below to reach ${result.nextLevel.min}. `
                    : `The score threshold is met; all certificate gates must also pass. `
                  : "Keep the stored evidence and controls current."}
                {result.nextLevel?.needsEvidence && !result.hasEvidence ? "Stored evidence is required. " : ""}
                {result.nextLevel?.needsSignature && !record.signatoryName ? "A signed self-certification is also required." : ""}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><span className="card-t">Top priority gaps</span><span className="card-sub">weighted by domain & criticality</span></div>
              <ul className="gaps">
                {result.gaps.slice(0, 6).map((gap) => (
                  <li key={gap.id} className="gap" onClick={() => openDomain(gap.domainId)}>
                    <span className={`gap-score gap-score-${gap.score <= 1 ? "lo" : gap.score <= 3 ? "mid" : "hi"}`}>{gap.score}</span>
                    <div>
                      <div className="gap-title">{gap.title}{gap.critical && <span className="gap-crit">critical</span>}</div>
                      <div className="gap-meta">{gap.domainName} · raise {gap.gapSize} {gap.gapSize === 1 ? "level" : "levels"} to close</div>
                    </div>
                  </li>
                ))}
                {result.gaps.length === 0 && (
                  <li className="empty-gap">{result.completion.answered ? "No scored gaps remain." : "Save answers to see prioritised gaps."}</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
