import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { completion, gapAnalysis, frameworkCoverage, levelById } from "../lib/scoring";
import { finalizeAssessment } from "../lib/api";
import { C, barColor } from "../theme";
import ScoreDial from "../components/ScoreDial";
import LevelBadge, { LEVEL_COLOR } from "../components/Badges";
import { Check, ShieldAlert } from "../components/icons";

export default function Results() {
  const { org, tier, answers, assessmentId, aiSystemName, server, setServer, setAssessment } = useStore();
  const [signatoryName, setSignatoryName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const comp = completion(answers);
  const gaps = useMemo(() => gapAnalysis(answers), [answers]);
  const frameworks = useMemo(() => frameworkCoverage(answers), [answers]);

  async function finalize() {
    if (!assessmentId || comp.pct < 100) return;
    setBusy(true); setError(null);
    try {
      const response = await finalizeAssessment(assessmentId, tier === 2 ? signatoryName : undefined);
      setAssessment(response.assessment, false);
      setServer(response);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not finalize assessment"); }
    finally { setBusy(false); }
  }

  if (!server) return <main className="wrap"><div className="card" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: 44 }}>
    <div className="eyebrow">Final review · {aiSystemName}</div><h1 className="h2">Submit the stored assessment</h1>
    <p className="lead" style={{ margin: "0 auto 20px" }}>{comp.answered} of {comp.total} answers are ready. The backend will load the saved answers, calculate the official score and close this assessment.</p>
    {comp.pct < 100 && <div className="banner banner-cap"><ShieldAlert />All 36 questions must be persisted before finalization. <Link to="/assess">Return to the assessment.</Link></div>}
    {tier === 2 && <div style={{ textAlign: "left", marginTop: 20 }}><div className="field"><label className="lbl">Full name of signatory</label><input className="input" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} /></div><label className="ev-attest"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>I confirm that the answers and evidence references are accurate to the best of my knowledge.</span></label></div>}
    {error && <div className="banner banner-cap" style={{ marginTop: 14 }}>{error}</div>}
    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}><Link className="btn btn-ghost" to="/assess">Review answers</Link><button className="btn btn-accent" disabled={busy || comp.pct < 100 || (tier === 2 && (!signatoryName.trim() || !accepted))} onClick={finalize}>{busy ? "Calculating on server…" : tier === 2 ? "Sign and finalize" : "Finalize assessment"}</button></div>
  </div></main>;

  const level = levelById(server.result.level.id);
  return <main className="wrap wrap-wide">
    <div className="dash-top"><div><div className="eyebrow">Official result · {org}</div><h1 className="h1" style={{ fontSize: 32 }}>{aiSystemName}</h1></div><div className="no-print" style={{ display: "flex", gap: 10 }}>{server.badge && <button className="btn btn-primary" onClick={() => window.print()}>Print certification</button>}<Link to="/dashboard" className="btn btn-ghost">Dashboard</Link></div></div>
    <div className="res-hero"><ScoreDial pct={server.result.overallScore} color={LEVEL_COLOR[level.id]} /><div className="lvlpanel" style={{ border: 0 }}><LevelBadge level={level.id} size={62} /><div className="lvlpanel-body"><div className="lvlpanel-name">{level.name}</div><div className="lvlpanel-state">Backend score of record · finalized</div><div className="lvlpanel-blurb">{level.blurb}</div></div></div></div>
    {server.result.cappedReason && <div className="banner banner-cap"><ShieldAlert /><div><strong>Level held at {level.name}.</strong> {server.result.cappedReason}</div></div>}
    {server.badge ? <div className="banner banner-info" style={{ marginTop: 14 }}><Check color={C.ocean} /><div><strong>Public badge issued · {server.badge.tier}</strong><br />Token <code>{server.badge.verificationToken}</code> · <a href={`http://localhost:3001/verify/${server.badge.verificationToken}`} target="_blank" rel="noreferrer">Verify badge</a></div></div> : <div className="banner banner-cap" style={{ marginTop: 14 }}>No public badge was issued for this result.</div>}
    <h3 className="sec-h">Maturity by domain</h3><div className="dbars">{server.result.domainScores.map((domain) => <div key={domain.id}><div className="dbar-top"><span className="dbar-name">{domain.id}</span><span className="dbar-pct">{domain.pct}%</span></div><div className="dbar-track"><div className="dbar-fill" style={{ width: `${domain.pct}%`, background: barColor(domain.pct) }} /></div></div>)}</div>
    <div className="dd-sub" style={{ marginTop: 20 }}><div><h3 className="sec-h">Priority remediation</h3><ul className="gaps">{gaps.slice(0, 8).map((gap) => <li className="gap" key={gap.id}><span className="gap-score">{gap.score}</span><div><div className="gap-title">{gap.title}</div><div className="gap-meta">{gap.domainName}</div></div></li>)}</ul></div><div><h3 className="sec-h">Framework coverage</h3>{frameworks.map((framework) => <div className="dbar-top" key={framework.k}><span>{framework.name}</span><b>{framework.pct}%</b></div>)}</div></div>
  </main>;
}
