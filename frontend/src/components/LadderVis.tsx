import { motion } from "framer-motion";
import { LEVELS } from "../lib/scoring";
import LevelBadge, { LEVEL_COLOR } from "./Badges";

export default function LadderVis({ activeId }: { activeId?: string }) {
  return (
    <div className="ladder">
      {LEVELS.map((l, i) => (
        <motion.div
          key={l.id}
          className="rung"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={activeId === l.id ? { borderColor: LEVEL_COLOR[l.id], boxShadow: `0 10px 30px ${LEVEL_COLOR[l.id]}22` } : undefined}
        >
          <div className="rung-badge"><LevelBadge level={l.id} size={48} /></div>
          <div className="rung-body">
            <div className="rung-name">
              {l.name}
              <span className="rung-code" style={{ background: LEVEL_COLOR[l.id] }}>{l.id}</span>
              {!l.badge && <span style={{ fontSize: 11, color: "var(--mute)", fontWeight: 500 }}>internal signal</span>}
            </div>
            <div className="rung-blurb">{l.blurb}</div>
          </div>
          <div className="rung-band">{l.min}–{l.max}</div>
        </motion.div>
      ))}
    </div>
  );
}
