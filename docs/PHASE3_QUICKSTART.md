# Phase 3: Stripe Integration - Quick Start Guide

Get up and running with Stripe integration in 10 minutes!

## 🚀 Quick Setup (5 Steps)

### 1. Install Dependencies

```bash
# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 2. Configure Stripe

**Get your Stripe keys:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy both keys (use test mode for development)

**Set Firebase Functions config:**

```bash
firebase functions:config:set stripe.secret="sk_test_YOUR_SECRET_KEY"
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
firebase functions:config:set app.url="http://localhost:3000"
firebase functions:config:set app.currency="AUD"
```

**Add to `.env.local`:**

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
```

### 3. Build & Deploy Functions

```bash
# Build
cd functions
npm run build

# Deploy
cd ..
firebase deploy --only functions

# Note the stripeWebhook function URL!
```

### 4. Configure Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter: `https://us-central1-YOUR-PROJECT.cloudfunctions.net/stripeWebhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Update Firebase config:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_NEW_SECRET"
   firebase deploy --only functions
   ```

### 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## ✅ Test It!

### Test Join Club Flow

1. Start your dev server: `npm run dev`
2. Navigate to any club overview page
3. Click "Join the Club"
4. Use test card: `4242 4242 4242 4242` (any future date, any CVC)
5. Complete payment
6. You should be redirected to the club dashboard!

**Verify in Firestore:**

- Check `users/{yourUid}/clubsJoined` - should contain the clubId
- Check `clubs/{clubId}/membersCount` - should increment
- Check `payments` collection - should have a new document

### Test Become Host Flow

1. Navigate to `/become-host`
2. Click "Pay $1 and Become a Host"
3. Use same test card
4. Complete payment
5. You should see the success page!

**Verify in Firestore:**

- Check `users/{yourUid}/roles/host` - should be `true`
- Check `payments` collection - should have a new one-time payment

### Test Admin Payouts

1. Make yourself an admin:
   ```bash
   npm run set:admin YOUR_EMAIL@example.com
   ```
2. Navigate to `/admin/payouts`
3. Click "Apply Filters" to load data
4. View payments and summaries
5. Try exporting to CSV

## 📦 What Was Installed?

### New Files Created

```
functions/
├── src/
│   ├── index.ts              # Exports all functions
│   └── stripe.ts             # Stripe integration logic
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── .gitignore

src/
├── app/
│   ├── become-host/
│   │   └── page.tsx          # Host onboarding with $1 fee
│   └── (admin)/admin/payouts/
│       └── page.tsx          # Admin payout reporting
├── types/
│   └── payment.ts            # Payment TypeScript types
└── lib/
    └── stripe.ts             # Updated with Cloud Functions

firebase.json                 # Firebase configuration
firestore.rules              # Updated with payments rules
```

### Updated Files

- `src/lib/stripe.ts` - Added Cloud Function helpers
- `src/components/JoinButton.tsx` - Uses Cloud Functions
- `firebase/firestore.rules` - Added payments collection rules

## 🎯 Key Features

| Feature           | Endpoint/Page        | Description                          |
| ----------------- | -------------------- | ------------------------------------ |
| **Join Club**     | Any club `/overview` | Monthly subscription via Stripe      |
| **Become Host**   | `/become-host`       | $1 one-time fee                      |
| **Webhooks**      | Cloud Function       | Auto-updates Firestore               |
| **Admin Payouts** | `/admin/payouts`     | Manual payout reporting & CSV export |

## 🧪 Test Cards

| Card Number         | Result                |
| ------------------- | --------------------- |
| 4242 4242 4242 4242 | ✅ Success            |
| 4000 0027 6000 3184 | 🔐 Requires 3D Secure |
| 4000 0000 0000 0002 | ❌ Declined           |

- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any (e.g., 12345)

## 🐛 Troubleshooting

### "Missing Stripe key"

→ Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.local`

### "Webhook verification failed"

→ Update `stripe.webhook_secret` in Firebase config with correct value from Stripe dashboard

### "Function not found"

→ Ensure functions are deployed: `firebase deploy --only functions`

### "Firestore write failed"

→ Deploy firestore rules: `firebase deploy --only firestore:rules`

### View Logs

```bash
firebase functions:log --only stripeWebhook
```

## 📚 Full Documentation

- **Detailed Setup**: See `PHASE3_STRIPE_SETUP.md`
- **Implementation Details**: See `PHASE3_IMPLEMENTATION_SUMMARY.md`
- **Stripe Docs**: [stripe.com/docs](https://stripe.com/docs)
- **Firebase Functions**: [firebase.google.com/docs/functions](https://firebase.google.com/docs/functions)

## 🎉 You're Ready!

Your Stripe integration is complete! You can now:

- ✅ Accept club subscriptions
- ✅ Charge host onboarding fees
- ✅ Track all payments in Firestore
- ✅ Generate payout reports

### Next Steps (Optional)

1. **Switch to Production**
   - Use live Stripe keys (`pk_live_...`, `sk_live_...`)
   - Update `app.url` to production domain
   - Test with real cards (small amounts first!)

2. **Add Stripe Connect** (Phase 4+)
   - Automatic payouts to hosts
   - Platform fees
   - Split payments

3. **Enhance User Experience**
   - Add payment history page for users
   - Implement subscription management UI
   - Add email notifications

## 🤝 Need Help?

- Check webhook logs in Stripe Dashboard
- View function logs: `firebase functions:log`
- Review Firestore data in Firebase Console
- See detailed docs in `PHASE3_STRIPE_SETUP.md`

---

**Ready to go live?** Make sure to test thoroughly with test cards first! 🚀
