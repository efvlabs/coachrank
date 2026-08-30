import { LOGO_BG, LOGO_FG, PODIUM, PODIUM_RADIUS } from "@/lib/brand";

type Props = { size?: number; className?: string };

export { LOGO_BG, LOGO_FG };

/**
 * A podium: three blocks, tallest in the middle.
 *
 * The mark is a fixed brand object - always indigo behind white blocks, in both themes and
 * in every exported asset in public/brand. It deliberately does NOT follow the theme
 * tokens, so the favicon, the header and a social avatar are all the same picture. The
 * geometry lives in lib/brand so nothing here can drift from what is generated.
 */
export function Logo({ size = 28, className = "" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-[8px] ${className}`}
      style={{ width: size, height: size, background: LOGO_BG }}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 32 32" fill="none">
        {PODIUM.map(([x, y, w, h, opacity]) => (
          <rect
            key={x}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={PODIUM_RADIUS}
            fill={LOGO_FG}
            opacity={opacity}
          />
        ))}
      </svg>
    </span>
  );
}
