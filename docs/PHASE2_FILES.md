# Phase 2: Files Created/Modified

## 📁 New Files Created

### Types
```
src/types/
└── club.ts                          # Club-related TypeScript interfaces
```

### Context & Hooks
```
src/context/
└── ClubContext.tsx                  # Club state management provider

src/hooks/
└── useAuth.ts                       # Authentication hook
```

### Components
```
src/components/
├── ClubBanner.tsx                   # Hero banner component
├── ClubCard.tsx                     # Club grid card component
├── ClubSwitcher.tsx                 # Club dropdown switcher
├── JoinButton.tsx                   # Stripe checkout button
└── ReviewsCarousel.tsx              # Member reviews carousel
```

### Routes
```
src/app/
├── club/
│   └── [slug]/
│       ├── overview/
│       │   └── page.tsx             # Public club landing page
│       └── dashboard/
│           └── page.tsx             # Protected member dashboard
├── your-clubs/
│   └── page.tsx                     # User's clubs overview
└── dashboard/
    └── page.tsx                     # Legacy redirect (backward compatibility)
```

### API Endpoints
```
src/app/api/
├── checkout/
│   └── route.ts                     # Stripe checkout session creation
└── webhook/
    └── stripe/
        └── route.ts                 # Stripe webhook handler
```

### Utilities
```
src/lib/
└── stripe.ts                        # Stripe client utilities
```

### Documentation
```
/
├── PHASE2_IMPLEMENTATION.md         # Complete implementation guide
├── QUICKSTART.md                    # 5-minute setup guide
├── IMPLEMENTATION_SUMMARY.md        # Implementation summary
└── PHASE2_FILES.md                  # This file
```

## 📝 Modified Files

### Dependencies
```
package.json                         # Added Stripe dependencies
```

## 📊 File Statistics

| Category | Files Created | Lines of Code |
|----------|---------------|---------------|
| Types | 1 | ~180 |
| Context/Hooks | 2 | ~150 |
| Components | 5 | ~600 |
| Routes | 4 | ~800 |
| API | 2 | ~200 |
| Utilities | 1 | ~40 |
| Documentation | 4 | ~1,500 |
| **Total** | **19** | **~3,470** |

## 🗂️ File Relationships

### Component Dependencies
```
ClubBanner
  └── (none)

ClubCard
  ├── Club (type)
  └── Link (next)

ClubSwitcher
  ├── useAuth (hook)
  ├── Club (type)
  └── Firebase (Firestore)

JoinButton
  ├── useAuth (hook)
  ├── getStripe (utility)
  └── /api/checkout (API)

ReviewsCarousel
  └── ClubReview (type)
```

### Route Dependencies
```
/club/[slug]/overview
  ├── ClubProvider (context)
  ├── useClub (hook)
  ├── ClubBanner (component)
  ├── ClubCard (component)
  ├── ReviewsCarousel (component)
  └── JoinButton (component)

/club/[slug]/dashboard
  ├── ClubProvider (context)
  ├── useClub (hook)
  ├── ClubSwitcher (component)
  └── ClubCard (component)

/your-clubs
  ├── useAuth (hook)
  ├── ClubCard (component)
  └── Firebase (Firestore)

/dashboard
  └── Router (next/navigation)
```

### API Dependencies
```
/api/checkout
  ├── Stripe SDK
  ├── Firebase (Firestore)
  └── Club (type)

/api/webhook/stripe
  ├── Stripe SDK
  └── Firebase (Firestore)
```

## 🔍 File Purposes

### Core Infrastructure

#### `src/types/club.ts`
Defines TypeScript interfaces for:
- Club data structures
- Journeys and lessons
- Downloads and reviews
- User roles and permissions

#### `src/context/ClubContext.tsx`
Provides app-wide club state:
- Current club data
- User role (host/member)
- Loading and error states
- Refetch functionality

#### `src/hooks/useAuth.ts`
Manages authentication state:
- Current user
- Loading state
- Firebase Auth integration

### UI Components

#### `src/components/ClubBanner.tsx`
**Purpose**: Hero banner for club pages  
**Props**: `bannerUrl`, `name`, `vision`  
**Features**: Image support, gradient fallback

