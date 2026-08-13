import { C } from "../theme";

export const Check = ({ color = C.pine }: { color?: string }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M3 8.5l3.2 3.2L13 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Dot = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <circle cx="6" cy="6" r="6" fill="#fff" />
  </svg>
);

export const Sparkle = ({ color = C.pine, size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill={color} />
  </svg>
);

export const Arrow = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M3 8h9M8.5 4l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShieldAlert = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2l8 3.2v5.3c0 5-3.3 9-8 10-4.7-1-8-5-8-10V5.2L12 2z" fill={C.red} opacity=".15" stroke={C.red} strokeWidth="1.4" />
    <path d="M12 8v4.5M12 15.5v.5" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
  </svg>
);
