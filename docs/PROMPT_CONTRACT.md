Always read STACK.md, ARCHITECTURE.md, DATA_MODEL.md, FEATURES.md, CODING_GUIDE.md before coding.

- Follow UI.md strictly:
  - Use container, card, button, and spacing tokens as defined
  - Keep one primary CTA per screen
  - Avoid adding new colors, shadows, or spacing tokens without updating UI.md
- Before coding a page, output a brief layout plan (sections, components).

Before coding, print a short PLAN: files to add/edit, functions, DB reads/writes.

Make multi-file changes atomically. Avoid unrelated edits.

Typesafe only; add JSDoc to exported functions.

Validate inputs with zod on server actions/route handlers.

No secrets in code. Use lib/env.ts with zod to read .env.

Follow folder structure & UI rules in CODING_GUIDE.md.

After coding, print CHANGES SUMMARY + MANUAL STEPS (env keys, Firebase rules/indexes).

- IMPORTANT: The repo root is the folder containing package.json.
  All code must stay directly under that root. Do NOT create a second nested project folder.
  There must be exactly one /src folder at repo root.
