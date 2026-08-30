import { SITE } from "./config";

/**
 * The share card, in one place.
 *
 * The homepage and the enrolment page carry the same picture on purpose: a stranger who
 * finds us and a coach we invited should meet the same brand, and two cards that say
 * almost the same thing drift apart the moment one of them is edited.
 */
export function brandCard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        padding: 78,
        background: "#12141a",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, color: "#9aa0b0", letterSpacing: 3 }}>
        {SITE.name.toUpperCase()}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: -4,
          marginTop: 30,
        }}
      >
        Coaches who
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: -4,
          color: "#a8baff",
        }}
      >
        back themselves.
      </div>
    </div>
  );
}

export const OG_SIZE = { width: 1200, height: 630 };
