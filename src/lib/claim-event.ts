export const CLAIM_EVENT = "coachrank:claim";

export type ClaimEventDetail = {
  targetCents: number;
  listingId?: string;
  displayWebsite?: string;
};
