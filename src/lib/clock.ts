import { cache } from "react";

/**
 * One timestamp per server render. Every section of a page - countdowns, relative times,
 * the Today window - then agrees on the same "now", instead of drifting between the
 * moment the leaderboard was read and the moment the spotlight was.
 */
export const requestNowMs = cache((): number => Date.now());
