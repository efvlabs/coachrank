# CoachRank brand kit

The complete CoachRank wordmark with its blue dot is the primary identity.

- wordmark.svg / wordmark.png: transparent, dark lettering for light backgrounds.
- wordmark-dark.svg / wordmark-dark.png: transparent, light lettering for dark backgrounds.
- wordmark-white and wordmark-black: single-color artwork.
- avatar-1024.png: complete name, centered for X and other circular profile crops.
- avatar-dark-1024.png and avatar-blue-1024.png: alternate profile backgrounds.
- x-header-1500x500.png: social cover with space on the left for the profile overlap.
- favicon.svg: C. micro wordmark, used only when the full name would be too small.

SVG lettering is outlined. It will not change font on another computer. Do not stretch, add a separate icon, change letter spacing, or remove the dot. Keep space around the wordmark.

Typeface: Bricolage Grotesque, SIL Open Font License. Source and license in assets/fonts. Regenerate using node scripts/generate-brand.mjs.

Create quote artwork at `/admin/social?tab=qotd`. The canvas draws the complete 1080 × 1350 card: CoachRank blue (#2c4bf0), Bricolage Grotesque quote text, optional attribution and the outlined white wordmark. There is no background image dependency. Left, right and bottom margins are 72 px. The role's visible bottom edge aligns with the wordmark; attribution grows upward when it wraps. With no role, the author's name aligns to that same bottom edge. The artwork has no heading or date. An optional planned date organises the library, filenames and X drafts only. Preview and PNG export share the same renderer and wait for the site's fonts. Saved quotes live in the admin-only `socialQuotes` collection. Downloading or creating an X draft does not publish a post.
