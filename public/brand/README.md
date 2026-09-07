# CoachRank brand kit

The complete CoachRank wordmark with its blue dot is the primary identity.

- wordmark.svg / wordmark.png: transparent, dark lettering for light backgrounds.
- wordmark-dark.svg / wordmark-dark.png: transparent, light lettering for dark backgrounds.
- wordmark-white and wordmark-black: single-color artwork.
- avatar-1024.png: complete name, centered for X and other circular profile crops.
- avatar-dark-1024.png and avatar-blue-1024.png: alternate profile backgrounds.
- x-header-1500x500.png: social cover with space on the left for the profile overlap.
- favicon.svg: C. micro wordmark, used only when the full name would be too small.
- cr_qotd_template.png: the original 1080 × 1350 blue Quote of the Day template supplied by Arjun. Studio's Social desk uses this artwork unchanged as the background for downloadable quote cards.

SVG lettering is outlined. It will not change font on another computer. Do not stretch, add a separate icon, change letter spacing, or remove the dot. Keep space around the wordmark.

Typeface: Bricolage Grotesque, SIL Open Font License. Source and license in assets/fonts. Regenerate using node scripts/generate-brand.mjs.

Create quote artwork at `/admin/social?tab=qotd`. The QOTD editor adds Bricolage Grotesque quote text and optional attribution. The artwork has no heading or date. An optional planned date organises the library, filenames and X drafts only. Preview and PNG export share the same canvas renderer and wait for the site's fonts. Saved quotes live in the admin-only `socialQuotes` collection. Downloading or creating an X draft does not publish a post.
