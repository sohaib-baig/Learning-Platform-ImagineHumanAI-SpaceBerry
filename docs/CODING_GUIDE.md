Folder Structure
/app
  /(public)
    /signin /signup /reset-password
  /(app)
    /dashboard /classroom /courses/[slug]
    /learn/[courseId]/[moduleId]/[lessonId]
    /downloads /profile
  /(admin)
    /admin /admin/courses /admin/courses/[id]
    /admin/downloads /admin/announcements
  /api
    /auth/* (if needed)
    /email/welcome/route.ts (server action endpoint if used)
  layout.tsx globals.css
/components
  AppShell.tsx PageHeader.tsx Card.tsx EmptyState.tsx
  LessonSidebar.tsx MuxPlayer.tsx ProgressBar.tsx
/lib
  firebase.ts auth.ts db/
  db/courses.ts db/modules.ts db/lessons.ts db/progress.ts db/users.ts db/downloads.ts
  analytics.ts email.ts mux.ts env.ts sanitize.ts
/styles
  tailwind.css
/tests
  unit/* e2e/*

Tailwind Theme Snippet (tailwind.config.cjs)
theme: {
  extend: {
    colors: {
      brand: { DEFAULT: '#55b7f5' },
      background: '#fafbfc',
    },
    borderRadius: { '2xl': '1rem' }
  }
}

UI Rules

Page container: max-w-6xl mx-auto px-4 md:px-6 py-8

Cards: rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8

Primary button: bg-brand text-white hover:opacity-90 rounded-xl px-4 py-2

Links: text-brand underline-offset-2 hover:underline

DX & Quality

Strict TS, no any

Zod validation for server inputs

Centralized Firestore calls in lib/db/*

Error boundaries and loading states for each route

Unit tests for data helpers + progress logic