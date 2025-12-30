UI.md — Minimal, Modern, Sleek

1. Principles

Minimal + calm: Fewer elements, generous white space, no visual noise.

One primary action per screen (secondary = link-styled).

Consistent rhythm: same paddings, gaps, card style everywhere.

Readable first: strong hierarchy, no tiny text, predictable layout.

Accessible: WCAG AA contrast, keyboard navigable, focus styles visible.

2. Brand & Tokens

Primary Blue: #55b7f5 (tailwind token: brand)

Background: #fafbfc (token: background)

Text: slate-900 for headings, slate-600 body

Borders: #e2e8f0 (tailwind: slate-200)

Tailwind config (add to tailwind.config.cjs)
theme: {
extend: {
colors: {
brand: { DEFAULT: '#55b7f5' },
background: '#fafbfc',
},
borderRadius: { '2xl': '1rem' },
boxShadow: {
soft: '0 8px 24px rgba(15, 23, 42, 0.06)'
}
}
}

3. Layout & Spacing

Container: max-w-6xl mx-auto px-4 md:px-6 py-8

Section gap: gap-6 md:gap-8

Card: rounded-2xl border border-slate-200 bg-white shadow-soft p-6 md:p-8

Stack: prefer vertical stacks; avoid complex grids unless needed.

4. Typography scale

Page title: text-2xl md:text-3xl font-semibold text-slate-900

Section title: text-lg md:text-xl font-semibold

Body: text-base text-slate-600 leading-7

Small/meta: text-sm text-slate-500

5. Components (use these patterns)

Button (primary): bg-brand text-white hover:opacity-90 rounded-xl px-4 py-2

Button (ghost/link): text-brand hover:underline underline-offset-2

Input: h-10 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:ring-2 focus:ring-brand/40

Card: (see spacing above)

Inline edit (profile name):

- Default state: name + “Edit name” pill button.
- Edit state: rounded-xl input + primary “Save” pill + ghost “Cancel”. Inline helper/error copy sits below input (text-xs text-red-600 when error).

Progress bar (thin):

<div class="h-1 w-full rounded-full bg-slate-200">
  <div class="h-1 rounded-full bg-brand" style="width:VAR%;"></div>
</div>

Empty state: simple emoji + one CTA:

<div class="card">
  <div class="text-3xl">📚</div>
  <h3 class="mt-2 text-lg font-semibold text-slate-900">No courses yet</h3>
  <p class="mt-1 text-slate-600">Come back when new lessons drop.</p>
  <a class="mt-4 inline-block bg-brand text-white rounded-xl px-4 py-2">Browse Classroom</a>
</div>

6. AppShell (nav)

Left: logo (text ok) → “Dashboard”, “Classroom”, “Downloads”

Right: avatar menu (Profile, Sign out)

Styles: translucent white on scroll (no heavy headers), underline active link.

<header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
  <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 md:px-6">
    <a className="font-semibold text-slate-900">ImagineHumans Academy</a>
    <nav className="flex items-center gap-6">
      <a className="text-slate-700 hover:text-slate-900">Dashboard</a>
      <a className="text-slate-700 hover:text-slate-900">Classroom</a>
      <a className="text-slate-700 hover:text-slate-900">Downloads</a>
      <button className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden"> {/* avatar */}</button>
    </nav>
  </div>
</header>

7. Page templates
   Dashboard

Header: page title + small subtitle

Two cards in a single column stack (mobile-first):

Today’s AI Read (title + snippet + “Read more” link)

Notice Board (rich text)

Stats row (members/admins) as small cards with the thin progress bar style

Classroom

Filter (categories) as pills; courses in simple 2-col grid on desktop (1-col mobile)

Course card (clickable whole card):

<div class="card hover:shadow-md transition">
  <div class="flex items-start justify-between">
    <h3 class="text-lg font-semibold text-slate-900">AI Foundations</h3>
    <span class="text-sm text-slate-500">AI</span>
  </div>
  <p class="mt-2 text-slate-600 line-clamp-2">Short summary…</p>
  <div class="mt-4">
    <div class="h-1 bg-slate-200 rounded-full"><div class="h-1 bg-brand rounded-full w-[65%]"></div></div>
    <button class="mt-3 text-brand hover:underline">Begin Course</button>
  </div>
</div>

Course overview

Left: title, summary; Right (or below): modules list

Primary CTA: “Begin” or “Continue”

Keep transcript/description collapsed unless opened

Lesson player

Mux player on top, transcript below in a collapsible

Right sidebar: modules/lessons with checkmarks; active lesson highlighted with a slim brand border

8. Motion & Iconography

Motion: subtle only (no parallax). Use transition & hover:opacity-90; optional small framer-motion fade on mount.

Icons: lucide-react, 1–2 per page max.

9. Accessibility

Semantic landmarks (<header> <main> <nav>)

Keyboard focus rings (focus-visible:ring-2 focus-visible:ring-brand/40)

Ensure text on brand blue meets contrast (use white text only)

10. Do / Don’t

✅ One CTA, lots of whitespace, predictable patterns

✅ Use brand blue sparingly (buttons, links, progress)

❌ No gradients, no card clutter, no excessive borders

❌ No more than 2 font sizes per card

❌ No skeletons unless truly needed
