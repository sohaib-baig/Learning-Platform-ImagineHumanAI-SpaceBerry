Collections & Docs
users/{uid}
{
uid: string, // mirror auth.uid for convenience
displayName: string, // user-editable inside the app
googleDisplayName?: string, // raw name as provided by Google
email: string,
photoURL?: string,
emailVerified: boolean,
provider: "google" | "password",
roles: string[], // e.g., ["student"] or ["admin"]
welcomeEmailSent?: boolean, // set true after sending welcome email
preferences?: Record<string, unknown>,
createdAt: Timestamp, // set on first sign-in
updatedAt: Timestamp, // updated on subsequent sign-ins/profile edits
lastLoginAt: Timestamp // updated on every sign-in
}
Creation / Upsert (on Google sign-in)
// lib/auth-profile.ts
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function upsertUserProfile(u: {
uid: string;
displayName: string | null;
email: string | null;
provider: "google" | "password";
googleDisplayName?: string | null;
photoURL?: string | null;
emailVerified?: boolean;
}): Promise<boolean> {
const ref = doc(db, "users", u.uid);
const snap = await getDoc(ref);
const displayName = u.displayName?.trim() || "Friend";
const email = u.email?.trim() || "";
if (!snap.exists()) {
await setDoc(ref, {
uid: u.uid,
displayName,
googleDisplayName: u.provider === "google" ? (u.googleDisplayName || displayName) : undefined,
email,
photoURL: u.photoURL ?? undefined,
emailVerified: !!u.emailVerified,
provider: u.provider,
roles: ["student"],
createdAt: serverTimestamp(),
updatedAt: serverTimestamp(),
lastLoginAt: serverTimestamp(),
welcomeEmailSent: false,
});
return true;
}
await setDoc(
ref,
{
email,
photoURL: u.photoURL ?? undefined,
emailVerified: !!u.emailVerified,
provider: u.provider,
googleDisplayName:
u.provider === "google" ? (u.googleDisplayName || displayName) : undefined,
updatedAt: serverTimestamp(),
lastLoginAt: serverTimestamp(),
},
{ merge: true },
);
return false;
}

courses/{courseId}
{
title: string, // "AI Foundations"
slug: string, // "ai-foundations"
summary: string,
category: "AI" | "Tech" | "Biz" | "Other",
heroImage?: string, // storage URL
isPublished: boolean,
createdBy: string, // uid
createdAt: Timestamp,
updatedAt: Timestamp
}

courses/{courseId}/modules/{moduleId}
{
title: string, // "Getting Started"
index: number // 1-based order
}

courses/{courseId}/modules/{moduleId}/lessons/{lessonId}
{
title: string, // "What is AI?"
index: number,
muxPlaybackId: string, // Mux playback id (HLS)
durationSec?: number,
transcriptHTML?: string, // sanitized HTML
resources?: { label: string, url: string }[],
isFreePreview?: boolean // default false (MVP all accessible)
}

progress/{progressId} (flat collection)

Key: progressId = ${userId}_${courseId}\_${lessonId}

{
userId: string,
courseId: string,
moduleId: string,
lessonId: string,
watchedSec: number,
completed: boolean,
updatedAt: Timestamp
}

downloads/{downloadId}
{
title: string,
description?: string,
url: string, // Firebase Storage public URL (or signed)
courseId?: string, // if undefined → global resource
createdBy: string, // uid
createdAt: Timestamp
}

clubs/{clubId}/journeys/{journeyId}
{
clubId: string, // parent club id for collectionGroup queries
title: string,
slug: string,
layer: Layer,
emotionShift: string,
summary: string,
description: string,
order: number,
isPublished: boolean,
thumbnailUrl?: string,
estimatedMinutes?: number,
mapNodeIds?: string[],
createdAt: Timestamp,
updatedAt: Timestamp
}

clubs/{clubId}/journeys/{journeyId}/lessons/{lessonId}
{
title: string,
order: number,
durationMinutes?: number,
videoUrl?: string,
contentType: "video" | "article" | "exercise",
contentBlocks?: Array<{ type: "md" | "tip" | "exercise"; value: string }>,
isPublished: boolean,
mapNodeRefs?: Array<{ nodeId: string; weight?: number }>,
createdAt: Timestamp,
updatedAt: Timestamp
}

announcements/notice (singleton doc)
{
contentHTML: string, // minimal rich text
updatedAt: Timestamp,
updatedBy: string // uid
}

articles/today (singleton doc)
{
title: string,
snippetHTML: string,
sourceUrl?: string,
updatedAt: Timestamp,
updatedBy: string // uid
}

### Default Club

The ImagineHumans Academy club is seeded using `DEFAULT_ACADEMY_CLUB_ID = "oCuLKtZNA9mlC949ZHmW"`. Scripts (`scripts/migrateToClubs.ts`, `scripts/seed.ts`) populate this club and set `clubId` on each journey document for backwards compatibility.

Firestore Indexes (Composite)

Create or sync via `firebase/firestore.indexes.json`:

- courses: `(isPublished ASC, category ASC, updatedAt DESC)`
- progress: `(userId ASC, courseId ASC, lessonId ASC)`; `(userId ASC, updatedAt DESC)`
- downloads: `(courseId ASC, createdAt DESC)`
- journeys: `(order ASC, createdAt DESC)`
- journeys: `(clubId ASC, isPublished ASC, order ASC)`
- journeys: `(clubId ASC, isPublished ASC, layer ASC, order ASC)`
- journeys: `(isPublished ASC, order ASC)`
- journeys: `(isPublished ASC, layer ASC, order ASC)`
- lessons: `(order ASC)`; `(isPublished ASC, order ASC)`
- payments: `(createdAt DESC)`, `(clubId ASC, createdAt DESC)`, `(uid ASC, createdAt DESC)`, `(type ASC, createdAt DESC)`

Firestore Security Rules (MVP)
(see `firebase/firestore.rules` for the full policy)

- `isHostEnabled(uid)` and `isHostOf(clubId)` helpers ensure only active hosts can create/update club resources.
- Members (`isMember(clubId)`) can read club journeys/downloads; hosts can write.
- Admin-only collections (courses, downloads, announcements, articles) remain unchanged from the original beta.

Admin custom claims: set admin: true via Firebase Admin SDK (one-off CLI script) and it will appear in request.auth.token.admin.
