# PDF Export: Official Digital Booklet Track

## Status

- In progress as of 2026-04-14.
- The client-side PDF export flow still renders through `components/DownloadPdfButton.tsx` and `utils/questionTemplate.ts`.
- The current goal is not a generic printable worksheet. The export must visually match the official SAT digital practice booklet structure as closely as possible.

## Key implementation decisions

- Keep PDF generation client-side through the hidden print iframe flow. Do not restore the deprecated server-side PDF export route.
- The canonical template file is `utils/questionTemplate.ts`.
- Cover-page QR generation now also stays client-side: `components/DownloadPdfButton.tsx` builds the QR SVG and passes it into the template rather than fetching a third-party QR image service at print time.
- Top module banners should use the provided official-style SVG assets from the repo, not local-machine file paths and not long inline base64 strings.
- Deployment-safe assets now live under `public/pdf-assets/`.
- Body typography should use Minion Pro from bundled font files under `public/pdf-assets/fonts/` via `@font-face` in the generated template.
- Math rendering uses KaTeX HTML output with the KaTeX stylesheet linked in the generated HTML; duplicate MathML output was removed.

## Bundled assets

### Banners

- `public/pdf-assets/banners/banner-1-1.svg`
- `public/pdf-assets/banners/banner-1-2.svg`
- `public/pdf-assets/banners/banner-2-1.svg`
- `public/pdf-assets/banners/banner-2-2.svg`

### Fonts

- `public/pdf-assets/fonts/MinionPro-Regular.otf`
- `public/pdf-assets/fonts/MinionPro-It.otf`
- `public/pdf-assets/fonts/MinionPro-Bold.otf`
- `public/pdf-assets/fonts/MinionPro-BoldIt.otf`

## Current template structure

- Official-style cover page
- Cover-page QR callout that links into `/test/[id]/entry` and overlays the Ronan logo in the middle of the QR code
- Prelude page with `Test begins on the next page.`
- Reading and Writing module intro pages
- Math module intro/reference pages
- Math response-instructions pages
- Two-column question pages
- Stop banner on the last page of each module
- No-material spacer pages where needed
- Final directions page

## Important debugging history

- The top-banner issue was not just stale caching.
- Earlier attempts failed because old CSS for `.top-band` still constrained the strip with side margins and conflicting rendering rules.
- Another failed direction was using inline base64 SVG banners. That made the template harder to maintain and was intentionally abandoned.
- The repository direction is now to reference the real SVG files from `public/pdf-assets/banners`.
- A math display-centering bug looked like a `questionText` parsing problem at first, but the actual SAT-style leading equation for some math items is stored in the `passage` field. The verified Mongo example was question `_id=69d7618fd8c210ff2a8dea1a`, where `passage` contained `$h(x) = \frac{1}{2}(x)(89)$` and `questionText` only contained the prose prompt.
- The durable fix is in `parseText()` plus the `buildQuestionCard()` call sites in `utils/questionTemplate.ts`: enable standalone-math promotion for both `questionText` and `passage`, but not for answer choices.
- When this regresses, inspect generated HTML first. The correct output pattern is `<div class="passage-body"><div class="display-math-block">...` or the equivalent inside `.question-text`, not a bare left-flowing `<p><span class="katex">...`.
- The final centering fix was layout-level as well as parser-level: `.display-math-block` must span the full content width and center its KaTeX child; only wrapping the math without width/justification was not sufficient in the printable iframe.
- Consecutive full-line equations should render as a visual group. The template now wraps adjacent `.display-math-block` runs in `.display-math-group` so the prompt gets normal outer spacing before the first equation and after the last one, with only a small gap between equations inside the group.
- Inline math with tall structures should opt into extra leading. The template now detects fractions and exponents from the raw source (`\frac` and `^`) and adds taller line-height classes to the affected prompt/passage block.
- Answer-choice tall math should be handled per choice, not per list. Applying tall-math spacing to the full answer list makes plain options drift and creates label misalignment.
- CSS spacing alone was not enough for cramped fractions. The PDF renderer now also prepends `\displaystyle` to tall inline math before KaTeX renders it, which avoids the smaller `mtight` inline-fraction form and materially improves legibility in prompts and answer choices.
- The durable label-alignment fix for math answer choices is layout-level: use baseline alignment on each answer row so `A)`, `B)`, etc. track the first visible text/math baseline instead of the top of the tallest KaTeX box. Manual per-label vertical nudges were tested and abandoned because fractional exponents still produced worse drift in print.
- Pure-math choices can also be shifted by inherited paragraph spacing. In the PDF template, paragraphs inside `.question-card-body` should reset top margin (`margin: 0 0 ...`) so math-only options do not start lower than their label.
- If the banner width looks wrong again, inspect both:
  - `buildTopBand()` markup in `utils/questionTemplate.ts`
  - the active `.top-band` and `.top-band-image` CSS in the generated template
- The specific issue to keep watching is whether the banner is being letterboxed, cropped vertically, or constrained by margins instead of actually spanning the intended content width.

## Constraints to preserve

- Do not depend on `/Users/...` local paths for fonts or banner assets.
- Do not reintroduce a temporary asset API route for local filesystem reads.
- Keep the export deployable with everything needed living inside the repo.
- Keep QR generation self-contained in the app bundle. Do not make PDF generation depend on a remote QR image API.

## Next likely work

- Verbal module intro pages now embed the first question spread directly under the directions block instead of forcing a blank standalone intro page. If that layout regresses, inspect `buildVerbalIntroPage()`, `buildQuestionColumns()`, and the `.verbal-intro-question-block` CSS in `utils/questionTemplate.ts`.
- Intro-page helper copy for Reading and Writing directions, Math directions/notes/reference text, and Math response-instructions copy was reduced slightly to better match booklet density and preserve vertical room on module helper pages.
- Finalize the exact top-banner sizing and scaling so it aligns margin-to-margin like the official booklet without vertical truncation.
- Continue tuning Minion Pro sizing/leading and KaTeX sizing so math questions match official SAT typesetting more closely.
- Keep question bars, question density, and column spacing aligned with the official digital booklet reference.
