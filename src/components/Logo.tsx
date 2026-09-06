import { WORDMARK } from "@/lib/brand-wordmark";

/** The outlined CoachRank wordmark. The dot is the only accent. */
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <svg aria-hidden="true" className={`brand-wordmark ${className}`} width={size * WORDMARK.width / WORDMARK.height} height={size} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}>
    {WORDMARK.paths.map((path,index) => <path key={index} d={path.d} transform={`translate(${path.x} ${WORDMARK.baseline}) scale(1 -1)`} fill={path.dot ? "var(--accent)" : "currentColor"} />)}
  </svg>;
}
