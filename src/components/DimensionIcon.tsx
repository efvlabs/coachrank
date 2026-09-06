import type { BrandDimensionId } from "@/lib/brand-assessment";
const paths: Record<BrandDimensionId, React.ReactNode> = {
  audience: <><circle cx="24" cy="17" r="6"/><path d="M12 37v-4a12 12 0 0 1 24 0v4M9 12a6 6 0 0 0 0 12M39 12a6 6 0 0 1 0 12"/></>,
  offer: <><path d="m8 16 16-8 16 8v19l-16 8-16-8V16Zm0 0 16 8 16-8M24 24v19M16 12l16 8"/></>,
  difference: <><path d="M8 36 20 12l8 24H8ZM30 12h10v10M40 12 27 25"/><circle cx="36" cy="35" r="5"/></>,
  proof: <><path d="M24 6 40 12v12c0 9-10 16-16 19C18 40 8 33 8 24V12L24 6Z"/><path d="m16 24 6 6 11-12"/></>,
  message: <><path d="M8 10h32v23H23l-9 8v-8H8V10Z"/><path d="M16 18h16M16 25h11"/></>,
  visibility: <><path d="M5 24s7-13 19-13 19 13 19 13-7 13-19 13S5 24 5 24Z"/><circle cx="24" cy="24" r="6"/></>,
};
export function DimensionIcon({dimension}:{dimension:BrandDimensionId}) { return <span className="dimension-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[dimension]}</svg></span>; }
