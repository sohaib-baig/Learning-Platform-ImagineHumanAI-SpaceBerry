## Platform Scope

### Member Experience

- Google sign-in (Firebase Auth) only.
- Dashboard surfaces Today’s AI Read, Notice Board, summary counts, and shortcuts.
- Classroom lists published **club journeys** (now under `clubs/{clubId}/journeys`) plus the legacy course catalogue.
- Journey & lesson pages deliver Mux playback, transcripts, resources, and per-lesson progress saving.
- Downloads include both global assets and club-specific resources; club tabs are member/host gated.
- Profile page focuses on privacy-first account data: members can rename `displayName`, review joined/hosted club counts, and see host status guidance.

### Host/Admin Experience

- `/admin` hosts summary cards (users, admins, courses).
- Legacy course tooling remains at `/admin/courses` and `/admin/courses/[id]`.
- `/admin/announcements` edits Today’s AI Read & Notice Board; `/admin/downloads` manages global assets.
- `/admin/payouts` aggregates Stripe payment data for manual exports.
- Hosts manage journeys/downloads directly from their club dashboard tabs rather than bespoke admin screens.

## High-Level Flow

1. User authenticates via Firebase Auth (Google provider).
2. Profile document (`users/{uid}`) stores a structured `roles` object (`user`, `host`, optional `admin`), host status, and lightweight membership arrays (`clubsJoined`, `clubsHosted`).
3. `ClubProvider` resolves the active club context, confirms membership/host status, and exposes `clubId` to consumers.
4. Journey helpers in `src/lib/firestore/classroom.ts` use `collectionGroup("journeys")` queries, hydrating lessons from `clubs/{clubId}/journeys/{journeyId}/lessons`.
5. `MuxPlayer` / `VideoPlayer` wrap `@mux/mux-player-react`, persisting progress (Firestore) and dispatching analytics events.
6. Stripe checkout/webhook routes (`/api/checkout`, `/api/webhook/stripe`) govern club membership billing and Firestore updates.

## Routing (App Router)

**Member routes**

- `/`, `/signin`
- `/dashboard`, `/classroom`, `/downloads`, `/profile`, `/your-clubs`
- `/classroom/[journeyId]`, `/classroom/[journeyId]/lesson/[lessonId]`
- `/learn/[courseId]/[moduleId]/[lessonId]` (legacy courses)
- `/club/[slug]/dashboard`, `/club/[slug]/overview`
- `/become-host` (wrapped in Suspense because it uses `useSearchParams`)

**Admin routes**

- `/admin`, `/admin/courses`, `/admin/courses/[id]`
- `/admin/downloads`, `/admin/announcements`, `/admin/payouts`

**API routes**

- `/api/checkout` – create Stripe Checkout sessions.
- `/api/webhook/stripe` – ingest Stripe webhooks.

## Member Billing Lifecycle

1. **Checkout session**  
   - `createCheckoutSessionForClub` grants at most one 7-day trial per user/club by looking for prior `payments` entries (`trial_start`, `subscription`, `subscription_first_charge`, `subscription_renewal`).  
   - `checkout.session.completed` provisions access immediately, writes `users/{uid}.clubMemberships[clubId]` with the canonical shape (`status`, `isTrialing`, `stripeSubscriptionId`, `trialEndsAt`, `lastPaymentType`, `lastPaymentAt`, `consecutiveFailedPayments`), and emits either a `trial_start` (no charge) or `subscription` ledger row. `clubsJoined` + `membersCount` are updated only once per member.
2. **Invoices that succeed**  
   - The webhook keeps the `billing_reason === "subscription_cycle"` guard and ignores non-member subscriptions.  
   - We detect the first paid invoice per `stripe.subscriptionId` to label it `subscription_first_charge`; later invoices are `subscription_renewal`. Membership state flips to `status: "active"`, `isTrialing: false`, `trialEndsAt: null`, `lastPaymentType: <entry>`, and `consecutiveFailedPayments` resets to 0.  
   - Any existing `subscriptionFailures/{subscriptionId}` document is deleted so the failure streak is truly consecutive.