#### `src/components/ClubCard.tsx`
**Purpose**: Display club in grid layouts  
**Props**: `club`, `actionLabel`, `actionHref`  
**Features**: Banner, stats, pricing, action button

#### `src/components/ClubSwitcher.tsx`
**Purpose**: Switch between joined clubs  
**Props**: `currentClubId`  
**Features**: Dropdown, highlighting, quick links

#### `src/components/JoinButton.tsx`
**Purpose**: Handle club membership  
**Props**: `clubId`, `clubSlug`, `price`, `currency`, `isMember`, `isHost`  
**Features**: Stripe integration, loading, auth check

#### `src/components/ReviewsCarousel.tsx`
**Purpose**: Display member reviews  
**Props**: `reviews`  
**Features**: Carousel, stars, navigation

### Routes

#### `/club/[slug]/overview`
**Access**: Public  
**Purpose**: Club landing page  
**Features**: Banner, mission, benefits, pricing, reviews, join

#### `/club/[slug]/dashboard`
**Access**: Members + Hosts  
**Purpose**: Member dashboard  
**Features**: Tabs (journeys, downloads, recommended), switcher

#### `/your-clubs`
**Access**: Authenticated users  
**Purpose**: Personal clubs overview  
**Features**: Grid of clubs, quick access

#### `/dashboard`
**Access**: Public (redirects)  
**Purpose**: Legacy compatibility  
**Features**: Auto-redirect to ImagineHumans club

### API

#### `POST /api/checkout`
**Purpose**: Create Stripe checkout session  
**Input**: `{ clubId, uid }`  
**Output**: `{ sessionId }`  
**Features**: Validation, subscriptions, metadata

#### `POST /api/webhook/stripe`
**Purpose**: Handle Stripe events  
**Input**: Stripe webhook payload  
**Output**: `{ received: true }`  
**Features**: Signature verification, Firestore updates

### Utilities

#### `src/lib/stripe.ts`
**Purpose**: Stripe helper functions  
**Exports**:
- `getStripe()`: Get Stripe client
- `formatPrice()`: Format currency
- `toCents()`, `fromCents()`: Convert units

## 🎯 Import Patterns

### Most Common Imports

```typescript
// Context & Hooks
import { useClub } from "@/context/ClubContext";
import { useAuth } from "@/hooks/useAuth";

// Firebase
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Types
import type { Club, ClubDoc } from "@/types/club";

// Components
import { ClubCard } from "@/components/ClubCard";
import { ClubBanner } from "@/components/ClubBanner";

// Navigation
import { useRouter } from "next/navigation";
import Link from "next/link";
```

## 📋 Checklist for New Developers

When working with this codebase:

- [ ] Read `QUICKSTART.md` first
- [ ] Understand `ClubContext` and `useClub` hook
- [ ] Review `src/types/club.ts` for data structures
- [ ] Check component props before using
- [ ] Use `useAuth` for user state, not direct Firebase
- [ ] All routes use `ClubProvider` wrapper
- [ ] API routes validate input and handle errors
- [ ] Test with Stripe test cards
- [ ] Deploy Firestore rules before testing
- [ ] Use Club Switcher for navigation

## 🔗 External Dependencies

### NPM Packages
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK
- `firebase` - Firebase client SDK
- `next` - Next.js framework
- `react` - React library

### Services
- Firebase Firestore - Database
- Firebase Auth - Authentication
- Stripe - Payment processing
- Next.js - SSR framework

## 📚 Related Documentation

| File | Purpose |
|------|---------|
| `PHASE2_IMPLEMENTATION.md` | Full implementation details |
| `QUICKSTART.md` | Quick setup guide |
| `IMPLEMENTATION_SUMMARY.md` | High-level summary |
| `README_PHASE1.md` | Data model and migration |
| `DATA_MODEL.md` | Database schema |
| `ARCHITECTURE.md` | System architecture |

---

**Last Updated**: November 9, 2025  
**Phase**: 2 - Multi-Club Frontend  
**Status**: Complete ✅

