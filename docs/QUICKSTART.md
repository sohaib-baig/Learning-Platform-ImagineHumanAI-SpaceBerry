# Quick Start Guide - Multi-Club Platform

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` in the project root:

```bash
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Firestore Migration

```bash
# Dry run (see what will happen)
npm run migrate:clubs

# Actually migrate
DRY_RUN=false npm run migrate:clubs
```

### 4. Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

## 📍 Key Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/club/[slug]/overview` | Public club landing page | Public |
| `/club/[slug]/dashboard` | Member dashboard | Members only |
| `/your-clubs` | All joined clubs | Authenticated |
| `/signin` | Sign in with Google | Public |

## 🧪 Testing

### Test with Stripe

1. Use test cards: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC

### Local Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

## 🔑 Key Files

### Context & Hooks
- `src/context/ClubContext.tsx` - Club state management
- `src/hooks/useAuth.ts` - Authentication hook

### Components
- `src/components/ClubBanner.tsx` - Hero banner
- `src/components/ClubCard.tsx` - Club grid card
- `src/components/ClubSwitcher.tsx` - Dropdown switcher
- `src/components/JoinButton.tsx` - Stripe checkout

### Routes
- `src/app/club/[slug]/overview/page.tsx` - Public overview
- `src/app/club/[slug]/dashboard/page.tsx` - Member dashboard
- `src/app/your-clubs/page.tsx` - User's clubs list

### API
- `src/app/api/checkout/route.ts` - Create Stripe session
- `src/app/api/webhook/stripe/route.ts` - Handle webhooks

## 🐛 Common Issues

### "Club not found"
- Run the migration script
- Check Firestore console for club docs
- Verify slug matches exactly

### "Failed to load Stripe"
- Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Verify key starts with `pk_test_`

### "Webhook not receiving events"
- Use Stripe CLI for local testing
- Check webhook secret matches
- Verify URL in Stripe dashboard

## 📚 Next Steps

1. Read `PHASE2_IMPLEMENTATION.md` for full details
2. Read `README_PHASE1.md` for data model
3. Customize UI in components
4. Add your club content to Firestore

## 🆘 Need Help?

- Check `PHASE2_IMPLEMENTATION.md` → Troubleshooting
- Review Firestore security rules
- Inspect browser console for errors
- Check server logs for API errors

## 🎯 Development Flow

```
1. Sign in with Google → /signin
2. Browse clubs → /club/[slug]/overview
3. Join club → Stripe checkout
4. Access dashboard → /club/[slug]/dashboard
5. Switch clubs → Club Switcher dropdown
6. View all clubs → /your-clubs
```

Happy coding! 🚀

