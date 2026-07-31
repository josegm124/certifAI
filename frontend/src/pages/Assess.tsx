import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DOMAINS, QUESTIONS, MATURITY_LEVELS, FRAMEWORKS, TOTAL_QUESTIONS } from "../lib/data";
import { useStore } from "../store/useStore";
import { completion } from "../lib/scoring";
import { Dot, Arrow } from "../components/icons";

export default function Assess() {
  const { tier, setTier, answers, setAnswer, org, setOrg } = useStore();
  const [idx, setIdx] = useState(0);
  const nav = useNavigate();

  const q = QUESTIONS[idx];
  const a = answers[q.id] || {};
  const dom = DOMAINS.find((d) => d.id === q.domain)!;
  const comp = completion(answers);
  const isLast = idx === QUESTIONS.length - 1;
  const domainQs = QUESTIONS.filter((x) => x.domain === q.domain);
  const domainPos = domainQs.findIndex((x) => x.id === q.id) + 1;

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [idx]);

  return (
    <main className="wrap wrap-wide">
      <div className="dash-top" style={{ marginBottom: 16 }}>
        <div>
          <div className="eyebrow">Assessment</div>
          <input className="input" style={{ maxWidth: 320 }} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organisation name" />
        </div>
        <div className="seg">
          <button className={tier === 1 ? "on" : ""} onClick={() => setTier(1)}>Tier 1 · Free</button>
          <button className={tier === 2 ? "on" : ""} onClick={() => setTier(2)}>Tier 2 · Evidence</button>
        </div>
      </div>

      <div className="assess">
        <aside className="assess-side">
          <div className="side-dom">{dom.name}</div>
          <div className="side-pos">Control {domainPos} of {domainQs.length} in domain · {comp.answered}/{comp.total} total</div>
          <nav className="dnav">
            {DOMAINS.map((d) => {
              const qs = QUESTIONS.filter((x) => x.domain === d.id);
              const hasCurrent = qs.some((x) => x.id === q.id);
              return (
                <div key={d.id} className={`dnav-grp ${hasCurrent ? "dnav-grp-on" : ""}`}>
                  <div className="dnav-name">{d.name}</div>
                  <div className="dnav-dots">
                    {qs.map((x) => {
                      const ans = answers[x.id]?.score != null;
                      const cur = x.id === q.id;
                      return (
                        <button key={x.id} className={`dot-btn ${ans ? "dot-ans" : ""} ${cur ? "dot-cur" : ""} ${x.critical ? "dot-crit" : ""}`}
                          title={`Q${x.id} · ${x.title}`} onClick={() => setIdx(QUESTIONS.findIndex((y) => y.id === x.id))} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <section>
          <div className="q-head">
            <span className="q-num">Q{q.id}<span className="q-of"> / {TOTAL_QUESTIONS}</span></span>
            {q.critical && <span className="q-crit">Critical control</span>}
            <span className="q-frameworks">{q.frameworks.map((f) => FRAMEWORKS[f]).join(" · ")}</span>
          </div>
          <h2 className="q-title">{q.title}</h2>
          <p className="q-text">{q.text}</p>

          <div className="scale">
            {MATURITY_LEVELS.map((m) => {
              const on = a.score === m.score;
              return (
                <button key={m.score} className={`opt ${on ? "opt-on" : ""}`} onClick={() => setAnswer(q.id, { score: m.score })}>
                  <span className="opt-score">{m.score}</span>
                  <span className="opt-body"><span className="opt-label">{m.label}</span><span className="opt-desc">{m.desc}</span></span>
                  <span className="opt-radio">{on ? <Dot /> : null}</span>
                </button>
              );
            })}
          </div>

          {tier === 2 && (
            <div className="ev">
              <span className="ev-title">Evidence</span>
              <span className="ev-sub">Typical artefacts: {q.evidence.join(", ")}</span>
              <label className="ev-attest">
                <input type="checkbox" checked={!!a.attested} onChange={(e) => setAnswer(q.id, { attested: e.target.checked })} />
                <span>We hold documented evidence supporting this score.</span>
              </label>
              <textarea className="ev-note" placeholder="Name the document, owner, or location of the evidence — this is what Claude reviews in the paid tier."
                value={a.detail || ""} onChange={(e) => setAnswer(q.id, { detail: e.target.value })} />
            </div>
          )}

          <div className="nav">
            <button className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Previous</button>
            <div className="nav-right">
              {!isLast && <button className={`btn ${a.score != null ? "btn-primary" : "btn-ghost"}`} onClick={() => setIdx(idx + 1)}>{a.score != null ? "Next" : "Skip"} <Arrow color={a.score != null ? "#fff" : "currentColor"} /></button>}
              {isLast && <button className="btn btn-accent" onClick={() => nav("/results")}>See results <Arrow color="#fff" /></button>}
            </div>
          </div>
          <button className="finish-link" onClick={() => nav("/results")}>Finish & view results now ({comp.answered}/{comp.total} answered)</button>
        </section>
      </div>
    </main>
  );
}
