import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { C } from "../theme";

export interface RadarPoint {
  id: string;
  label: string;
  short: string;
  pct: number;
}

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 122;

function pointAt(i: number, n: number, value: number) {
  const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
  const r = (R * value) / 100;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), angle };
}

export default function RadarChart({
  data,
  benchmark,
  benchmarkLabel,
  accent = C.pine,
  linkBase = "/dimensions",
}: {
  data: RadarPoint[];
  benchmark?: number;
  benchmarkLabel?: string;
  accent?: string;
  linkBase?: string | null;
}) {
  const n = data.length;
  const [hover, setHover] = useState<number | null>(null);
  const nav = useNavigate();
  const reduce = useReducedMotion();

  const rings = [25, 50, 75, 100];
  const dataPoly = data.map((d, i) => pointAt(i, n, d.pct));
  const polyStr = dataPoly.map((p) => `${p.x},${p.y}`).join(" ");
  const benchPoly =
    benchmark != null
      ? data.map((_, i) => pointAt(i, n, benchmark)).map((p) => `${p.x},${p.y}`).join(" ")
      : null;

  return (
    <div className="radar-wrap">
      <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: 400 }} role="img" aria-label="Governance maturity radar">
        {/* rings */}
        {rings.map((rv) => {
          const pts = data.map((_, i) => pointAt(i, n, rv)).map((p) => `${p.x},${p.y}`).join(" ");
          return <polygon key={rv} points={pts} fill="none" stroke={C.line} strokeWidth="1" />;
        })}
        {/* axes */}
        {data.map((d, i) => {
          const outer = pointAt(i, n, 100);
          const on = hover === i;
          return <line key={d.id} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke={on ? accent : C.line} strokeWidth={on ? 1.6 : 1} />;
        })}

        {/* benchmark polygon */}
        {benchPoly && (
          <polygon points={benchPoly} fill="none" stroke={C.gold} strokeWidth="1.5" strokeDasharray="4 4" opacity=".8" />
        )}

        {/* data polygon (animated draw-in from center) */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <polygon points={polyStr} fill={accent} fillOpacity={hover != null ? 0.1 : 0.16} stroke={accent} strokeWidth="2" />
          {dataPoly.map((p, i) => {
            const on = hover === i;
            return (
              <circle
                key={data[i].id}
                cx={p.x}
                cy={p.y}
                r={on ? 6.5 : 4.5}
                fill={on ? accent : "#fff"}
                stroke={accent}
                strokeWidth="2.2"
                style={{ cursor: linkBase ? "pointer" : "default", transition: "r .15s" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => linkBase && nav(`${linkBase}/${data[i].id}`)}
              />
            );
          })}
        </motion.g>

        {/* axis labels */}
        {data.map((d, i) => {
          const lp = pointAt(i, n, 118);
          const on = hover === i;
          const anchor = Math.abs(lp.x - CX) < 12 ? "middle" : lp.x > CX ? "start" : "end";
          return (
            <text
              key={d.id}
              x={lp.x}
              y={lp.y}
              dy="0.32em"
              textAnchor={anchor as "start" | "middle" | "end"}
              className="radar-axis-label"
              fill={on ? accent : C.mute}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => linkBase && nav(`${linkBase}/${d.id}`)}
            >
              {on ? `${d.short} · ${d.pct}%` : d.short}
            </text>
          );
        })}
      </svg>

      <div className="radar-legend">
        <div className="rl-item"><span className="rl-dot" style={{ background: accent }} /> Your maturity</div>
        {benchmark != null && (
          <div className="rl-item"><span className="rl-dot" style={{ background: C.gold }} /> {benchmarkLabel ?? "Target"}</div>
        )}
      </div>
      <div className="radar-hint">Hover an axis for its sub-score · click to open the deep-dive</div>
    </div>
  );
}
