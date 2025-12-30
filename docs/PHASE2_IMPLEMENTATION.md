# Phase 2: Multi-Club Frontend Implementation

## Overview

This phase implements the full multi-club frontend experience on top of the Firestore schema from Phase 1. Users can browse clubs, join via Stripe checkout, access club-specific content, and switch between multiple clubs.

## Features Implemented

### 1. Club Context (`src/context/ClubContext.tsx`)

A React Context provider that manages club state throughout the application:

- Fetches club data by slug
- Determines user role (host/member)
- Provides loading and error states
- Enables refetch functionality

### 2. UI Components

#### `ClubBanner` (`src/components/ClubBanner.tsx`)
Hero banner displaying club name, vision, and banner image.

#### `ClubCard` (`src/components/ClubCard.tsx`)
Reusable card component for displaying club information in grids.

#### `ReviewsCarousel` (`src/components/ReviewsCarousel.tsx`)
Interactive carousel for displaying member reviews with star ratings.

#### `JoinButton` (`src/components/JoinButton.tsx`)
Smart button that handles Stripe checkout integration:
- Shows "Join for [Price]" for non-members
- Shows "Go to Dashboard" for members/hosts
- Handles loading states and errors

#### `ClubSwitcher` (`src/components/ClubSwitcher.tsx`)
Dropdown component for switching between joined clubs.

### 3. Routes

#### `/club/[slug]/overview` (`src/app/club/[slug]/overview/page.tsx`)

Public club landing page featuring:
- Club banner and mission
- Benefits list
- Pricing information
- Join button (Stripe integration)
- Member reviews carousel
- Recommended clubs

#### `/club/[slug]/dashboard` (`src/app/club/[slug]/dashboard/page.tsx`)

Protected member-only dashboard with three tabs:

1. **Journeys**: List of club journeys with links to lessons
2. **Downloads**: Available resources with direct download links
3. **Recommended Clubs**: Suggested clubs to explore

Features:
- Access guard (redirects non-members to overview)
- Club switcher in header
- Tab-based navigation

#### `/your-clubs` (`src/app/your-clubs/page.tsx`)

Personal clubs page showing:
- All clubs the user has joined
- Clubs the user is hosting (displayed first)
- Empty state with call-to-action
- Quick access to club dashboards

### 4. API Endpoints

#### `POST /api/checkout` (`src/app/api/checkout/route.ts`)

Creates a Stripe checkout session for club membership:
- Validates club existence
- Supports both one-time and subscription payments
- Returns session ID for client-side redirect

#### `POST /api/webhook/stripe` (`src/app/api/webhook/stripe/route.ts`)

Handles Stripe webhook events:
- `checkout.session.completed`: Adds user to club, increments member count
- `customer.subscription.deleted`: Handles subscription cancellation
- `customer.subscription.updated`: Handles subscription updates
- `invoice.payment_failed`: Handles payment failures

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `stripe`: Server-side Stripe SDK
- `@stripe/stripe-js`: Client-side Stripe SDK

### 2. Environment Variables

Add the following to your `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL (for Stripe redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Never commit your `.env.local` file. Keep API keys secure.

### 3. Stripe Setup

#### A. Create Stripe Account
1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard

#### B. Set Up Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhook/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

#### C. Test Webhooks Locally

Use Stripe CLI for local testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Copy the webhook signing secret from the CLI output.

### 4. Firestore Security Rules

Ensure your Firestore rules from Phase 1 are deployed:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Run Development Server

```bash
npm run dev
```

Visit:
- Club overview: `http://localhost:3000/club/imaginehumans/overview`
- Your clubs: `http://localhost:3000/your-clubs`

## Usage Flow

### For New Users

1. **Discover Club**: Navigate to `/club/[slug]/overview`
2. **Review Benefits**: See club mission, benefits, pricing, and reviews
3. **Join Club**: Click "Join" button → Redirected to Stripe Checkout
4. **Payment**: Complete payment on Stripe
5. **Access Dashboard**: Redirected to `/club/[slug]/dashboard`
6. **Explore Content**: Browse journeys, downloads, and recommended clubs

### For Existing Members

