import { iconUrl } from "@/lib/favicon";
import { prettyWebsite } from "@/lib/url";

type Props = {
  name: string;
  displayWebsite: string;
  size?: number;
  className?: string;
};

/**
 * Server-rendered. /api/icon always returns an image - the site's real favicon, or a
 * generated initials mark - so there is no client-side fallback and no layout shift.
 */
export function CoachAvatar({ name, displayWebsite, size = 20, className = "" }: Props) {
  const host = prettyWebsite(displayWebsite).split("/")[0];
  return (
    /* /api/icon serves an exactly-sized, week-cached image; next/image would only add a hop. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl(host, name, Math.min(128, size * 2))}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`shrink-0 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
