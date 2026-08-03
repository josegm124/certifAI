import { C } from "../theme";

export default function ScoreDial({ pct, max = 100, color = C.pine, size = 170 }: { pct: number; max?: number; color?: string; size?: number }) {
  const r = 64;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - pct / max);
  return (
    <div className="dial">
      <svg width={size} height={size} viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={r} fill="none" stroke={C.line} strokeWidth="11" />
        <circle
          cx="85" cy="85" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 85 85)"
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }}
        />
        <text x="85" y="80" textAnchor="middle" className="dial-num">{pct}</text>
        <text x="85" y="103" textAnchor="middle" className="dial-pct">/ {max}</text>
      </svg>
      <div className="dial-label">Overall readiness</div>
    </div>
  );
}
