import type { firestore } from "firebase-admin";
import type { ClubDownload } from "@/types/club";

function timestampToIso(value: unknown, fallbackIso: string): string {
  if (value && typeof value === "object") {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      try {
        return candidate.toDate().toISOString();
      } catch {
        // ignore conversion errors
      }
    }
  }

  if (typeof value === "string") {
    return value;
  }

  return fallbackIso;
}

export function snapshotToClubDownload(
  snapshot: firestore.DocumentSnapshot<firestore.DocumentData>,
  fallbackIso: string
): ClubDownload {
  const data = snapshot.data() ?? {};

  const title =
    typeof data.title === "string" && data.title.trim().length > 0
      ? data.title
      : "Untitled download";

  const description =
    typeof data.description === "string" && data.description.trim().length > 0
      ? data.description
      : undefined;

  const url = typeof data.url === "string" ? data.url : "";
  const price = typeof data.price === "number" ? data.price : undefined;
  const currency =
    typeof data.currency === "string" && data.currency.trim().length > 0
      ? data.currency
      : undefined;
  const isFree =
    typeof data.isFree === "boolean"
      ? data.isFree
      : !(typeof price === "number" && price > 0);

  const createdAt = timestampToIso(data.createdAt, fallbackIso);
  const updatedAt = timestampToIso(data.updatedAt, fallbackIso);

  const createdBy =
    typeof data.createdBy === "string" && data.createdBy.trim().length > 0
      ? data.createdBy
      : undefined;

  return {
    id: snapshot.id,
    title,
    description,
    url,
    price,
    currency,
    isFree,
    createdAt,
    updatedAt,
    createdBy,
  };
}

