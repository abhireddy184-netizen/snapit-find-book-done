# GetPros.ai — Premium Design Audit (no code changed)

Audit of the current frontend only. Backend, auth, routes, data and business logic are out of scope and stay untouched.

## Verdict

The palette is right — keep navy + teal, do not re-hue. What holds the site back from feeling premium is not colour but **inconsistency and density**: too many radii, too many one-off shadows, a type scale that lives almost entirely at 12–14px, gradients used as decoration in 15+ files, and section rhythm set per-section instead of by one system. Apple-like polish here comes from subtraction and standardisation, not new visual ideas.

## What the audit found (measured in the current source)

Type scale
- 307 `text-sm` + 230 `text-xs` + 68 `text-[11px]` + 45 `text-[10px]` vs only 12 `text-4xl` / 4 `text-5xl`. The UI is flat and small; there is very little size contrast between a section heading and its supporting text.
- Arbitrary sizes leak in (`text-[15px]`, `text-[17px]`, `text-[9px]`, `text-[0.8rem]`) — no single scale.
- Body `line-height: 1.65` with `letter-spacing: normal`, headings `-0.02em / 1.25`. Sensible and script-safe; large display headings still need tighter tracking than mid-size ones, which the single rule cannot express.
- One brand font (`Plus Jakarta Sans`) is loaded for the wordmark only; everything else is system sans. That is a defensible, fast choice, but it means the product has no typographic signature.

Radii
- 6 competing families in use: `rounded-full` (216), `2xl` (118), `xl` (62), `3xl` (48), `md` (42), `sm` (19), plus hardcoded `[22px] [24px] [26px] [28px] [13px]`. Cards, chips and inputs do not agree.

Shadows
- 103 `shadow-sm`, 43 `shadow-md`, 37 `shadow-lg`, 7 `shadow-xl` — the Tailwind defaults dominate while the tuned tokens (`--shadow-card`, `--shadow-elevated`) are used 6 times total. Result: grey generic shadows instead of the navy-tinted ones the design system defines.

Gradients
- `var(--gradient-*)` appears in 15 files (7 uses in `/snap` alone), plus mesh/aurora/orb backgrounds on the hero. Premium products use one gradient as a signature; here it is the default fill for buttons, avatars, bands and blobs.

Nav / header (`AppShell.tsx`)
- Seven items in the desktop bar (Show GetPros, Emergency, How it works, Services, For Pros, Early Access) plus theme toggle, Log in, Sign up — two of them coloured CTAs and Emergency now red. Three competing emphases in one row.
- Header height 56/64px with a two-line logo lockup (wordmark + tagline) — tight, and the tagline is decoration at that size.
- Mobile bottom nav has 5 items including a raised camera FAB that duplicates the hero CTA and the header CTA.

Hero (`index.tsx`)
- Headline `clamp(2rem, 5.6vw, 4.2rem)` at `font-black` — very heavy; a 700–800 weight at the same size reads more refined.
- Body copy `clamp(0.9rem, 1.2vw, 1.15rem)` bottoms out at 14.4px on phones — below the 17px standard the project already defined in `reply-text`.
- Two blurred gradient orbs + a border + a tinted card background all competing behind the fold-defining content.
- On mobile the order is headline → paragraph → big CTA → composer → two text links: three distinct "start here" affordances stacked.

Spacing
- `gpb-section` (`clamp(2.25rem, 5vw, 4.5rem)`) exists but sections also set their own `py-9 sm:py-12 lg:py-16 xl:py-20`. Vertical rhythm is decided twice, so bands do not breathe equally.

Footer
- Four columns with a newsletter form, social icons, and a legal row — reasonable, but Support links (`Help center`, `Contact`, `Trust & safety`, `Cancellation`) are rendered as plain `<li>` strings with no `href`. They look like links and do nothing. Social icons are `href="#"`.
- Footer type sits at `text-xs` / `text-[11px]` — the smallest text on the page carries legal and trust content.

Cross-page consistency
- Auth, search, services, dashboards and provider pages each assemble their own card treatment (border + shadow + radius chosen locally) rather than sharing a card primitive.

## Recommended changes — HIGH IMPACT

