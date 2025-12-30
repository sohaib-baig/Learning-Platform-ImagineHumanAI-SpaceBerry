# ImagineHumans Academy

Club-based learning platform built with Next.js (App Router), Firebase, and Stripe. Hosts manage private journeys and resources for their members; students access lessons, track progress, and download club content.

## Features

- **Auth & Profiles** – Google sign-in via Firebase Auth, user documents under `users/{uid}` with club membership metadata.
- **Profile Experience** – Minimal data collection with inline display-name editing, club activity stats, and privacy guidance.
- **Clubs & Journeys** – Journeys (and lessons) live under `clubs/{clubId}/journeys/{journeyId}`; classroom views query via Firestore collection groups.
- **Learning Experience** – Mux-powered video playback, real-time progress saving, lesson completion events, transcripts/resources support.
- **Club Dashboard** – Tabs for journeys, downloads, recommended clubs; membership gating enforced client-side and by Firestore rules.
- **Admin Toolkit** – Legacy course CRUD, announcements editor, downloads manager, payouts reporting scaffold.
- **Stripe Billing** – Checkout & webhook routes manage club memberships; metadata updates Firestore membership records.

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Firebase Auth, Firestore, Storage
- Stripe checkout & webhooks
- Mux Player for video streaming
- Vitest + Testing Library for unit coverage

## Prerequisites

Create `.env.local` (and optionally `.env.development.local`) with the following keys:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_TIER_A=
STRIPE_PRICE_ID_TIER_B=
STRIPE_PRICE_ID_TIER_C=
```

> Tip: `src/lib/env.ts` validates required browser variables and `src/lib/env-server.ts` validates server-only Stripe keys so missing config fails fast during boot.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open `http://localhost:3000`. Firestore rules expect authenticated users; for local dev you can use the hosted Firebase project or run emulators (configure `.firebaserc` accordingly).

### Common Scripts

| Script                          | Description                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                   | Next.js dev server                                                             |
| `npm run build`                 | Production build (runs ESLint + type checking)                                 |
| `npm run lint`                  | ESLint (Next.js config)                                                        |
| `npm run test`                  | Vitest unit tests                                                              |
| `npm run test:watch`            | Watch mode for tests                                                           |
| `npm run cleanup:user-profiles` | Normalise legacy user docs (removes unsupported fields, converts roles arrays) |
| `node scripts/grant-admin.js <uid>` | Add the `admin: true` custom claim to a user (service account required)     |
| `node scripts/drop-admin.js <uid>`  | Remove the `admin` custom claim from a user                                  |

### Admin access model

- Admin rights are based on a trusted Firebase custom claim `admin: true` (not the user document). A whitelist (`NEXT_PUBLIC_ADMIN_WHITELIST`) also applies in the admin layout.
- To grant admin: `node scripts/grant-admin.js <uid>`; to revoke: `node scripts/drop-admin.js <uid>`.
  - Auth for scripts: set `GOOGLE_APPLICATION_CREDENTIALS` or place `service-account.json` at the repo root.
  - After updating claims, the user must sign out/in to refresh their ID token.
  - Ensure the admin’s email is present (lowercased/trimmed) in `NEXT_PUBLIC_ADMIN_WHITELIST`.

## Testing & Linting

- **Lint**: `npm run lint` (required for builds).
- **Unit tests**: `npm run test`. Vitest config lives in `vitest.config.ts` and uses the `test` field exported via `vite` config.
- **Mocks**: `src/tests/mocks` provides Firebase/Auth replacements validated against the latest TypeScript expectations.

## Firestore & Stripe

- Firestore structure documented in [`DATA_MODEL.md`](./DATA_MODEL.md); club journeys and lessons now live under `clubs/{clubId}`.
- Composite indexes tracked in `firebase/firestore.indexes.json`. Deploy with `firebase deploy --only firestore:indexes`.
- Stripe clients are created lazily inside API handlers/functions; ensure `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` are set in each environment.
- Member trials & billing:
  - Each user gets a single 7-day (default) trial per club. `createCheckoutSessionForClub` inspects prior `payments` entries (`trial_start`, `subscription`, `subscription_first_charge`, `subscription_renewal`) to decide whether to attach `trial_period_days`.
  - `users/{uid}.clubMemberships[clubId]` stores the canonical membership state:
    - `status: "trialing" | "active" | "payment_required" | "canceled"`
    - `isTrialing`, `stripeSubscriptionId`, `trialEndsAt`, `lastPaymentType`, `lastPaymentAt`, `consecutiveFailedPayments`.
    - We continue updating `clubsJoined` for backwards compatibility; all writes merge via `{ clubMemberships: { [clubId]: … } }`.
  - Ledger entries now distinguish `trial_start`, `subscription`, `subscription_first_charge`, and `subscription_renewal` so reporting can tell trial access from paid renewals.
  - `subscriptionFailures/{subscriptionId}` tracks `{ subscriptionId, uid, clubId, failureCount, lastInvoiceId, lastFailedAt }`. `invoice.payment_failed` increments this counter (with idempotency), while any `invoice.payment_succeeded` resets/removes the doc and the user-level `consecutiveFailedPayments`.
  - After three consecutive failures the webhook cancels the Stripe subscription, logs `member_subscription_auto_cancelled_after_failures`, and access is revoked when `customer.subscription.deleted` fires.

## Deployment Notes

1. Run `npm run build` (ensures lint + type checks). Logs may include Firestore permission warnings if CI lacks credentials.
2. Deploy Firestore rules/indexes: `firebase deploy --only firestore:rules,firestore:indexes`.
3. Configure Stripe webhook endpoint `/api/webhook/stripe` with the production secret.
4. Set the `NEXT_PUBLIC_APP_URL` per environment so Stripe success/cancel URLs resolve correctly.

## Additional Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – platform overview, routing, and component patterns.
- [`DATA_MODEL.md`](./DATA_MODEL.md) – Firestore collections and security rules.
- `firebase/` – Firestore rules and indexing config.
- `scripts/` – migration utilities for moving journeys into club-scoped collections.

For questions or follow-up work, see inline TODOs or open issues in the project tracker.