1. **View Clubs**: Navigate to `/your-clubs`
2. **Select Club**: Click "Open Club" on any card
3. **Switch Clubs**: Use the Club Switcher dropdown in the dashboard
4. **Access Content**: View journeys and downloads specific to that club

### For Hosts

Hosts have the same access as members, plus:
- Automatic access to their hosted clubs (no payment required)
- "Go to Dashboard" button on overview page

## Architecture Highlights

### Functional Code Patterns

All components follow functional programming principles:
- Pure functional components
- React Hooks for state management
- No class components
- Immutable state updates

### Industry Best Practices

- **TypeScript**: Full type safety throughout
- **Separation of Concerns**: UI components are purely presentational
- **Context API**: Centralized club state management
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Proper loading indicators for async operations
- **Security**: Server-side validation, webhook verification
- **Responsive Design**: Mobile-first Tailwind CSS

### Data Flow

```
User Action → UI Component → API Route → Firestore/Stripe → Webhook → Firestore Update
```

Example: Joining a club
1. User clicks "Join" button
2. `JoinButton` calls `/api/checkout`
3. API creates Stripe session
4. User redirected to Stripe
5. User completes payment
6. Stripe sends webhook to `/api/webhook/stripe`
7. Webhook updates Firestore (user clubsJoined, club membersCount)
8. User redirected to dashboard

## Testing

### Manual Testing Checklist

- [ ] Club overview page loads correctly
- [ ] Join button creates Stripe checkout session
- [ ] Payment completes successfully
- [ ] Webhook updates Firestore
- [ ] User is added to club
- [ ] Dashboard shows club content
- [ ] Journeys tab displays journeys
- [ ] Downloads tab displays downloads
- [ ] Recommended clubs tab works
- [ ] Club switcher shows all clubs
- [ ] Your clubs page displays joined clubs
- [ ] Access guards redirect properly

### Stripe Test Cards

Use these test cards in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

Use any future expiry date and any CVC.

## Troubleshooting

### Issue: Webhook not receiving events

**Solution**: 
1. Verify webhook URL in Stripe dashboard
2. Check webhook secret matches `.env.local`
3. Use Stripe CLI for local testing
4. Check server logs for errors

### Issue: User not added to club after payment

**Solution**:
1. Check Stripe webhook logs
2. Verify Firestore security rules allow the update
3. Check server logs for Firebase errors
4. Ensure metadata is included in checkout session

### Issue: Club not found

**Solution**:
1. Verify club exists in Firestore
2. Check slug matches exactly (case-sensitive)
3. Run Phase 1 migration if needed

### Issue: Access denied to dashboard

**Solution**:
1. Verify user's `clubsJoined` array includes club ID
2. Check Firestore security rules
3. Clear browser cache and re-authenticate

## Next Steps

### Recommended Enhancements

1. **Club Discovery Page**: Browse all available clubs
2. **Search & Filters**: Find clubs by category, price, etc.
3. **Host Dashboard**: Manage club content, members, and settings
4. **Admin Panel**: Approve/disable hosts, moderate content
5. **Analytics**: Track member engagement, revenue, churn
6. **Email Notifications**: Welcome emails, payment reminders
7. **Mobile App**: React Native or Flutter implementation
8. **Social Features**: Member profiles, discussions, networking
9. **Advanced Payments**: Annual subscriptions, discounts, trials
10. **Content Management**: Rich text editor for club descriptions

### Technical Improvements

1. **Server-Side Rendering**: Use Next.js SSR for better SEO
2. **Caching**: Implement Redis for frequently accessed data
3. **Image Optimization**: Use Next.js Image component
4. **Error Boundaries**: Add React Error Boundaries
5. **Testing**: Add Jest/Vitest unit and integration tests
6. **Performance Monitoring**: Integrate Sentry or LogRocket
7. **A/B Testing**: Implement feature flags
8. **Internationalization**: Support multiple languages
9. **Accessibility**: WCAG 2.1 compliance
10. **Progressive Web App**: Add PWA capabilities

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firestore security rules
3. Inspect browser console for errors
4. Check server logs for API errors
5. Verify Stripe webhook delivery in dashboard

## License

Proprietary - ImagineHumans Academy

