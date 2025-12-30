"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  documentId,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Club, ClubDoc } from "@/types/club";
import { useAuth } from "@/hooks/useAuth";

interface UseUserClubsResult {
  clubs: Club[];
  currentClub: Club | null;
  loading: boolean;
}

export function useUserClubs(
  currentClubId?: string | null
): UseUserClubsResult {
  const { user } = useAuth();
  const pathname = usePathname();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserClubs = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setClubs([]);
          setCurrentClub(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          if (isMounted) {
            setClubs([]);
            setCurrentClub(null);
          }
          return;
        }

        const userData = userDocSnap.data();
        const clubsJoined = Array.isArray(userData?.clubsJoined)
          ? (userData?.clubsJoined as string[])
          : [];
        const clubsHosted = Array.isArray(userData?.clubsHosted)
          ? (userData?.clubsHosted as string[])
          : [];
        const allClubIds = Array.from(
          new Set<string>([...clubsJoined, ...clubsHosted])
        );

        if (allClubIds.length === 0) {
          if (isMounted) {
            setClubs([]);
            setCurrentClub(null);
          }
          return;
        }

        const clubsRef = collection(db, "clubs");
        const q = query(
          clubsRef,
          where(documentId(), "in", allClubIds.slice(0, 10))
        );
        const snapshot = await getDocs(q);

        const fetchedClubs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as ClubDoc;
          const normalizedVideoUrl =
            typeof data.info.videoUrl === "string"
              ? data.info.videoUrl.trim()
              : "";
          const badges =
            data.meta?.badges ?? {
              activeHost: false,
              communityBuilder: false,
              featuredByImagineHumans: false,
            };
          return {
            id: docSnap.id,
            info: {
              ...data.info,
              description: data.info.description ?? "",
              videoUrl: normalizedVideoUrl || undefined,
              reviews: data.info.reviews?.map((review) => ({
                ...review,
                createdAt:
                  review.createdAt?.toDate?.()?.toISOString() ||
                  new Date().toISOString(),
              })),
            },
            hostId: data.hostId,
            membersCount: data.membersCount,
            meta: { badges },
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            updatedAt:
              data.updatedAt?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
          } as Club;
        });

        if (!isMounted) {
          return;
        }

        setClubs(fetchedClubs);

        let resolved: Club | null = null;
        if (currentClubId) {
          resolved =
            fetchedClubs.find((club) => club.id === currentClubId) ?? null;
        } else if (pathname?.startsWith("/club/")) {
          const slugMatch = pathname.match(/^\/club\/([^/]+)/);
          if (slugMatch) {
            resolved =
              fetchedClubs.find((club) => club.info.slug === slugMatch[1]) ??
              null;
          }
        }

        setCurrentClub(resolved);
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching user clubs:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchUserClubs();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, currentClubId, pathname]);

  return { clubs, currentClub, loading };
}
