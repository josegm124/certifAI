import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { completion, levelById } from "../lib/scoring";
import {
  createRemediationAssessment,
  finalizeAssessment,
  publicVerificationUrl,
} from "../lib/api";
import { loadResultsPage } from "../lib/resultsHydration";
import { barColor } from "../theme";
import ScoreDial from "../components/ScoreDial";
import LevelBadge, { LEVEL_COLOR } from "../components/Badges";
import CertificateOptions from "../components/CertificateOptions";
import { ShieldAlert } from "../components/icons";

export default function Results() {
  const { org, answers, assessmentId, aiSystemName, server, setServer, setAssessment } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftReadyId, setDraftReadyId] = useState<string | null>(null);
  const navigate = useNavigate();
  const comp = completion(answers);

  useEffect(() => {
    if (server) return;
    let cancelled = false;
    setDraftReadyId(null);

    loadResultsPage(assessmentId)
      .then((state) => {
        if (cancelled) return;
        if (state.kind === "empty") {
          navigate("/start", { replace: true });
          return;
        }
        setAssessment(state.assessment, false);
        if (state.kind === "draft") {
          setDraftReadyId(state.assessment.id);
          return;
        }
        setServer(state.response);
      })
      .catch(() => {
        if (!cancelled) navigate("/dashboard", { replace: true });
      });

    return () => { cancelled = true; };
  }, [server, assessmentId, setAssessment, setServer, navigate]);

  if (!server && (!assessmentId || draftReadyId !== assessmentId)) {
    return <main className="wrap"><div className="card">Loading your result…</div></main>;
  }

  async function finalize() {
    if (!assessmentId || comp.pct < 100 || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await finalizeAssessment(assessmentId);
      setAssessment(response.assessment, false);
      setServer(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not finalize assessment");
    } finally {
      setBusy(false);
    }
  }

  async function startRemediation() {
    if (!assessmentId || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await createRemediationAssessment(assessmentId);
      setAssessment(response.assessment, false);
      navigate("/assess");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start remediation");
      setBusy(false);
    }
  }

  if (!server) return <main className="wrap"><div className="card" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: 44 }}>
    <div className="eyebrow">Final review · {aiSystemName}</div>
    <h1 className="h2">Submit the stored readiness assessment</h1>
    <p className="lead" style={{ margin: "0 auto 20px" }}>{comp.answered} of {comp.total} answers are ready. The backend will calculate and permanently store the official score, band and nine critical-control results.</p>
    {comp.pct < 100 && <div className="banner banner-cap"><ShieldAlert />All {comp.total} questions must be persisted before finalisation. <Link to="/assess">Return to the assessment.</Link></div>}
    {error && <div className="banner banner-cap" role="alert" style={{ marginTop: 14 }}>{error}</div>}
    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}><Link className="btn btn-ghost" to="/assess">Review answers</Link><button className="btn btn-accent" disabled={busy || comp.pct < 100} onClick={finalize}>{busy ? "Calculating on server…" : "Finalize assessment"}</button></div>
  </div></main>;

  const level = levelById(server.result.level.id);
  return <main className="wrap wrap-wide">
    <div className="dash-top no-print"><div><div className="eyebrow">Official readiness result · {org}</div><h1 className="h1" style={{ fontSize: 32 }}>AI systems in scope: {aiSystemName}</h1></div><div style={{ display: "flex", gap: 10 }}>{server.badge && <button className="btn btn-primary" onClick={() => window.print()}>Print certificate</button>}<Link to="/dashboard" className="btn btn-ghost">Dashboard</Link></div></div>

    {error && <div className="banner banner-cap no-print" role="alert">{error}</div>}

    <section className={server.badge ? "print-certificate" : ""}>
      {server.badge && <div className="print-certificate-heading"><div className="eyebrow">CertifAI certificate</div><h1>{org}</h1><p>AI Governance Readiness self-certification</p></div>}
      <div className="res-hero"><ScoreDial pct={server.result.overallScore} color={LEVEL_COLOR[level.id]} /><div className="lvlpanel" style={{ border: 0 }}><LevelBadge level={level.id} size={62} /><div className="lvlpanel-body"><div className="lvlpanel-name">{server.badge ? server.badge.tier : level.name}</div><div className="lvlpanel-state">Adoption stage {server.adoptionStage} · backend score of record</div><div className="lvlpanel-blurb">{level.blurb}</div></div></div></div>
      {server.badge && <div className="certificate-record"><div><span>Issued</span><strong>{new Date(server.badge.issuedAt).toLocaleDateString()}</strong></div><div><span>Valid until</span><strong>{new Date(server.badge.expiresAt).toLocaleDateString()}</strong></div><div><span>Selected product</span><strong>{server.badge.productId}</strong></div><div><span>Verification token</span><strong>{server.badge.verificationToken}</strong></div></div>}
      {server.badge && <p className="disclaimer">Based on a self-assessment completed by the organisation and recorded evidence. This is not an official conformity assessment under the EU AI Act.</p>}
    </section>

    {server.badge && <div className="banner banner-info no-print"><div><strong>{server.badge.tier} certificate issued</strong><br />Valid until {new Date(server.badge.expiresAt).toLocaleDateString()} · <a href={publicVerificationUrl(server.badge.verificationToken)} target="_blank" rel="noreferrer">Open public verification</a></div></div>}

    {server.failedControls.length > 0 && <section className="red-flag-section no-print">
      <div className="banner banner-cap"><ShieldAlert /><div><strong>Certificate eligibility is blocked, but your {level.name} score band has not changed.</strong> Review every failed control below and use the guidance to prepare a new remediation assessment.</div></div>
      <h2 className="h2">Remediation guidance</h2>
      <div className="red-flag-list">{server.failedControls.map((control) => <article className="card red-flag-card" key={control.questionId}>
        <div className="card-h"><div><span className="card-t">Q{control.questionId} · {control.questionTitle}</span><div className="card-sub">{control.domainName}</div></div><span className="gap-score gap-score-lo">{control.scoreGiven}/{control.thresholdRequired}</span></div>
        <p className="q-text">{control.questionText}</p>
        <div className="case-meta">Score given {control.scoreGiven}/5 · score required {control.thresholdRequired}/5</div>
        <p className="remediation-copy">{control.guidance}</p>
      </article>)}</div>
      <button className="btn btn-primary" disabled={busy} onClick={startRemediation}>{busy ? "Creating remediation…" : "Start remediation assessment"}</button>
    </section>}

    {!server.badge && assessmentId && <div className="no-print"><CertificateOptions assessmentId={assessmentId} levelId={level.id} /></div>}

    <section className="no-print">
      <h3 className="sec-h">Maturity by domain</h3>
      <div className="dbars">{server.result.domainScores.map((domain) => <div key={domain.id}><div className="dbar-top"><span className="dbar-name">{domain.name}</span><span className="dbar-pct">{domain.pct}%</span></div><div className="dbar-track"><div className="dbar-fill" style={{ width: `${domain.pct}%`, background: barColor(domain.pct) }} /></div><div className="case-meta">{domain.answeredCount}/{domain.totalCount} controls · weakest: {domain.weakestQuestionTitle ?? "none"}</div></div>)}</div>

      <h3 className="sec-h">Framework coverage</h3>
      <div className="certs framework-cards">{server.result.frameworkCoverage.map((framework) => <Link to={`/certifications/${framework.id}`} className="cert" key={framework.id}><div><div className="cert-tag">{framework.type}</div><div className="cert-name">{framework.name}</div><div className="case-meta">{framework.answeredCount}/{framework.totalCount} mapped controls</div></div><div className="cert-lvl"><div className="cert-track"><div className="cert-fill" style={{ width: `${framework.pct}%`, background: barColor(framework.pct) }} /></div><span className="metric-pct">{framework.pct}%</span></div></Link>)}</div>

      <h3 className="sec-h">Priority improvement areas</h3>
      <ul className="gaps">{server.result.gaps.slice(0, 8).map((gap) => <li className="gap" key={gap.id}><span className={`gap-score gap-score-${gap.score <= 1 ? "lo" : gap.score <= 3 ? "mid" : "hi"}`}>{gap.score}</span><div><div className="gap-title">{gap.title}</div><div className="gap-meta">{gap.domainName} · raise {gap.gapSize} {gap.gapSize === 1 ? "level" : "levels"}</div></div></li>)}</ul>
    </section>
  </main>;
}
