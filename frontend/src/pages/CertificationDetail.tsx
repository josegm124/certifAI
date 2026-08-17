import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { QUESTIONS, DOMAINS, TOTAL_QUESTIONS, type FrameworkKey } from "../lib/data";
import { CERTIFICATIONS } from "../lib/certifications";
import { useStore } from "../store/useStore";
import { C, barColor } from "../theme";
import ScoreDial from "../components/ScoreDial";
import { Sparkle, Arrow, Check } from "../components/icons";
import type { Answers } from "../lib/scoring";

const typeColor: Record<string, string> = {
  "Binding law": C.red,
  "Certifiable standard": C.pine,
  "Voluntary code": C.ocean,
  "Principles": C.gold,
};

function frameworkScore(answers: Answers, key: FrameworkKey) {
  const qs = QUESTIONS.filter((q) => q.frameworks.includes(key));
  const answered = qs.filter((q) => answers[q.id]?.score != null);
  const sum = answered.reduce((a, q) => a + (answers[q.id].score as number), 0);
  const pct = answered.length ? Math.round((sum / (answered.length * 5)) * 100) : 0;
  return { qs, answered, pct };
}

export default function CertificationDetail() {
  const { certId } = useParams();
  const nav = useNavigate();
  const answers = useStore((s) => s.answers);
  const cert = certId ? CERTIFICATIONS[certId as FrameworkKey] : undefined;

  const data = useMemo(
    () => (cert ? frameworkScore(answers, cert.key) : null),
    [answers, cert]
  );

  if (!cert || !data) {
    return (
      <main className="wrap"><div className="card"><h2 className="h2">Framework not found.</h2><Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link></div></main>
    );
  }

  const scored = data.qs
    .map((q) => ({ q, score: answers[q.id]?.score }))
    .filter((x) => x.score != null) as { q: (typeof QUESTIONS)[number]; score: number }[];
  const strong = scored.filter((x) => x.score >= 4).sort((a, b) => b.score - a.score);
  const weak = scored.filter((x) => x.score <= 2).sort((a, b) => a.score - b.score);

  const touchedDomains = Array.from(new Set(data.qs.map((q) => q.domain)))
    .map((id) => DOMAINS.find((d) => d.id === id)!)
    .filter(Boolean);

  const tcol = typeColor[cert.type] ?? C.pine;

  return (
    <main className="wrap wrap-wide">
      <Link to="/dashboard" className="hdr-link" style={{ display: "inline-flex", marginBottom: 12, paddingLeft: 0 }}>← Dashboard</Link>

      <motion.div className="dd-head" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span className="fwchip" style={{ borderColor: tcol, color: tcol, fontWeight: 700 }}>{cert.type}</span>
            {cert.binding && <span className="fwchip" style={{ borderColor: C.red, color: C.red }}>Legally binding</span>}
          </div>
          <h1 className="h1" style={{ fontSize: 34 }}>{cert.name}</h1>
          <p className="lead" style={{ marginBottom: 0 }}>{cert.tagline}</p>
        </div>
        <ScoreDial pct={data.pct} color={barColor(data.pct)} size={150} />
      </motion.div>

      {/* status / stakes banner */}
      <div className="banner banner-info" style={{ marginTop: 16, flexDirection: "column", gap: 6 }}>
        <div><strong>Status.</strong> {cert.status}</div>
        <div><strong>Stakes.</strong> {cert.stakes}</div>
      </div>

      <div className="dd-sub">
        <div>
          <h3 className="sec-h">What it is</h3>
          <div className="prose">
            {cert.what.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          <h3 className="sec-h">What compliance requires</h3>
          <ul className="ai-improve" style={{ margin: 0 }}>
            {cert.requires.map((r, i) => (
              <li key={i} style={{ borderTop: i === 0 ? "0" : undefined }}><Check color={tcol} /><span>{r}</span></li>
            ))}
          </ul>

          <h3 className="sec-h">What it investigates</h3>
          <div className="prose" style={{ fontSize: 14 }}>
            <p style={{ margin: 0 }}>{cert.investigates.join("; ")}.</p>
          </div>

          <h3 className="sec-h">Your controls mapped to this framework</h3>
          <p className="sec-note">{data.qs.length} of {TOTAL_QUESTIONS} CertifAI questions map to {cert.short}. {data.answered.length} answered.</p>
          {scored.length === 0 && <p className="sec-note">No mapped questions answered yet. <Link to="/assess">Answer them →</Link></p>}
          {strong.length > 0 && (
            <>
              <div className="cert-tag" style={{ color: C.pine, marginBottom: 6 }}>Strong ({strong.length})</div>
              {strong.map((x) => (
                <div key={x.q.id} className="ctrl">
                  <span className="ctrl-chip" style={{ background: barColor((x.score / 5) * 100) }}>{x.score}</span>
                  <div><div className="ctrl-t">{x.q.title}</div><div className="ctrl-m">{DOMAINS.find((d) => d.id === x.q.domain)?.name}</div></div>
                </div>
              ))}
            </>
          )}
          {weak.length > 0 && (
            <>
              <div className="cert-tag" style={{ color: C.red, margin: "14px 0 6px" }}>Needs work ({weak.length})</div>
              {weak.map((x) => (
                <div key={x.q.id} className="ctrl">
                  <span className="ctrl-chip" style={{ background: barColor((x.score / 5) * 100) }}>{x.score}</span>
                  <div>
                    <div className="ctrl-t">{x.q.title}</div>
                    <div className="ctrl-m">Evidence: {x.q.evidence.slice(0, 2).join(", ")}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div>
          <div className="ai-box">
            <div className="ai-tag"><Sparkle size={14} /> Your readiness guidance</div>
            <div className="prose" style={{ fontSize: 14 }}>
              {weak.length > 0 ? (
                <p>Your readiness against {cert.name} sits at {data.pct}%. To close the gap toward its requirements, prioritise the {weak.length} mapped control{weak.length > 1 ? "s" : ""} scoring at or below Emerging. Each maps to an obligation this framework examines.</p>
              ) : scored.length > 0 ? (
                <p>Your readiness against {cert.name} is {data.pct}%, a strong alignment. Focus now on evidencing that these controls are measured and reviewed over time, which is typically what {cert.certifiable ? "an auditor" : "a regulator or client"} looks for.</p>
              ) : (
                <p>Answer the mapped controls to unlock personalised, data-grounded guidance for {cert.name}.</p>
              )}
            </div>
            {weak.length > 0 && (
              <ul className="ai-improve">
                {weak.slice(0, 4).map((x) => (
                  <li key={x.q.id}>
                    <Sparkle size={13} color={C.pine} />
                    <span><b>{x.q.title}</b>: produce {x.q.evidence.slice(0, 2).join(" and ").toLowerCase()}, assign an owner, and re-score toward Implemented (3+).</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="sec-note" style={{ margin: "12px 0 0", color: C.inkSoft }}>
              After an eligible final result, the certificate dossier stores written references for its nine required controls and optional private files. Automated evidence review is in development.
            </p>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="cert-tag" style={{ marginBottom: 8 }}>Governance domains it touches</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {touchedDomains.map((d) => (
                <Link key={d.id} to={`/dimensions/${d.id}`} className="fwchip" style={{ cursor: "pointer" }}>{d.name}</Link>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => nav("/assess")}>
            Improve mapped controls <Arrow color="#fff" />
          </button>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="cert-tag" style={{ marginBottom: 6 }}>How CertifAI relates</div>
            <p className="prose" style={{ fontSize: 13.5, margin: 0 }}>{cert.certifaiNote}</p>
            <a href={cert.source.url} target="_blank" rel="noreferrer" className="hdr-link" style={{ paddingLeft: 0, marginTop: 8, display: "inline-flex", color: C.ocean }}>
              Source: {cert.source.label} →
            </a>
          </div>
        </div>
      </div>

      <p className="disclaimer">
        Educational mapping only. CertifAI produces a self-assessed, evidence-backed readiness signal against these frameworks, not a certification, legal advice, or an official conformity assessment. Framework details reflect public guidance as of mid-2026 and may change; always verify against the primary source.
      </p>
    </main>
  );
}
