import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { DOMAINS, QUESTIONS } from "../lib/data";
import { barColor } from "../theme";
import type { Answers } from "../lib/scoring";

const COLS = [1, 2, 3, 4, 5];

interface Row {
  id: string;
  name: string;
  level: number; // rounded rawAvg
  pct: number;
  answered: number;
  weak?: { title: string; score: number };
  improve: string;
}

function buildRows(answers: Answers): Row[] {
  return DOMAINS.map((d) => {
    const qs = QUESTIONS.filter((q) => q.domain === d.id);
    const answered = qs.filter((q) => answers[q.id]?.score != null);
    const sum = answered.reduce((a, q) => a + (answers[q.id].score as number), 0);
    const rawAvg = answered.length ? sum / answered.length : 0;
    const pct = answered.length ? Math.round((sum / (answered.length * 5)) * 100) : 0;
    const weakest = [...answered]
      .sort((a, b) => (answers[a.id].score as number) - (answers[b.id].score as number))[0];
    const weak = weakest
      ? { title: weakest.title, score: answers[weakest.id].score as number }
      : undefined;
    const improve = weak
      ? `Raise "${weak.title}" (now ${weak.score}/5) with documented evidence.`
      : "Answer this domain's controls to see guidance.";
    return { id: d.id, name: d.name, level: Math.round(rawAvg), pct, answered: answered.length, weak, improve };
  });
}

export default function MaturityMatrix({ answers }: { answers: Answers }) {
  const rows = buildRows(answers);
  const [hover, setHover] = useState<string | null>(null);
  const nav = useNavigate();
  const reduce = useReducedMotion();

  return (
    <div className="matrix" role="grid" aria-label="Maturity by domain">
      <div className="mhead" aria-hidden>
        <span />
        <div className="mhead-cells">
          {COLS.map((c) => (
            <span key={c} className="mhead-c">L{c}</span>
          ))}
        </div>
      </div>

      {rows.map((r) => {
        const col = barColor(r.pct);
        return (
          <motion.div
            key={r.id}
            className="mrow"
            role="row"
            initial={false}
            animate={{ scale: hover === r.id && !reduce ? 1.012 : 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
          >
            <button
              className="mrow-label"
              style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit", textAlign: "right" }}
              onClick={() => nav(`/dimensions/${r.id}`)}
              onFocus={() => setHover(r.id)}
              onBlur={() => setHover(null)}
              aria-label={`${r.name}, ${r.answered ? r.pct + " percent" : "not answered"}. Open deep-dive.`}
            >
              {r.name}
            </button>
            <div className="mcells">
              {COLS.map((c) => {
                const on = r.answered > 0 && c <= r.level;
                const isEdge = c === r.level;
                return (
                  <div
                    key={c}
                    className={`mcell ${on ? "" : "mcell-empty"}`}
                    onClick={() => nav(`/dimensions/${r.id}`)}
                    style={{
                      background: on ? col : "var(--mist)",
                      boxShadow:
                        hover === r.id && on && !reduce
                          ? `0 8px 22px ${col}55`
                          : "none",
                      opacity: on ? (isEdge ? 1 : 0.82) : 1,
                    }}
                  >
                    {isEdge && on ? c : ""}
                    {hover === r.id && c === COLS[COLS.length - 1] && (
                      <div className="mtip" role="tooltip">
                        <div className="mtip-t">{r.name}</div>
                        <div className="mtip-s">
                          {r.answered
                            ? `Sub-score ${r.pct}% · maturity level ${r.level}/5 · ${r.answered} controls answered`
                            : "Not yet answered"}
                        </div>
                        {r.weak && (
                          <div className="mtip-imp">Improve: {r.improve}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
