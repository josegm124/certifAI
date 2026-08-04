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
  const [demoOpen, setDemoOpen] = useState(false);
  const nav = useNavigate();
  async function start(tier: 1 | 2) {
    if (!aiSystemName.trim() || busy) return;
    if (tier === 2 && !demoOpen) { setDemoOpen(true); return; }
    setBusy(true); setError(null);
    try { const { assessment: created } = await createAssessment(aiSystemName, tier); setAssessment(created, false); nav("/assess"); }
    catch (err) { setError(err instanceof Error ? err.message : "The assessment service is unavailable"); }
    finally { setBusy(false); setDemoOpen(false); }
  }
  if (assessment?.status === "draft") return <main className="wrap"><div className="card" style={{ textAlign: "center", padding: 44 }}>
    <div className="eyebrow">Active assessment</div><h1 className="h2">{assessment.aiSystem.name}</h1>
    <p className="lead" style={{ margin: "0 auto 20px" }}>{assessment.completionPercentage}% saved securely. Finish this assessment before starting another one.</p>
    <Link className="btn btn-primary btn-lg" to="/assess">Resume assessment <Arrow color="#fff" /></Link>
  </div></main>;
  return <main className="wrap wrap-wide">
    <div className="eyebrow">{profile?.company.name} · {TOTAL_DOMAINS} domains · {TOTAL_QUESTIONS} questions</div>
    <h1 className="h1">Assess a real AI system.</h1><p className="lead">Your account details are already saved. Name the system and choose the assessment tier.</p>
    <div className="card" style={{ marginBottom: 18 }}><div className="field"><label className="lbl">AI system name</label><input className="input" value={aiSystemName} onChange={(e) => setName(e.target.value)} placeholder="Example: Customer Support Assistant" /></div>{error && <div className="banner banner-cap">{error}</div>}</div>
    <section className="pricing">
      <Tier name="Readiness Snapshot" tag="Tier 1 · Free" points={["All 36 questions", "Backend score of record", "No public badge"]} action="Start free assessment" onClick={() => start(1)} disabled={!aiSystemName.trim() || busy} />
      <Tier name="Evidence & Badge" tag="Tier 2 · Demo" points={["Evidence references per control", "Signed self-certification", "Evidence references are stored without automated review. AI-assisted review is in development.", "Eligible for a public badge"]} action="Start Tier 2" onClick={() => start(2)} disabled={!aiSystemName.trim() || busy} accent />
    </section>
    {demoOpen && <div style={{ position: "fixed", inset: 0, background: "#0b122099", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}><div className="card" style={{ maxWidth: 480 }}><h2 className="h2">Tier 2 demo access</h2><p className="lead">Tier 2 is available without payment during this demo. No payment will be processed.</p><div style={{ display: "flex", gap: 10 }}><button className="btn btn-ghost" onClick={() => setDemoOpen(false)}>Cancel</button><button className="btn btn-accent" onClick={() => start(2)}>Continue</button></div></div></div>}
  </main>;
}

function Tier({ name, tag, points, action, onClick, disabled, accent }: { name: string; tag: string; points: string[]; action: string; onClick: () => void; disabled: boolean; accent?: boolean }) {
  return <div className={`price ${accent ? "price-accent" : ""}`}><div className="price-tag">{tag}</div><div className="price-name">{name}</div><ul className="plist">{points.map((point) => <li key={point}><Check /> {point}</li>)}</ul><button className={`btn ${accent ? "btn-accent" : "btn-primary"}`} disabled={disabled} onClick={onClick}>{action}</button></div>;
}
