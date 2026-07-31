import { C } from "../theme";
import type { LevelId } from "../lib/scoring";

export const LEVEL_COLOR: Record<LevelId, string> = {
  A1: C.mute,
  A2: C.ocean,
  A3: C.pine,
  A4: C.pineDk,
};

/**
 * The 4A badge glyph set. Each level has a distinct treatment; Advanced (A4)
 * reads as the most premium with a pine->ocean gradient and a gold accent.
 */
export default function LevelBadge({ level, size = 52 }: { level: LevelId; size?: number }) {
  const id = `grad-${level}`;
  const w = size;
  const h = size * 1.08;
  return (
    <svg width={w} height={h} viewBox="0 0 48 52" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.pine} />
          <stop offset="1" stopColor={C.ocean} />
        </linearGradient>
      </defs>

      {/* shield body */}
      {level === "A1" && (
        <>
          <path d="M24 2l19 6.4v11.5c0 12.6-8 22.6-19 25.6C13 42.5 5 32.5 5 19.9V8.4L24 2z" fill={C.mist} stroke={C.mute} strokeWidth="1.6" />
          <path d="M17 24l5 5 10-11" stroke={C.mute} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}

      {level === "A2" && (
        <>
          <path d="M24 2l19 6.4v11.5c0 12.6-8 22.6-19 25.6C13 42.5 5 32.5 5 19.9V8.4L24 2z" fill={C.ocean} />
          <path d="M24 5.6l15.4 5.2v9.1c0 10.4-6.5 18.6-15.4 21.2V5.6z" fill="#fff" opacity=".14" />
          <path d="M16 22h16M16 28h11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}

      {level === "A3" && (
        <>
          <path d="M24 2l19 6.4v11.5c0 12.6-8 22.6-19 25.6C13 42.5 5 32.5 5 19.9V8.4L24 2z" fill={C.pine} />
          <path d="M24 5.6l15.4 5.2v9.1c0 10.4-6.5 18.6-15.4 21.2V5.6z" fill="#fff" opacity=".16" />
          <path d="M16 24l5.2 5.2L34 16" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}

      {level === "A4" && (
        <>
          <path d="M24 2l19 6.4v11.5c0 12.6-8 22.6-19 25.6C13 42.5 5 32.5 5 19.9V8.4L24 2z" fill={`url(#${id})`} />
          <path d="M24 5.6l15.4 5.2v9.1c0 10.4-6.5 18.6-15.4 21.2V5.6z" fill="#fff" opacity=".14" />
          <path d="M15 23.5l5.4 5.4L33 15.5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M24 30.5l1.4 3 3.3.4-2.4 2.3.6 3.3-2.9-1.6-2.9 1.6.6-3.3-2.4-2.3 3.3-.4 1.4-3z" fill={C.gold} />
        </>
      )}
    </svg>
  );
}
