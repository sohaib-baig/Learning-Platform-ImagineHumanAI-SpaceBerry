# Homepage UI Updates – Waitlist CTA

## Overview
The homepage (`src/app/page.tsx`) was updated to support the new, server-backed waitlist flow that lives at `/platform/waitlist`. Every “Join the Waitlist” surface on the landing experience now routes visitors to the dedicated form instead of opening a `mailto:` link.

## Key Changes
- **CTA destinations** – All homepage buttons that previously referenced `WAITLIST_EMAIL_LINK` now consume the new `WAITLIST_PATH` constant from `src/lib/constants.ts`. This keeps the destination consistent with the platform page and ensures future URL changes occur in one place.
- **Consulting section button** – The secondary CTA inside “ImagineHumans AI Consulting” now also points to `/platform/waitlist`, aligning messaging between hero and mid-page sections.
- **Platform Coming Soon card** – Users exploring the platform teaser are nudged toward the same waitlist route for a seamless story, regardless of scroll depth.

## Implementation Notes
1. Add or update references to `WAITLIST_PATH` when introducing new CTAs on the homepage to avoid regressions.
2. Keep button copy short; the current layout assumes ~28 characters maximum before wrapping on small screens.
3. When altering CTA styling, verify both the hero stack (mobile) and side-by-side layout (desktop) since Tailwind classes differ slightly between sections.

## Testing
- Run `npm run dev` and manually click each homepage waitlist CTA to confirm navigation to `/platform/waitlist`.
- Submit the waitlist form once the page loads to ensure the full funnel (CTA → form → confirmation) functions as expected in your environment.

