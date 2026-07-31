/* Canonical CertifAI palette (extends the MVP `C` tokens) */
export const C = {
  ink: "#0F2230",
  inkSoft: "#33485A",
  mute: "#6B7C8A",
  line: "#DCE4E8",
  paper: "#FBFCFC",
  panel: "#FFFFFF",
  mist: "#EEF3F3",

  pine: "#0E6B53",
  pineDk: "#0A5240",
  pineSoft: "#E4F1EC",

  ocean: "#10566E",
  oceanDk: "#0D4459",
  oceanSoft: "#E2EEF2",

  gold: "#B8893B",
  goldSoft: "#F6EBD6",

  red: "#A8392E",
  redSoft: "#F6E7E4",
} as const;

export type Palette = typeof C;

/** Score->color mapping shared with the MVP bar logic. */
export function barColor(pct: number): string {
  return pct >= 71 ? C.pine : pct >= 41 ? C.ocean : pct > 0 ? C.gold : C.line;
}
