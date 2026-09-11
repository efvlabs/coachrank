# CoachRank article publishing

## One title, everywhere

The article's `title` is the source for the visible H1, browser/search title, Open Graph title, X title, generated share image and BlogPosting headline. Article metadata uses an absolute title so the root site's title template cannot add different wording. The legacy `seoTitle` storage field is kept equal to `title` for compatibility. Do not reintroduce an editable search-title override.

Write a specific title that names the subject and the useful outcome. A natural title that serves readers is more valuable than repeating keywords. Keep the promise faithful to the article. Around 30 to 65 characters is an editing guide, not a Google rule. Google truncates by available space and may generate a different title.

## Before publishing

- Write a unique, complete search description. A blank field uses the standfirst. Around 120 to 170 characters is a useful preview guide. The editor allows up to 200 without silently cutting sentences.
- Keep a visible introduction, clear section headings and a direct answer to the central question.
- Support factual claims with relevant original sources and check the actual source, not just its title.
- Use an identifiable author and profile or About link. Describe cover images accurately.
- Add reader questions when they provide useful answers. FAQ markup does not promise rich results or AI citations.
- Use the library's editing prompts, duplicate checks and indexing filter. These are not a ranking score or factual verification.
- Follow CoachRank's house style. Never use em dashes, including encoded variants.

Publishing generates a canonical URL, article and breadcrumb structured data, and a sitemap entry unless excluded from search. Drafts stay private. Published URLs remain fixed. Article edits preserve the original publication date and update the modification date. Search, social and reader titles share the same server-loaded article within a render.

## After an update

Check the live page, page title, canonical URL and share preview. Submit `https://coachrank.lol/sitemap.xml` in the domain's Google Search Console property if it is not already submitted. Use URL Inspection and Request indexing for a few important updated articles, especially the page that prompted this change. A sitemap helps discovery; it does not guarantee indexing or a deadline. Repeated requests do not make crawling faster. Existing X posts and Google results may keep cached titles or images until their systems refresh them.

## Reviewed migration

`scripts/align-article-seo.mjs --account <authorized-account>` audits only CoachRank's named production database and writes local backups and a proposed plan under ignored `tmp/seo-audit/`. Add `--apply` to update the reviewed fields atomically with document revision checks. URLs, publication dates, status and unrelated content are preserved. The source collections and legacy article metadata are updated together so imports cannot restore conflicting titles.

## References

- [Google: title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google: search snippets and descriptions](https://developers.google.com/search/docs/appearance/snippet)
- [Google: article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: requesting a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