1. **Lock one type scale and apply it everywhere.** Define display / h1 / h2 / h3 / body-lg / body / caption tokens in `styles.css`; raise default body from 14px to 16–17px and captions from 10–11px to 12–13px; delete arbitrary `text-[15px]`-style values. Add size-aware tracking (display `-0.03em`, h2/h3 `-0.02em`, body `normal`) so Indic/Arabic body text stays untouched.
2. **Collapse radii to three steps** — `sm` (chips/inputs, ~10px), `md` (cards, ~16–18px), `full` (pills/avatars only). Replace all hardcoded pixel radii.
3. **Retire raw Tailwind shadows** in favour of two tokens: `shadow-card` (resting) and `shadow-elevated` (hover/overlay). Navy-tinted, low-opacity, larger blur. Nothing gets a shadow *and* a strong border.
4. **Ration gradients.** Keep the gradient for exactly two things: the primary CTA and the wordmark/hero accent word. Everything else — avatars, chips, bands, small buttons, dashboard accents — becomes solid navy or teal. Remove the two hero orbs and the mesh overlay behind the hero.
5. **Simplify the header.** Move How it works / For Pros / Early Access into the footer or a single overflow, keep Show GetPros + Services + Emergency + auth. One filled CTA (Sign up) only; Show GetPros becomes a quiet text item since the hero and bottom nav already carry it. Drop the tagline from the header lockup at all sizes (keep it in the footer).
6. **Single hero action on mobile.** Headline → one-line subhead at 17px → composer (which already contains photo/voice/text) → one secondary text link. Remove the duplicate full-width photo button above the composer.
7. **One spacing rhythm.** Every band uses `gpb-section` and one internal padding scale; remove per-section `py-*` overrides. Target roughly 64px mobile / 96–120px desktop between bands.
8. **Fix the footer's dead affordances** — give Support entries real destinations or render them as plain text, and either wire the social icons or remove them. Lift footer body to 13–14px.
9. **Shared card primitive** used by auth, services, search results, dashboards and provider pages: same radius, same border, same resting shadow, same internal padding. This is what makes the pages feel like one product.

## Recommended changes — OPTIONAL POLISH

10. Standardise icon sizing to 16 / 20 / 24 only, and pair each size with a fixed container (28 / 36 / 44).
11. Replace decorative divider gradients (`hairline-connector`) with 1px hairlines at ~8% foreground.
12. Refine motion: one easing curve (`cubic-bezier(0.22, 1, 0.36, 1)`), durations 180–260ms for UI, hover lift capped at 2px and scale at 1.01. Retire `pulse-soft` and `ping-ring` on anything that is not genuinely live.
13. Give the product a typographic signature by loading one display weight for headings only (the brand font is already fetched) while body stays system sans for speed and script coverage.
14. Focus states: one visible `ring-2 ring-ring/40 ring-offset-2` token everywhere, replacing per-component focus styling.
15. Dark mode pass after the above, checking card-on-background separation now that shadows carry less weight.

## Palette verdict

Refine, do not change. Navy `oklch(0.395 0.125 264)` + teal `oklch(0.585 0.118 199)` on a cool near-white is already premium and distinct. Two refinements only: (a) reserve teal for accents/success states so navy stays the single primary, and (b) prune the legacy decorative tokens still defined in `:root` (`--coral`, `--lemon`, `--lavender`, `--mauve`, `--plum`, `--sky`) so nothing reintroduces the old palette. Semantic colours stay as-is: red errors, amber warnings, green/teal success.

## Overdesign risks to avoid

- Do not add glassmorphism beyond the sticky header; blurred panels on cards read as dated, not premium.
- Do not animate on scroll across every section — reveal motion on more than one or two bands feels cheap and hurts mobile performance.
- Do not push all text to light weights or ultra-wide letter spacing; it damages Telugu/Devanagari/Tamil/Arabic rendering the project deliberately supports.
- Do not lower contrast in pursuit of "minimal" — muted-on-white must stay at or above 4.5:1.
- Do not remove the mobile bottom nav or the composer's voice affordances; these are working product surfaces, not decoration.
- Do not restructure page content or copy. Every item above is a token/spacing/weight change, not a layout rewrite.

## Suggested sequencing if you approve implementation

Tokens first (type scale, radii, shadows, focus, spacing), then header/hero, then the shared card primitive rolled across login → services → search → dashboards → provider pages, then gradient rationing and motion, then a 390 / 768 / 1440 responsive pass in light and dark.
