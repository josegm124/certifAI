import { Link } from "react-router-dom";

export default function Upgrade() {
  return <main className="wrap"><div className="card" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", padding: 44 }}>
    <div className="eyebrow">Tier 2 · Demo</div><h1 className="h2">The evidence-based certificate is available without payment during the demo.</h1>
    <p className="lead" style={{ margin: "0 auto 20px" }}>No payment will be processed during this demo. An assessment keeps the tier selected when it was created. After you finalize the current assessment, start a new Tier 2 assessment from the dashboard.</p>
    <Link className="btn btn-primary" to="/dashboard">Return to dashboard</Link>
  </div></main>;
}
