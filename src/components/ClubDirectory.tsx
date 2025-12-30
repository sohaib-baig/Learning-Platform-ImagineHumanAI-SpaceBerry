"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  collection,
  documentId,
  getDocs,
  limit as limitConstraint,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { ArrowRight, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { mapClubDoc } from "@/lib/club";
import type { Club } from "@/types/club";
import { ClubCard } from "./ClubCard";

const DEFAULT_INITIAL_LIMIT = 6;
const DEFAULT_LOAD_MORE_LIMIT = 12;

type FirestoreClubDoc = QueryDocumentSnapshot<DocumentData>;

interface ClubDirectoryProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  getActionHref?: (club: Club) => string;
  hostedClubIds?: string[];
  icon?: React.ReactNode;
  className?: string;
  initialLimit?: number;
  loadMoreLimit?: number;
  cardVariant?: "light" | "dark";
}

const mergeUniqueClubs = (existing: Club[], incoming: Club[]): Club[] => {
  if (incoming.length === 0) {
    return existing;
  }

  const merged = new Map(existing.map((club) => [club.id, club]));
  incoming.forEach((club) => merged.set(club.id, club));
  return Array.from(merged.values());
};

/**
 * ClubDirectory Component
 * Displays a paginated directory of clubs ordered by popularity.
 */
export function ClubDirectory({
  title = "Club directory",
  description = "Browse the most active spaces available right now.",
  actionLabel = "Explore club",
  getActionHref,
  hostedClubIds = [],
  icon,
  className = "",
  initialLimit = DEFAULT_INITIAL_LIMIT,
  loadMoreLimit = DEFAULT_LOAD_MORE_LIMIT,
  cardVariant = "dark",
}: ClubDirectoryProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<FirestoreClubDoc | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const isMountedRef = useRef(true);

  const hostedSet = useMemo(() => new Set(hostedClubIds), [hostedClubIds]);

  const fetchClubs = useCallback(
    async ({
      pageLimit,
      startAfterDoc,
      append,
      onComplete,
    }: {
      pageLimit: number;
      startAfterDoc?: FirestoreClubDoc | null;
      append: boolean;
      onComplete?: () => void;
    }) => {
      try {
        const clubsRef = collection(db, "clubs");
        const constraints: QueryConstraint[] = [
          orderBy("membersCount", "desc"),
          orderBy(documentId()),
          limitConstraint(pageLimit),
        ];

        if (startAfterDoc) {
          constraints.push(startAfter(startAfterDoc));
        }

        const snapshot = await getDocs(query(clubsRef, ...constraints));
        const mappedClubs = snapshot.docs.map(mapClubDoc);

        if (!isMountedRef.current) {
          return;
        }

        setClubs((prev) =>
          append ? mergeUniqueClubs(prev, mappedClubs) : mappedClubs
        );
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(snapshot.docs.length === pageLimit);
        setError(null);
      } catch (err) {
        console.error("Error loading clubs directory:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load club directory"
        );
      } finally {
        if (isMountedRef.current) {
          onComplete?.();
        }
      }
    },
    []
  );

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  useEffect(() => {
    let isSubscribed = true;

    setLoading(true);
    setHasMore(false);
    setLastDoc(null);
    setError(null);
    setClubs([]);

    fetchClubs({
      pageLimit: initialLimit,
      append: false,
      onComplete: () => {
        if (isSubscribed) {
          setLoading(false);
        }
      },
    });

    return () => {
      isSubscribed = false;
    };
  }, [fetchClubs, initialLimit]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) {
      return;
    }

    setLoadingMore(true);
    await fetchClubs({
      pageLimit: loadMoreLimit,
      startAfterDoc: lastDoc,
      append: true,
      onComplete: () => setLoadingMore(false),
    });
  };

  const headerIcon =
    icon || <Sparkles size={20} className="text-primary" aria-hidden="true" />;

  return (
    <section className={`animate-fadeIn space-y-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          {headerIcon}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
          {description && (
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && clubs.length === 0 ? (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-64 rounded-3xl bg-[#272b2f]/50 border border-white/[0.08] animate-pulse"
            />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#272b2f]/70 px-4 py-6 text-sm text-zinc-400">
          No clubs available yet. Check back soon.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="group rounded-3xl bg-[#272b2f]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl hover:bg-[#272b2f] transition-all hover:border-white/10 hover:shadow-2xl"
              >
                <ClubCard
                  club={club}
                  actionLabel={actionLabel}
                  actionHref={
                    getActionHref ? getActionHref(club) : undefined
                  }
                  variant={cardVariant}
                  isHost={hostedSet.has(club.id)}
                />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="group inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/15 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingMore ? "Loading..." : "See more"}
                <ArrowRight
                  size={14}
                  className={`transition-transform ${
                    loadingMore ? "opacity-50" : "group-hover:translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
