"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type {
  Club,
  ClubDoc,
  ClubMembership,
  ClubMembershipDoc,
  HostStatus,
  HostStatusDoc,
  UserDoc,
  UserRoles,
} from "@/types/club";

/**
 * Club Context Type
 */
export interface ClubContextType {
  clubId: string | null;
  clubData: Club | null;
  isHost: boolean;
  isMember: boolean;
  isTrialMember: boolean;
  hostStatus: HostStatus | null;
  hostEnabled: boolean;
  roles: UserRoles | null;
  membership: ClubMembership | null;
  canHostManage: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Club Context
 */
const ClubContext = createContext<ClubContextType | undefined>(undefined);

/**
 * Club Provider Props
 */
interface ClubProviderProps {
  children: ReactNode;
  slug: string; // club slug from URL
}

/**
 * Convert Firestore club doc to Club interface
 */
function convertClubDoc(id: string, data: ClubDoc): Club {
  const normalizedVideoUrl =
    typeof data.info.videoUrl === "string" ? data.info.videoUrl.trim() : "";
  const normalizedBadges =
    data.meta?.badges ?? {
      activeHost: false,
      communityBuilder: false,
      featuredByImagineHumans: false,
    };
  const info = {
    ...data.info,
    description: data.info.description ?? "",
    vision: data.info.vision ?? "",
    mission: data.info.mission ?? "",
    videoUrl: normalizedVideoUrl || undefined,
    benefits: Array.isArray(data.info.benefits) ? data.info.benefits : [],
    price: typeof data.info.price === "number" ? data.info.price : 0,
    currency: data.info.currency ?? "AUD",
    recommendedClubs: Array.isArray(data.info.recommendedClubs)
      ? data.info.recommendedClubs
      : [],
    reviews: data.info.reviews?.map((review) => ({
      ...review,
      createdAt:
        review.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })),
    priceChangedAt:
      data.info.priceChangedAt?.toDate?.()?.toISOString() ??
      (typeof data.info.priceChangedAt === "string"
        ? data.info.priceChangedAt
        : undefined),
  };

  return {
    id,
    info,
    hostId: data.hostId,
    membersCount: data.membersCount,
    pricingLocked: data.pricingLocked ?? false,
    meta: { badges: normalizedBadges },
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Club Provider Component
 */
export function ClubProvider({ children, slug }: ClubProviderProps) {
  const { user } = useAuth();
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubData, setClubData] = useState<Club | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isTrialMember, setIsTrialMember] = useState(false);
  const [hostStatus, setHostStatus] = useState<HostStatus | null>(null);
  const [roles, setRoles] = useState<UserRoles | null>(null);
  const [membership, setMembership] = useState<ClubMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [lastFetchedSlug, setLastFetchedSlug] = useState<string>("");

  const normalizeHostStatus = (
    status?: HostStatusDoc | null
  ): HostStatus | null => {
    if (!status) {
      return null;
    }

    return {
      enabled: status.enabled,
      reasonDisabled: status.reasonDisabled,
      lastReviewDate:
        status.lastReviewDate?.toDate?.().toISOString() ?? undefined,
    };
  };

  const normalizeMembership = (
    doc?: ClubMembershipDoc | null
  ): ClubMembership | null => {
    if (!doc) {
      return null;
    }

    return {
      status: doc.status,
      isTrialing: doc.isTrialing ?? false,
      trialEndsAt: doc.trialEndsAt?.toDate?.().toISOString() ?? null,
      stripeSubscriptionId: doc.stripeSubscriptionId ?? null,
      lastPaymentType: doc.lastPaymentType ?? null,
      lastPaymentAt: doc.lastPaymentAt?.toDate?.().toISOString() ?? null,
      consecutiveFailedPayments: doc.consecutiveFailedPayments ?? 0,
    };
  };

  const fetchClubData = useCallback(async () => {
    if (!slug) {
      setError("Club slug is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query clubs by slug
      const clubsRef = collection(db, "clubs");
      const q = query(clubsRef, where("info.slug", "==", slug));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError(`Club with slug "${slug}" not found`);
        setLoading(false);
        return;
      }

      // Get the first matching club
      const clubDocSnap = snapshot.docs[0];
      const clubDocData = clubDocSnap.data() as ClubDoc;
      const club = convertClubDoc(clubDocSnap.id, clubDocData);

      setClubId(clubDocSnap.id);
      setClubData(club);
      setLastFetchedSlug(slug); // Mark as fetched only after successful data retrieval

      // Check if user is host and member
      if (user?.uid) {
        setCurrentUid(user.uid);
        setRoles(null);
        setHostStatus(null);
        setMembership(null);
        setIsTrialMember(false);

        const userIsHost = club.hostId === user.uid;
        setIsHost(userIsHost);
        console.log(`[ClubContext] User ${user.uid} is host: ${userIsHost}`);

        // Check if user is member
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as UserDoc;
          const clubsJoined = userData.clubsJoined || [];
          setRoles(userData.roles ?? null);
          const normalizedStatus = normalizeHostStatus(userData.hostStatus);
          setHostStatus(normalizedStatus);
          const membershipEntry =
            userData.clubMemberships?.[clubDocSnap.id] ?? null;
          const normalizedMembership = normalizeMembership(membershipEntry);
          setMembership(normalizedMembership);
          const trialActive =
            normalizedMembership?.isTrialing === true &&
            (!normalizedMembership.trialEndsAt ||
              new Date(normalizedMembership.trialEndsAt) > new Date());
          setIsTrialMember(trialActive);
          const activeMember = normalizedMembership?.status === "active";
          const userIsMember = Boolean(
            userIsHost || activeMember || trialActive
          );
          setIsMember(userIsMember);
          console.log(
            `[ClubContext] User ${user.uid} membership state for ${clubDocSnap.id}:`,
            {
              activeMember,
              trialActive,
              userIsHost,
            }
          );
          console.log(`[ClubContext] User's clubsJoined:`, clubsJoined);
        } else {
          console.warn(
            `[ClubContext] User document ${user.uid} does not exist`
          );
          setIsMember(userIsHost);
          setIsTrialMember(false);
          setMembership(null);
          setRoles(null);
          setHostStatus(null);
        }
      } else if (!user && currentUid) {
        // User temporarily null during re-auth - don't clear membership status
        console.log(
          `[ClubContext] User temporarily null (previous UID: ${currentUid}), preserving state`
        );
      } else {
        // Genuinely no user
        console.log(`[ClubContext] No user authenticated`);
        setCurrentUid(null);
        setIsHost(false);
        setIsMember(false);
        setIsTrialMember(false);
        setMembership(null);
        setRoles(null);
        setHostStatus(null);
      }
    } catch (err) {
      console.error("Error fetching club data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch club data"
      );
    } finally {
      setLoading(false);
    }
  }, [slug, user?.uid, currentUid]);

