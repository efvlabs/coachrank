type Props = { size?: number; className?: string };

/**
 * Three ascending bars: a leaderboard, with the tallest one paid for.
 *
 * The mark is a fixed brand object - always indigo behind white bars, in both themes and in
 * every exported asset in public/brand. It deliberately does NOT follow the theme tokens, so
 * the favicon, the header and a social avatar are all the same picture.
 */
export const LOGO_BG = "#2C4BF0";
export const LOGO_FG = "#FFFFFF";

export function Logo({ size = 28, className = "" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-[8px] ${className}`}
      style={{ width: size, height: size, background: LOGO_BG }}
    >
      <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 32 32" fill="none">
        <rect x="5" y="18" width="5" height="9" rx="2.5" fill={LOGO_FG} opacity="0.45" />
        <rect x="13.5" y="12" width="5" height="15" rx="2.5" fill={LOGO_FG} opacity="0.72" />
        <rect x="22" y="5" width="5" height="22" rx="2.5" fill={LOGO_FG} />
      </svg>
    </span>
  );
}
