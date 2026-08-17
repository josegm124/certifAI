import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAssessment } from "../lib/api";
import { useStore } from "../store/useStore";
import { TOTAL_DOMAINS, TOTAL_QUESTIONS } from "../lib/data";
import { Check, Arrow } from "../components/icons";

export default function Start() {
  const { assessment, setAssessment, profile } = useStore();
  const [aiSystemName, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  async function start() {
    if (!aiSystemName.trim() || busy) return;
    setBusy(true); setError(null);
    try { const { assessment: created } = await createAssessment(aiSystemName); setAssessment(created, false); nav("/assess"); }
    catch (err) { setError(err instanceof Error ? err.message : "The assessment service is unavailable"); }
    finally { setBusy(false); }
  }
  if (assessment?.status === "draft") return <main className="wrap"><div className="card" style={{ textAlign: "center", padding: 44 }}>
    <div className="eyebrow">Active assessment</div><h1 className="h2">{assessment.aiSystem.name}</h1>
    <p className="lead" style={{ margin: "0 auto 20px" }}>{assessment.completionPercentage}% saved securely. Finish this assessment before starting another one.</p>
    <Link className="btn btn-primary btn-lg" to="/assess">Resume assessment <Arrow color="#fff" /></Link>
  </div></main>;
  return <main className="wrap wrap-wide">
    <div className="eyebrow">{profile?.company.name} · {TOTAL_DOMAINS} domains · {TOTAL_QUESTIONS} questions</div>
    <h1 className="h1">Assess the AI systems in scope.</h1><p className="lead">Name the AI systems in scope and complete the organisational readiness assessment.</p>
    <div className="card" style={{ marginBottom: 18 }}><div className="field"><label className="lbl">AI systems in scope</label><input className="input" value={aiSystemName} onChange={(e) => setName(e.target.value)} placeholder="Example: Customer Support Assistant" /></div>{error && <div className="banner banner-cap">{error}</div>}</div>
    <section className="pricing">
      <Tier name="Readiness Assessment" tag="Free" points={["All 36 questions", "Backend score of record", "Certificate eligibility after completion", "Remediation guidance for failed controls"]} action="Start assessment" onClick={start} disabled={!aiSystemName.trim() || busy} />
    </section>
  </main>;
}

function Tier({ name, tag, points, action, onClick, disabled, accent }: { name: string; tag: string; points: string[]; action: string; onClick: () => void; disabled: boolean; accent?: boolean }) {
  return <div className={`price ${accent ? "price-accent" : ""}`}><div className="price-tag">{tag}</div><div className="price-name">{name}</div><ul className="plist">{points.map((point) => <li key={point}><Check /> {point}</li>)}</ul><button className={`btn ${accent ? "btn-accent" : "btn-primary"}`} disabled={disabled} onClick={onClick}>{action}</button></div>;
}