  useEffect(() => {
    // CRITICAL: Only fetch when absolutely necessary to prevent infinite loops
    const slugChanged = slug !== lastFetchedSlug;
    const userChanged = user?.uid && user.uid !== currentUid;
    const needsInitialFetch = !clubData && !loading;

    const shouldFetch =
      slugChanged ||
      (needsInitialFetch && user?.uid) ||
      (userChanged && slug === lastFetchedSlug);

    if (shouldFetch) {
      const reason = slugChanged
        ? "slug changed"
        : userChanged
          ? "user changed"
          : "initial fetch";
      console.log("[ClubContext] Fetching club data", {
        slug,
        lastFetchedSlug,
        userUid: user?.uid,
        currentUid,
        reason,
      });
      fetchClubData();
    } else {
      console.log("[ClubContext] Skipping fetch", {
        slug,
        lastFetchedSlug,
        clubData: !!clubData,
        loading,
        userUid: user?.uid,
        currentUid,
      });
    }
  }, [slug, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const hostEnabled = hostStatus?.enabled ?? false;
  const canHostManage = isHost && hostEnabled;

  const value: ClubContextType = {
    clubId,
    clubData,
    isHost,
    isMember,
    isTrialMember,
    hostStatus,
    hostEnabled,
    roles,
    membership,
    canHostManage,
    loading,
    error,
    refetch: fetchClubData,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

/**
 * Hook to use Club Context
 */
export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error("useClub must be used within a ClubProvider");
  }
  return context;
}
