Product: ImagineHumans Academy (free beta)
Subdomain: academy.imaginehumans.ai
Target: Skool-style courses, gated video, progress tracking, admin CMS

Tech Choices

Framework: Next.js 14 (App Router, Server Actions), TypeScript

UI: Tailwind CSS + shadcn/ui (used sparingly); minimal, distraction-free

Design tokens:

Brand Blue #55b7f5

Background #fafbfc

Text #0f172a (Slate-900), Muted #475569 (Slate-600), Borders #e2e8f0

Auth: Firebase Auth (Google Sign-In)

DB: Firestore (Native mode)

Storage: Firebase Storage (thumbnails, PDFs).
Video: Mux (upload outside MVP; playback uses pre-uploaded assets or Mux test assets)

Email: Postmark (Welcome email)

Analytics: Amplitude (events listed in ARCHITECTURE.md)

Hosting: Vercel (Next.js), Cloudflare DNS

Monorepo: single app (no turborepo)

Packages (pin these)

firebase@^10 (Auth + Client SDK with Google provider)

next@^14

react@^18 react-dom@^18

tailwindcss@^3 postcss autoprefixer

class-variance-authority lucide-react zod

@mux/mux-player-react@^2 (player)

@amplitude/analytics-browser@^2

postmark@^4

date-fns, uuid, ky (optional fetch)

Dev: eslint, prettier, vitest, @testing-library/react, @testing-library/jest-dom