3. **Invoices that fail**  
   - Only member subscription cycles increment `subscriptionFailures/{subscriptionId}`, which stores `{ subscriptionId, uid, clubId, failureCount, lastInvoiceId, lastFailedAt }` with idempotency via `lastInvoiceId`.  
   - The matching `clubMemberships[clubId]` entry records `lastPaymentType: "invoice_failed"` and bumps `consecutiveFailedPayments`. After three failures we cancel the Stripe subscription and log `member_subscription_auto_cancelled_after_failures`. Access actually disappears when Stripe emits `customer.subscription.deleted`.
4. **Subscription deleted**  
   - The handler removes the club from `clubsJoined`, decrements `membersCount`, marks the membership as `status: "canceled"`, `isTrialing: false`, and clears any `subscriptionFailures/{subscriptionId}` document. We rely on this hook for both voluntary cancellations and auto-cancel after repeated failures.

All user document writes merge (`set(..., { merge: true })`) so `clubMemberships` stays a map keyed by `clubId` while the legacy `clubsJoined` array remains untouched for older UI.

## Access Control

- Logged-in members can access all non-admin pages; Firestore security rules guard data per club membership/host status.
- Admin role: `users/{uid}.roles.admin === true`.
- Host permissions use `clubsHosted` and `isHostOf(clubId)` helper logic in `firebase/firestore.rules`.

## Components & Patterns

- `AppShell` renders navigation, avatar menu, and `ClubSwitcher`.
- When no club context is active, the primary nav link reads “Your clubs” and routes to `/your-clubs`.
- Profile editing uses an inline input + Save/Cancel control paired with optimistic Firestore updates.
- `ClubSwitcher` queries joined/hosted clubs (with Set dedupe) and links to dashboards.
- `LessonSidebar` accepts lightweight `{ id, title, order, durationMinutes? }` entries, merging server + client lesson progress.
- `MuxPlayer`/`VideoPlayer` rely on typed `ComponentRef<typeof MuxPlayerComponent>` refs, timed progress saves, and analytics hooks.
- `ClubDashboard` tabs lazily fetch journeys/downloads/recommended content.
- Suspense boundaries wrap any page that relies on client search params (preventing Next.js CSR bailout warnings).

## Styling Guidelines

- Tailwind CSS, body background `#fafbfc`, accent `#55b7f5`.
- Headings use `text-slate-900`, body copy `text-slate-600`, CTAs adopt the accent blue.
- Layout defaults: `max-w-6xl/7xl`, `px-4 md:px-6`, vertical gaps `gap-6 md:gap-8`.
- Cards are `rounded-2xl`, `p-6 md:p-8`, low shadow; button hover states are subtle.

## Analytics Events (Amplitude)

- Auth/navigation: `signup`, `signin`, `view_dashboard`, `view_classroom`, `view_course`, `view_lesson`.
- Video: `play_video`, `pause_video`, `seek_video`, `video_progress`.
- Learning: `progress_saved`, `complete_lesson`, `complete_course`.
- Content: `view_downloads`, `download_resource`.
- Admin/host: `admin_update_notice`, `admin_update_today_read`, `admin_publish_course`, plus `enrollment_created`, `lesson_completed` from updated flows.

## Emails

- Welcome email (Postmark) sent on first signup; CTA path: dashboard → classroom → begin journey.

## Security & Environment

- Firestore security rules live in `firebase/firestore.rules`; club content is protected with `isMember(clubId)` / `isHostOf(clubId)` helpers.
- `.env` validated via `src/lib/env.ts` (zod). Required keys: `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Stripe SDK clients are instantiated lazily inside API handlers/functions to avoid build-time failures when secrets are absent.
- Build-time Firestore queries may log permission warnings in CI if credentials aren’t supplied—expected unless service credentials are injected.
- `scripts/cleanup-user-profiles.ts` normalises legacy user docs (removing `country`, coercing string roles) ahead of the modern profile UX.
