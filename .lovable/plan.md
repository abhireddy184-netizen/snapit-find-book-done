# Live Site Audit — getperfectboy.com (audit only, no code changed)

Canonical live URL reached: **https://getperfectboy.com/** (HTTP 200 directly, no redirect to www).

## Pass/fail by viewport

| Viewport | Overflow | Console errors | Broken images | Verdict |
|---|---|---|---|---|
| 390x844 | none | none | none | Pass (minor issues below) |
| 430x932 | none | none | none | Pass |
| 768x1024 | none | none | none | Pass with note (hero stacks like a phone) |
| 1366x768 | none | none | none | Pass |
| 1440x900 | none | none | none | Pass |

Checklist results: logo/lockup/tagline visible and balanced at all widths; landing copy is light (~2.2k chars of body text, mostly card labels); ZIP + "What do you need?" + Search are in the first viewport on mobile and inline on desktop with no clipping or overlap; "Show GPB" CTA is prominent; four-step strip reads Show It → Understand It → Match a pro → Proof; category icon row is compact and scrollable; walking-pros strip renders and its container is the hit target only in its own empty band (no overlay over cards, no tap blocking); service rows are horizontal carousels on mobile and 5–6 cards per row on desktop; bottom nav is exactly Home | Search | Show GPB | Bookings | Profile with safe-area padding and no content covered by the raised camera button; zero "SnapIt" text anywhere; no star ratings, distances, ETAs or availability claims on the pages checked.

Routes smoke-tested live (all HTTP 200, no console errors): `/`, `/services`, `/services/beauty-at-home`, `/services/plumbing`, `/services/electrical`, `/services/lawn-outdoor`, `/services/plumbing/drain-clearing`, `/snap`, `/search`, `/emergency`. ZIP autocomplete works live: typing `77494` returns "Katy, TX 77494".

## The 5 biggest issues

1. **Lovable "Edit with Lovable" badge sits on top of the mobile bottom nav**, covering the Bookings and Profile labels at 390 and 430 px. Highest-priority fix before packaging (turn the badge off).
2. **AI journey strip truncates on mobile** — the second card reads "Understan…" and the third card is cut at the viewport edge; it does not read as a clean four-step flow on a phone.
3. **ZIP suggestion dropdown is partly clipped by the sticky header** once the page is scrolled slightly; the first suggestion row slides under the translucent header.
4. **Desktop hero left column has a large dead area** below the Show GPB button (~150 px at 1440x900); the composition reads slightly unbalanced against the tall phone visual.
5. **"Popular near you" heading implies proximity before a location is entered.** No fake ratings/ETAs were found, but the wording is a nearby claim with no location basis — rename to "Popular services" until a ZIP is set.

Lower priority: tablet (768) still uses the stacked phone hero rather than a two-column composition; several horizontal rows show an icon-tile fallback instead of a photo for some services (deliberate de-duplication, but it reads as missing imagery).

## What is already strong

Clean brand lockup and dropped-P wordmark at every width, genuinely app-like first viewport, no horizontal overflow anywhere, zero console errors and zero failed requests across all five viewports and all ten routes, working ZIP autocomplete and category/service routing on production, and a real desktop layout (multi-card rows, inline search, horizontal nav) rather than a stretched phone view.

## Readiness for app-store packaging

Yes with one blocker: the site is functionally and visually ready, but the Lovable edit badge overlapping the bottom nav must be removed before any WebView/native wrapper build, and items 2–3 should be fixed since both land in the first two viewports a reviewer sees.

## Proposed fix pass (only if you approve — no code has been changed)

1. Disable the published-site Lovable badge.
2. Make the AI journey strip a 2x2 grid under `sm` (or shrink label text) so no step truncates.
3. Raise the location suggestion dropdown's stacking/offset so it clears the sticky header.
4. Tighten the desktop hero: cap the phone visual height and/or add a compact proof line so the left column is not bottom-heavy.
5. Reword "Popular near you" to "Popular services" until a location is present.
