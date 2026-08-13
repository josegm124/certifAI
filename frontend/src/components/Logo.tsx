import { C } from "../theme";

export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 2L28 7v8c0 7.5-5 13.5-12 15C9 28.5 4 22.5 4 15V7l12-5z" fill={C.pine} />
      <path d="M16 5.2L24.7 9v6c0 5.7-3.6 10.4-8.7 11.6V5.2z" fill={C.pineDk} opacity="0.55" />
      <path d="M11 16.2l3.4 3.4L21 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
