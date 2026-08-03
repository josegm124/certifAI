import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAssessments, getResult, type AssessmentRecord } from "../lib/api";
import { useStore } from "../store/useStore";

export default function Dashboard() {
  const { profile, assessment, setAssessment, setServer } = useStore();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  useEffect(() => { getAssessments().then(({ assessments }) => setHistory(assessments)).catch((err) => setError(err instanceof Error ? err.message : "Could not load dashboard")); }, [assessment?.status]);
  async function open(item: AssessmentRecord) {
    setAssessment(item, false);
    if (item.status === "finalized") { const result = await getResult(item.id); setServer(result); nav("/results"); }
    else nav("/assess");
  }
  return <main className="wrap wrap-wide"><div className="dash-top"><div><div className="eyebrow">Dashboard · {profile?.company.name}</div><h1 className="h1" style={{ fontSize: 32 }}>AI governance assessments</h1></div><Link className="btn btn-primary" to="/start">{assessment?.status === "draft" ? "Resume assessment" : "New assessment"}</Link></div>
    {error && <div className="banner banner-cap">{error}</div>}
    {history.length === 0 ? <div className="card" style={{ textAlign: "center", padding: 44 }}><h2 className="h2">Your dashboard is waiting.</h2><p className="lead">Create an assessment for a real AI system.</p><Link className="btn btn-primary" to="/start">Start assessment</Link></div> : <div className="card"><div className="card-h"><span className="card-t">Assessments</span><span className="card-sub">data loaded from the backend</span></div><div style={{ display: "grid", gap: 12 }}>{history.map((item) => <button key={item.id} className="cert" style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => open(item)}><div><div className="cert-tag">Tier {item.tier} · {item.status}</div><div className="cert-name">{item.aiSystem.name}</div></div><div className="cert-lvl"><span>{item.completionPercentage}%</span>{item.status === "finalized" && <strong>{item.overallScore}/100 · {item.badgeTier}</strong>}</div></button>)}</div></div>}
  </main>;
}
