# Figma deliverable for the current GetPros.ai site (no redesign, no site changes)

## Straight answer
- I cannot create a native editable .fig file or a Figma project link. I have no access to your Figma account, and the only Figma connection Lovable offers is read-only through the Lovable Desktop app.
- No Figma file has been generated.
- What I can make: exact captures of the real pages, plus a design-system kit and an import-ready package. You then bring that into Figma in a few clicks.

## What I inspected
- 37 real pages: public pages (home, services, categories, service detail, search, pricing, how it works, FAQ, contact, emergency, trust & safety, legal/terms/privacy, Pro profile, booking, tracking, photo "Show GP"), sign-in/sign-up/reset, the customer dashboard and job page, Pro sign-up, setup and dashboard, and admin (overview, providers, provider preview, documents, ProConnect).
- Brand: Get (navy #0f2b4c), Pros (teal #0fa3b1), .ai (slate) wordmark, Inter and Plus Jakarta Sans fonts, plus the theme colours, Black Friday banner and real photos.

## Deliverables (saved to Files)
1. **Screen captures:** every page at desktop (1440px) and mobile (390px). Long pages are captured in sections. Signed-in pages use a temporary test account with example data, clearly labelled as examples. Key states are included: errors, empty lists, setup incomplete, under review, English/Español.
2. **Presentation PDF:** in the style of your example deck (cover, page inventory, user flows, then screens grouped as customer, Pro and admin). It uses your real design, not the example's.
3. **Design-system sheet:** colour swatches with exact values, type sizes, spacing, corner rounding, shadows, buttons, form fields, cards, banner and logo.
4. **Asset pack (ZIP):** logo as SVG, app icons, photos, icons and the fonts list.
5. **Page inventory and flow map:** a spreadsheet of every page, who can see it, and how it links to the others.

## Getting it into editable Figma (your actions)
- **Recommended:** install the free "html.to.design" Figma plugin and paste each live page address (getpros.ai/...). It rebuilds the pages as editable Figma layers using your real styles. I'll provide the full address list in order. Signed-in pages need you to sign in inside the plugin's browser step, or to use the captures.
- **Simple option:** drag the PDF or captures into Figma. These come in as images, not editable layers.
- **Optional live read:** install Lovable Desktop and enable Figma's desktop MCP. Lovable can then read your Figma file but still can't write to it.

## Limits
- Captures and the PDF are pictures. Only the plugin route gives editable layers, and those need tidying in Figma.
- Admin and Pro pages will show test data, not real customer details.
- Nothing on the site changes and nothing is published.

## Technical details
- Playwright captures from the local preview, with a test user minted per project rules. Admin access only for the temporary test user, removed afterwards.
- The PDF and spreadsheet are generated in /tmp, checked page by page, then copied to /mnt/documents and grouped into one Files collection.
