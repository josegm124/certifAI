import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DOMAINS, QUESTIONS, FRAMEWORKS, MATURITY_LEVELS, MAX_SCORE } from "../lib/data";
import { useStore } from "../store/useStore";
import { C, barColor } from "../theme";
import ScoreDial from "../components/ScoreDial";
import { Sparkle, Arrow } from "../components/icons";
import type { Answers } from "../lib/scoring";

function subScore(answers: Answers, domainId: string) {
  const qs = QUESTIONS.filter((q) => q.domain === domainId);
  const answered = qs.filter((q) => answers[q.id]?.score != null);
  const sum = answered.reduce((a, q) => a + (answers[q.id].score as number), 0);
  const pct = answered.length ? Math.round((sum / (answered.length * 5)) * 100) : 0;
  return { qs, answered, pct };
}

export default function DimensionDetail() {
  const { dimId } = useParams();
  const nav = useNavigate();
  const answers = useStore((s) => s.answers);
  const dom = DOMAINS.find((d) => d.id === dimId);

  const data = useMemo(() => (dom ? subScore(answers, dom.id) : null), [answers, dom]);

  if (!dom || !data) {
    return (
      <main className="wrap"><div className="card"><h2 className="h2">Domain not found.</h2><Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link></div></main>
    );
  }

  const scored = data.qs
    .map((q) => ({ q, score: answers[q.id]?.score }))
    .filter((x) => x.score != null) as { q: (typeof QUESTIONS)[number]; score: number }[];
  const strong = scored.filter((x) => x.score >= 4).sort((a, b) => b.score - a.score);
  const weak = scored.filter((x) => x.score <= 2).sort((a, b) => a.score - b.score);
  const frameworksUsed = Array.from(new Set(data.qs.flatMap((q) => q.frameworks)));

  return (
    <main className="wrap wrap-wide">
      <Link to="/dashboard" className="hdr-link" style={{ display: "inline-flex", marginBottom: 12, paddingLeft: 0 }}>← Dashboard</Link>
      <motion.div className="dd-head" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div>
          <div className="eyebrow">Governance domain · weight {Math.round(dom.weight * 100)}%</div>
          <h1 className="h1" style={{ fontSize: 34 }}>{dom.name}</h1>
          <p className="lead" style={{ marginBottom: 0 }}>{dom.blurb}</p>
        </div>
        <ScoreDial pct={data.pct} color={barColor(data.pct)} size={150} />
      </motion.div>

      <div className="fwrow" style={{ marginTop: 16 }}>
        {frameworksUsed.map((f) => <span key={f} className="fwchip">{FRAMEWORKS[f]}</span>)}
      </div>

      <div className="dd-sub">
        <div>
          <h3 className="sec-h">What this domain means</h3>
          <div className="prose">
            <p>
              {dom.name} covers {data.qs.length} questions in the CertifAI model. Maturity here is not about
              owning a single document. It is about demonstrating that the practice is defined, applied consistently,
              measured, and reviewed. Under the maturity scale, an organisation moves from level 1 ({MATURITY_LEVELS[1].label}) through
              level 3 ({MATURITY_LEVELS[3].label}) to level {MAX_SCORE} ({MATURITY_LEVELS[5].label}).
            </p>
            <p>
              For the frameworks this domain touches ({frameworksUsed.map((f) => FRAMEWORKS[f]).join(", ")}),
              evidence typically means documented policy, a named owner, and records that show the control operating
              over time rather than as a one-off. That combination is typically what an auditor, a regulator, or a client
              performing due diligence looks for.
            </p>
          </div>

          <h3 className="sec-h">Your controls</h3>
          {scored.length === 0 && <p className="sec-note">No questions answered in this domain yet. <Link to="/assess">Answer them →</Link></p>}
          {strong.length > 0 && (
            <>
              <div className="cert-tag" style={{ color: C.pine, marginBottom: 6 }}>Strong ({strong.length})</div>
              {strong.map((x) => (
                <div key={x.q.id} className="ctrl">
                  <span className="ctrl-chip" style={{ background: barColor((x.score / 5) * 100) }}>{x.score}</span>
                  <div><div className="ctrl-t">{x.q.title}</div><div className="ctrl-m">{x.q.kpi}</div></div>
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
                  <div><div className="ctrl-t">{x.q.title}</div><div className="ctrl-m">Evidence: {x.q.evidence.slice(0, 2).join(", ")}</div></div>
                </div>
              ))}
            </>
          )}
        </div>

        <div>
          <div className="ai-box">
            <div className="ai-tag"><Sparkle size={14} /> Your improvement plan</div>
            <div className="prose" style={{ fontSize: 14 }}>
              {weak.length > 0 ? (
                <p>Your {dom.name} sub-score is {data.pct}%. The fastest way to lift it is to strengthen the {weak.length} control{weak.length > 1 ? "s" : ""} scoring at or below Emerging. For each, produce the evidence below and move the practice from ad-hoc to consistently applied.</p>
              ) : scored.length > 0 ? (
                <p>Your {dom.name} sub-score is {data.pct}%, a strong position. To reach the top of the maturity scale, focus on measurement and review: show that controls are monitored, reported to leadership, and refined over time.</p>
              ) : (
                <p>Answer this domain's questions to unlock a personalised, data-grounded improvement plan.</p>
              )}
            </div>
            {weak.length > 0 && (
              <ul className="ai-improve">
                {weak.slice(0, 4).map((x) => (
                  <li key={x.q.id}>
                    <Sparkle size={13} color={C.pine} />
                    <span><b>{x.q.title}</b>: assemble {x.q.evidence.slice(0, 2).join(" and ").toLowerCase()}, assign a named owner, then re-score toward Implemented (3+).</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="sec-note" style={{ margin: "12px 0 0", color: C.inkSoft }}>
              After an eligible final result, the certificate dossier stores written references for its nine required controls and optional private files. Automated evidence review is in development.
            </p>
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => nav("/assess")}>
            Improve these controls <Arrow color="#fff" />
          </button>
        </div>
      </div>
    </main>
  );
}
