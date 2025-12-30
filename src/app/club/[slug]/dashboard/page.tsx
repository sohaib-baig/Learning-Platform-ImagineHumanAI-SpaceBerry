"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
  usePathname,
} from "next/navigation";
import Image from "next/image";
import {
  collection,
  query,
  getDocs,
  limit,
  orderBy,
  startAt,
  endAt,
  where,
  documentId,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { ClubProvider, useClub } from "@/context/ClubContext";
import type { ClubJourney, ClubDownload, Club, ClubDoc } from "@/types/club";
import { HostGate } from "@/components/host/HostGate";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download as DownloadIcon,
  LayoutGrid,
  LogOut,
  Map as MapIcon,
  Menu,
  Plus,
  Settings,
  Target,
  TrendingUp,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { JourneyEditor } from "@/components/host/JourneyEditor";
import { JourneyList } from "@/components/host/JourneyList";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LessonManager } from "@/components/host/LessonManager";
import { DownloadEditor } from "@/components/host/DownloadEditor";
import { HostDownloadCard } from "@/components/host/DownloadCard";
import { DownloadDetailsDialog } from "@/components/host/DownloadDetailsDialog";
import { getStripe } from "@/lib/stripe";
import { signOutUser } from "@/lib/auth-client";
import { trackDownload } from "@/lib/db/downloads";
import { EarningsAndGrowthCard } from "./analytics";
import { useAuth } from "@/hooks/useAuth";
import { useUserClubs } from "@/hooks/useUserClubs";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { JourneyModal } from "@/components/journey/JourneyModal";
import { CalmLoadingScreen } from "@/components/CalmLoadingScreen";

type JourneyEditorState =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      journey: ClubJourney;
    };

type DownloadEditorState =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      download: ClubDownload;
    };

type TabType = "home" | "earnings" | "journeys" | "downloads" | "recommended";

interface WidgetCardProps {
  children: React.ReactNode;
  className?: string;
  tone?: "dark" | "light";
}

/**
 * Club Dashboard Content Component
 */
function ClubDashboardContent() {
  const {
    clubId,
    clubData,
    isHost,
    isMember,
    membership,
    loading,
    error,
    refetch,
  } = useClub();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [journeys, setJourneys] = useState<ClubJourney[]>([]);
  const [journeyLessonCounts, setJourneyLessonCounts] = useState<
    Record<string, number>
  >({});
  const [openJourneyId, setOpenJourneyId] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<ClubDownload[]>([]);
  const [recommendedClubs, setRecommendedClubs] = useState<Club[]>([]);
  const [recommendedModalOpen, setRecommendedModalOpen] = useState(false);
  const [recommendedSearch, setRecommendedSearch] = useState("");
  const [recommendedActionError, setRecommendedActionError] = useState<
    string | null
  >(null);
  const [recommendedActionBusy, setRecommendedActionBusy] = useState(false);
  const [recommendedSearchLoading, setRecommendedSearchLoading] =
    useState(false);
  const [recommendedSearchResults, setRecommendedSearchResults] = useState<
    Club[]
  >([]);
  const [recommendedSelected, setRecommendedSelected] = useState<Club | null>(
    null
  );
  const [loadingContent, setLoadingContent] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [membershipChecked, setMembershipChecked] = useState(false);
  const [journeyEditorState, setJourneyEditorState] =
    useState<JourneyEditorState | null>(null);
  const [downloadEditorState, setDownloadEditorState] =
    useState<DownloadEditorState | null>(null);
  const [activeDownload, setActiveDownload] = useState<ClubDownload | null>(
    null
  );
  const [downloadActionProcessing, setDownloadActionProcessing] =
    useState(false);
  const [downloadActionError, setDownloadActionError] = useState<string | null>(
    null
  );
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveClubLoading, setLeaveClubLoading] = useState(false);
  const [leaveClubError, setLeaveClubError] = useState<string | null>(null);
  const [journeyDeleteTarget, setJourneyDeleteTarget] =
    useState<ClubJourney | null>(null);
  const [journeyDeleteLoading, setJourneyDeleteLoading] = useState(false);
  const [journeyActionError, setJourneyActionError] = useState<string | null>(
    null
  );
  const [managedJourney, setManagedJourney] = useState<ClubJourney | null>(
    null
  );
  const [clubMenuOpen, setClubMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSettingsItem, setActiveSettingsItem] = useState<
    "none" | "editClub"
  >("none");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoUpdatedAt, setProfilePhotoUpdatedAt] = useState<
    number | null
  >(null);
  const refreshClubData = useCallback(() => refetch(), [refetch]);
  const clubMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const isPaymentRequired = membership?.status === "payment_required";
  const navItems: Array<{ key: TabType; label: string; icon: LucideIcon }> =
    useMemo(() => {
      const items: Array<{ key: TabType; label: string; icon: LucideIcon }> = [
        { key: "home", label: "Community", icon: LayoutGrid },
        { key: "journeys", label: "Journeys", icon: MapIcon },
        { key: "downloads", label: "Digital Products", icon: DownloadIcon },
        { key: "recommended", label: "Recommended Clubs", icon: UsersIcon },
      ];

      if (isHost) {
        items.splice(1, 0, {
          key: "earnings",
          label: "Earnings & Growth",
          icon: TrendingUp,
        });
      }

      return items;
    }, [isHost]);
  const currentRecommendedIds = useMemo(() => {
    const base = clubData?.info.recommendedClubs ?? [];
    const fromState = recommendedClubs.map((club) => club.id);
    return Array.from(new Set([...base, ...fromState]));
  }, [clubData?.info.recommendedClubs, recommendedClubs]);
  const {
    clubs: userClubs,
    currentClub: userCurrentClub,
    loading: userClubsLoading,
  } = useUserClubs(clubId);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      if (!user?.uid) {
        setProfilePhotoUrl(null);
        setProfilePhotoUpdatedAt(null);
        return;
      }
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists() || cancelled) return;
        const data = snap.data() as {
          photoURL?: string;
          photoUpdatedAt?: { toDate?: () => Date } | Date | null;
        };
        if (data.photoURL) {
          setProfilePhotoUrl(data.photoURL);
        }
        const updated =
          typeof data.photoUpdatedAt === "object" &&
          data.photoUpdatedAt !== null &&
          "toDate" in data.photoUpdatedAt
            ? (data.photoUpdatedAt as { toDate: () => Date }).toDate().getTime()
            : data.photoUpdatedAt instanceof Date
              ? data.photoUpdatedAt.getTime()
              : null;
        setProfilePhotoUpdatedAt(updated ?? null);
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);
  const activeNavLabel =
    navItems.find((item) => item.key === activeTab)?.label ?? "Community";
  const resolvedClubName =
    userCurrentClub?.info.name ?? clubData?.info.name ?? "Your Club";
  const resolvedMemberCount =
    userCurrentClub?.membersCount ?? clubData?.membersCount ?? 0;
  const memberCountLabel =
    resolvedMemberCount > 0
      ? `${resolvedMemberCount} member${resolvedMemberCount === 1 ? "" : "s"}`
      : "Members";
  const clubLogoUrl = clubData?.info.profileImageUrl ?? null;
  const resolvedPhotoUrl = useMemo(() => {
    const url = profilePhotoUrl ?? user?.photoURL ?? null;
    if (!url) return null;
    const buster = profilePhotoUpdatedAt;
    if (!buster) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${buster}`;
  }, [profilePhotoUpdatedAt, profilePhotoUrl, user?.photoURL]);
  const userInitial =
    user?.displayName?.charAt(0)?.toUpperCase() ??
    user?.email?.charAt(0)?.toUpperCase() ??
    clubData?.info.name?.charAt(0)?.toUpperCase() ??
    "?";
  const WidgetCard = ({
    children,
    className = "",
    tone = "dark",
  }: WidgetCardProps) => {
    const toneClasses =
      tone === "light"
        ? "border-white bg-white text-slate-900"
        : "border-white/10 bg-[#272b2f]/80 text-zinc-100";
    return (
      <section
        className={`rounded-3xl backdrop-blur-xl shadow-xl ${toneClasses} ${className}`}
      >
        {children}
      </section>
    );
  };

  const renderCommunityWidget = () => {
    if (authLoading) {
      return (
        <div className="rounded-3xl border border-white/10 bg-[#272b2f]/70 p-6 shadow-2xl">
          <div className="flex min-h-[160px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 text-center text-sm text-amber-200 shadow-2xl">
          Sign in to participate in your community feed.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <CommunityFeed
          clubId={clubId!}
          currentUserId={user.uid}
          className="space-y-8"
        />
      </div>
    );
  };

  const renderClubOverviewWidget = () => (
    <WidgetCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-white">
                {clubData!.info.name}
              </h4>
              {isHost && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center gap-1">
                  <Target size={10} />
                  Host
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="text-zinc-300 text-lg leading-relaxed font-light">
        {clubData!.info.description ||
          "Share updates, celebrate wins, and keep your members inspired."}
      </p>
      {isHost && (
        <div className="mt-6 space-y-2 text-sm text-zinc-400">
          <p>
            <span className="font-semibold text-white">Member count:</span>{" "}
            {memberCountLabel}
          </p>
          <p className="pb-2">
            <span className="font-semibold text-white">Price:</span>{" "}
            {clubData!.info.price
              ? `${clubData!.info.currency ?? "AUD"} ${clubData!.info.price}`
              : "Not set"}
          </p>
        </div>
      )}
      <div className="space-y-6 border-t border-white/10 pt-6 text-zinc-300">
        {clubData!.info.vision && (
          <div>
            <h3 className="text-lg font-semibold text-white">Our Vision</h3>
            <p className="mt-2 leading-relaxed">{clubData!.info.vision}</p>
          </div>
        )}
        {clubData!.info.mission && (
          <div>
            <h3 className="text-lg font-semibold text-white">Our Mission</h3>
            <p className="mt-2 leading-relaxed">{clubData!.info.mission}</p>
          </div>
        )}
        {clubData!.info.benefits && clubData!.info.benefits.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white">
              Member Benefits
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {clubData!.info.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </WidgetCard>
  );

  const renderEarningsWidget = () => {
    if (!clubId) {
      return null;
    }
    return (
      <WidgetCard className="p-6 bg-gradient-to-br from-[#2b3036]/90 via-[#202428]/90 to-[#15181c]/90">
        <EarningsAndGrowthCard
          clubId={clubId}
          fallbackCurrency={clubData!.info.currency ?? "AUD"}
        />
      </WidgetCard>
    );
  };

  const isHomeLikeView =
    activeTab === "home" || (activeTab === "earnings" && isHost);
  const renderHomeGrid = () => {
    if (activeTab === "earnings" && isHost) {
      const earningsWidget = renderEarningsWidget();
      return earningsWidget ? (
        <div className="space-y-6">{earningsWidget}</div>
      ) : null;
    }

    const communityWidget = renderCommunityWidget();
    if (!communityWidget) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">{communityWidget}</div>
        <div className="space-y-6 xl:col-span-1">
          {renderClubOverviewWidget()}
        </div>
      </div>
    );
  };
  const closeMenus = useCallback(() => {
    setClubMenuOpen(false);
    setUserMenuOpen(false);
    setMobileNavOpen(false);
  }, []);
  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      closeMenus();
      window.location.href = "/";
    }
  }, [closeMenus]);
  const handleClubSelect = useCallback(
    (targetClub: Club) => {
      if (!targetClub.info.slug) {
        return;
      }
      setClubMenuOpen(false);
      router.push(`/club/${targetClub.info.slug}/dashboard`);
    },
    [router]
  );
  const selectedClubSlug =
    userCurrentClub?.info.slug ?? clubData?.info.slug ?? null;
  const handleClubTrigger = useCallback(() => {
    if (!user) {
      router.push("/signin");
      return;
    }
    setClubMenuOpen((prev) => !prev);
  }, [router, user]);
  const handleUserMenuToggle = useCallback(() => {
    if (!user) {
      router.push("/signin");
      return;
    }
    setUserMenuOpen((prev) => !prev);
  }, [router, user]);
  const handleProfileNavigate = useCallback(
    (path: string) => {
      closeMenus();
      router.push(path);
    },
    [closeMenus, router]
  );
  const handleViewAllClubs = useCallback(() => {
    closeMenus();
    router.push("/your-clubs");
  }, [closeMenus, router]);
  const handleEditClub = useCallback(() => {
    if (!clubData?.info.slug || !isHost) {
      return;
    }
    setActiveSettingsItem("editClub");
    closeMenus();
    router.push(`/club/${clubData.info.slug}/editor`);
  }, [closeMenus, clubData?.info.slug, isHost, router, setActiveSettingsItem]);
  const isClubActive = useCallback(
    (targetClub: Club) => {
      if (targetClub.id === userCurrentClub?.id) {
        return true;
      }
      if (selectedClubSlug && targetClub.info.slug === selectedClubSlug) {
        return true;
      }
      return false;
    },
    [selectedClubSlug, userCurrentClub?.id]
  );

  const reorderJourneysOnServer = useCallback(
    async (orderedJourneyIds: string[]) => {
      if (!clubId || orderedJourneyIds.length === 0) {
        return;
      }

      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;

      if (!currentUser) {
        throw new Error("User is not authenticated.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/clubs/${clubId}/journeys/reorder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ journeyIds: orderedJourneyIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to reorder journeys.");
      }
    },
    [clubId]
  );

  const openCreateJourney = () => {
    setJourneyEditorState({ mode: "create" });
  };

  const handleJourneyEdit = (journeyToEdit: ClubJourney) => {
    setJourneyEditorState({
      mode: "edit",
      journey: journeyToEdit,
    });
  };

  const handleJourneyDeleteClick = (journeyToDelete: ClubJourney) => {
    setJourneyDeleteTarget(journeyToDelete);
    setJourneyActionError(null);
  };

  const handleJourneyDeleteConfirm = async () => {
    if (!clubId || !journeyDeleteTarget) {
      return;
    }

    try {
      setJourneyDeleteLoading(true);
      setJourneyActionError(null);

      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User is not authenticated.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `/api/clubs/${clubId}/journeys/${journeyDeleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to delete journey.");
      }

      const remainingJourneys = journeys
        .filter((journeyItem) => journeyItem.id !== journeyDeleteTarget.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const reindexedJourneys = remainingJourneys.map((journeyItem, index) => ({
        ...journeyItem,
        order: index,
      }));

      setJourneys(reindexedJourneys);
      setManagedJourney((current) =>
        current?.id === journeyDeleteTarget.id ? null : current
      );
      setJourneyDeleteTarget(null);

      if (reindexedJourneys.length > 0) {
        try {
          await reorderJourneysOnServer(
            reindexedJourneys.map((journeyItem) => journeyItem.id)
          );
        } catch (error) {
          console.error("[Dashboard] Persist journey order error:", error);
          setJourneyActionError(
            error instanceof Error
              ? error.message
              : "Journey deleted, but failed to update order."
          );
        }
      }
    } catch (err) {
      console.error("[Dashboard] Delete journey error:", err);
      setJourneyActionError(
        err instanceof Error ? err.message : "Failed to delete journey."
      );
    } finally {
      setJourneyDeleteLoading(false);
    }
  };

  const handleJourneyReorder = async (orderedJourneyIds: string[]) => {
    if (orderedJourneyIds.length === 0) {
      return;
    }

    try {
      setJourneyActionError(null);
      await reorderJourneysOnServer(orderedJourneyIds);

      setJourneys((prevJourneys) => {
        const journeyMap = new Map(
          prevJourneys.map((journeyItem) => [journeyItem.id, journeyItem])
        );
        const processedIds = new Set<string>();
        const reordered: ClubJourney[] = [];

        orderedJourneyIds.forEach((journeyId, index) => {
          const journeyItem = journeyMap.get(journeyId);
          if (!journeyItem) {
            return;
          }
          processedIds.add(journeyId);
          reordered.push({
            ...journeyItem,
            order: index,
          });
        });

        const remaining = prevJourneys.filter(
          (journeyItem) => !processedIds.has(journeyItem.id)
        );

        return [...reordered, ...remaining];
      });
    } catch (err) {
      console.error("[Dashboard] Reorder journeys error:", err);
      setJourneyActionError(
        err instanceof Error ? err.message : "Failed to reorder journeys."
      );
    }
  };

  const handleManageLessons = (journeyToManage: ClubJourney) => {
    setManagedJourney(journeyToManage);
  };

  const openCreateDownload = () => {
    setDownloadEditorState({ mode: "create" });
  };

  const openDownloadDetails = (downloadToView: ClubDownload) => {
    setActiveDownload(downloadToView);
    setDownloadActionError(null);
  };

  const closeDownloadDetails = () => {
    setActiveDownload(null);
    setDownloadActionError(null);
  };

  const handleDownloadEdit = (downloadToEdit: ClubDownload) => {
    if (!isHost) {
      return;
    }
    closeDownloadDetails();
    setDownloadEditorState({ mode: "edit", download: downloadToEdit });
  };

  const handleDownloadAction = async (downloadToProcess: ClubDownload) => {
    if (!clubId) {
      return;
    }

    try {
      setDownloadActionProcessing(true);
      setDownloadActionError(null);

      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;

      if (!currentUser) {
        throw new Error("Please sign in to continue.");
      }

      const hasDirectAccess =
        isHost ||
        downloadToProcess.isFree ||
        downloadToProcess.hasPurchased ||
        (downloadToProcess.price ?? 0) === 0;

      if (hasDirectAccess) {
        trackDownload(downloadToProcess.id, downloadToProcess.title);
        if (typeof window !== "undefined") {
          window.open(downloadToProcess.url, "_blank", "noopener,noreferrer");
        }
        closeDownloadDetails();
        return;
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `/api/clubs/${clubId}/downloads/${downloadToProcess.id}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to start checkout.");
      }

      const { sessionId } = (await response.json()) as { sessionId: string };

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error("Stripe is not available. Please try again later.");
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("[Dashboard] Download action error:", err);
      setDownloadActionError(
        err instanceof Error ? err.message : "Unable to process download."
      );
    } finally {
      setDownloadActionProcessing(false);
    }
  };

  const closeJourneyEditor = () => {
    setJourneyEditorState(null);
  };

  const closeDownloadEditor = () => {
    setDownloadEditorState(null);
  };

  const handleDownloadSaved = (updatedDownload: ClubDownload) => {
    const nowIso = new Date().toISOString();
    const downloadWithAccess: ClubDownload = {
      ...updatedDownload,
      hasPurchased: true,
      purchasedAt: updatedDownload.purchasedAt ?? nowIso,
    };

    setDownloads((prevDownloads) => {
      const existingIndex = prevDownloads.findIndex(
        (downloadItem) => downloadItem.id === updatedDownload.id
      );

      if (existingIndex === -1) {
        return [...prevDownloads, downloadWithAccess].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      const next = [...prevDownloads];
      next[existingIndex] = {
        ...next[existingIndex],
        ...downloadWithAccess,
      };

      return next.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const openRecommendedModal = () => {
    setRecommendedActionError(null);
    setRecommendedSearch("");
    setRecommendedSearchResults([]);
    setRecommendedSelected(null);
    setRecommendedModalOpen(true);
  };

  const closeRecommendedModal = () => {
    if (recommendedActionBusy) {
      return;
    }
    setRecommendedModalOpen(false);
    setRecommendedSearch("");
    setRecommendedSearchResults([]);
    setRecommendedSelected(null);
    setRecommendedActionError(null);
  };

  useEffect(() => {
    if (!recommendedModalOpen) {
      return;
    }

    const term = recommendedSearch.trim();

    if (term === "") {
      setRecommendedSearchResults([]);
      setRecommendedSelected(null);
      setRecommendedSearchLoading(false);
      return;
    }

    let cancelled = false;
    setRecommendedActionError(null);
    setRecommendedSearchLoading(true);

    const timer = setTimeout(() => {
      const fetchResults = async () => {
        try {
          const clubsRef = collection(db, "clubs");
          const lowerTerm = term.toLowerCase();
          const upperTerm = term.toUpperCase();
          const capitalized =
            term.length > 0
              ? `${term.charAt(0).toUpperCase()}${term.slice(1)}`
              : term;

          const queries = [
            query(
              clubsRef,
              orderBy("info.name"),
              startAt(lowerTerm),
              endAt(`${lowerTerm}\uf8ff`),
              limit(10)
            ),
            query(
              clubsRef,
              orderBy("info.name"),
              startAt(upperTerm),
              endAt(`${upperTerm}\uf8ff`),
              limit(10)
            ),
          ];

          if (
            capitalized !== lowerTerm &&
            capitalized !== upperTerm &&
            capitalized.trim() !== ""
          ) {
            queries.push(
              query(
                clubsRef,
                orderBy("info.name"),
                startAt(capitalized),
                endAt(`${capitalized}\uf8ff`),
                limit(10)
              )
            );
          }

          const snapshots = await Promise.all(
            queries.map((q) => getDocs(q))
          );

          if (cancelled) {
            return;
          }

          const docMap = new Map<string, ClubDoc>();
          snapshots.forEach((snap) => {
            snap.docs.forEach((docSnap) => {
              if (!docMap.has(docSnap.id)) {
                docMap.set(docSnap.id, docSnap.data() as ClubDoc);
              }
            });
          });

          const results = Array.from(docMap.entries()).map(([id, data]) => {
            const createdAt =
              data.createdAt?.toDate?.()?.toISOString() ||
              new Date().toISOString();
            const updatedAt =
              data.updatedAt?.toDate?.()?.toISOString() ||
              new Date().toISOString();
            const normalizedVideoUrl =
              typeof data.info.videoUrl === "string"
                ? data.info.videoUrl.trim()
                : "";
            const reviews =
              data.info.reviews?.map((review) => ({
                ...review,
                createdAt:
                  review.createdAt?.toDate?.()?.toISOString() ||
                  new Date().toISOString(),
              })) ?? [];

            return {
              id,
              info: {
                ...data.info,
                description: data.info.description ?? "",
                videoUrl: normalizedVideoUrl || undefined,
                reviews,
              },
              hostId: data.hostId,
              membersCount: data.membersCount,
              createdAt,
              updatedAt,
            } as Club;
          });

          const filtered = results
            .filter(
              (club) =>
                club.id !== clubId && !currentRecommendedIds.includes(club.id)
            )
            .filter((club) =>
              (club.info.name ?? "").toLowerCase().startsWith(lowerTerm)
            )
            .slice(0, 8);

          setRecommendedSearchResults(filtered);
          setRecommendedSelected((prev) => {
            if (prev && filtered.some((club) => club.id === prev.id)) {
              return prev;
            }
            return filtered[0] ?? null;
          });
        } catch (err) {
          if (!cancelled) {
            console.error("[Dashboard] Recommended search error:", err);
            setRecommendedActionError(
              "We couldn't search for clubs right now. Please try again."
            );
          }
        } finally {
          if (!cancelled) {
            setRecommendedSearchLoading(false);
          }
        }
      };

      void fetchResults();
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    recommendedSearch,
    recommendedModalOpen,
    clubId,
    currentRecommendedIds,
  ]);

  const handleRecommendedAdd = async () => {
    if (!clubId || !clubData) {
      return;
    }

    if (!isHost) {
      setRecommendedActionError("Only hosts can add recommendations.");
      return;
    }

    setRecommendedActionError(null);
    if (!recommendedSelected) {
      setRecommendedActionError("Choose a club from the list first.");
      return;
    }

    if (!recommendedSelected.info.name) {
      setRecommendedActionError("That club is missing a name.");
      return;
    }

    if (currentRecommendedIds.length >= 10) {
      setRecommendedActionError("You can recommend up to ten clubs.");
      return;
    }

    setRecommendedActionBusy(true);

    try {
      if (recommendedSelected.id === clubId) {
        setRecommendedActionError("You can't recommend your own club.");
        return;
      }

      if (currentRecommendedIds.includes(recommendedSelected.id)) {
        setRecommendedActionError("That club is already recommended.");
        return;
      }

      const nextRecommendedIds = [
        ...currentRecommendedIds,
        recommendedSelected.id,
      ].slice(0, 10);

      const payload = {
        name: clubData.info.name ?? "",
        description: clubData.info.description ?? "",
        mission: clubData.info.mission ?? "",
        vision: clubData.info.vision ?? "",
        benefits: clubData.info.benefits ?? [],
        price:
          typeof clubData.info.price === "number" ? clubData.info.price : 0,
        currency: clubData.info.currency ?? "AUD",
        recommendedClubs: nextRecommendedIds,
      };

      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;

      if (!currentUser) {
        throw new Error("Please sign in to manage recommendations.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/clubs/${clubId}/info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.error || "We could not add that recommendation right now.";
        throw new Error(message);
      }

      setRecommendedClubs((prev) => {
        if (prev.some((club) => club.id === recommendedSelected.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            ...recommendedSelected,
          },
        ];
      });

      setRecommendedSearch("");
      setRecommendedSearchResults([]);
      setRecommendedSelected(null);
      setRecommendedModalOpen(false);
      await refetch();
    } catch (err) {
      console.error("[Dashboard] Add recommended club error:", err);
      setRecommendedActionError(
        err instanceof Error
          ? err.message
          : "We could not add that recommendation."
      );
    } finally {
      setRecommendedActionBusy(false);
    }
  };

  const openLeaveClubDialog = () => {
    setLeaveClubError(null);
    setLeaveDialogOpen(true);
  };

  const handleLeaveClub = async () => {
    if (!clubId || !clubData) {
      return;
    }

    try {
      setLeaveClubLoading(true);
      setLeaveClubError(null);

      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;

      if (!currentUser) {
        throw new Error("Please sign in to continue.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/clubs/${clubId}/membership/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to leave this club.");
      }

      setLeaveDialogOpen(false);
      await refetch();
      router.push(`/club/${clubData.info.slug}/overview`);
    } catch (err) {
      console.error("[Dashboard] Leave club error:", err);
      setLeaveClubError(
        err instanceof Error ? err.message : "Failed to leave this club."
      );
    } finally {
      setLeaveClubLoading(false);
    }
  };

  const handleJourneySaved = (updatedJourney: ClubJourney) => {
    setJourneys((prevJourneys) => {
      const existingIndex = prevJourneys.findIndex(
        (journeyItem) => journeyItem.id === updatedJourney.id
      );

      if (existingIndex === -1) {
        return [...prevJourneys, updatedJourney].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
      }

      const next = [...prevJourneys];
      next[existingIndex] = {
        ...next[existingIndex],
        ...updatedJourney,
      };

      return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    setManagedJourney((current) =>
      current?.id === updatedJourney.id
        ? { ...current, ...updatedJourney }
        : current
    );
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (clubMenuRef.current && !clubMenuRef.current.contains(target)) {
        setClubMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenus]);

  useEffect(() => {
    closeMenus();
  }, [pathname, closeMenus]);

  // Check if user just completed payment (session_id in URL)
  const sessionId = searchParams.get("session_id");
  const downloadSuccessId = searchParams.get("downloadId");
  const downloadSessionId = downloadSuccessId ? sessionId : null;

  // Reset membership check when clubId changes (navigating to different club)
  // But DON'T reset if clubId becomes null temporarily
  useEffect(() => {
    if (clubId) {
      console.log("[Dashboard] Club changed to:", clubId);
      setMembershipChecked(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (!isHost && activeTab === "earnings") {
      setActiveTab("home");
    }
  }, [isHost, activeTab]);

  useEffect(() => {
    setActiveSettingsItem("none");
  }, [activeTab]);

  // Mark membership as checked after first load completes
  useEffect(() => {
    if (!loading && clubId && clubData) {
      console.log("[Dashboard] Membership check completed", {
        isMember,
        isHost,
      });
      setMembershipChecked(true);
    }
  }, [loading, clubId, clubData, isMember, isHost]);

  // Poll for membership if user just completed payment
  useEffect(() => {
    if (!sessionId || downloadSuccessId) return;

    // If already a member or host, stop processing immediately
    if (isMember || isHost) {
      console.log(
        "[Dashboard] Membership detected, stopping payment processing"
      );
      setProcessingPayment(false);
      return;
    }

    // Start processing and polling
    setProcessingPayment(true);
    console.log("[Dashboard] Starting membership polling after payment...");

    let pollCount = 0;
    const maxPolls = 30; // Poll for up to 30 seconds
    let isActive = true;

    const pollInterval = setInterval(async () => {
      if (!isActive) {
        clearInterval(pollInterval);
        return;
      }

      pollCount++;
      console.log(
        `[Dashboard] Polling for membership... attempt ${pollCount}/${maxPolls}`
      );

      // Refetch club data to check if membership has been updated
      try {
        await refreshClubData();

        // Note: The membership check will happen in the next render cycle
        // The other useEffect will detect isMember change and stop processing
      } catch (error) {
        console.error("[Dashboard] Error during membership poll:", error);
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setProcessingPayment(false);
        console.error("[Dashboard] ⚠️ Payment webhook processing timeout!");
        console.error("[Dashboard] Membership not detected after 30 seconds");
        console.error("[Dashboard] Please refresh the page or contact support");
      }
    }, 1000); // Poll every second

    return () => {
      isActive = false;
      clearInterval(pollInterval);
      console.log("[Dashboard] Cleaning up membership polling");
    };
  }, [sessionId, downloadSuccessId, isMember, isHost, refreshClubData]);

  useEffect(() => {
    if (!downloadSuccessId || !clubId) {
      return;
    }

    setActiveTab("downloads");

    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (!currentUser) {
      return;
    }

    let cancelled = false;

    const processDownload = async () => {
      try {
        setDownloadActionProcessing(true);
        setDownloadActionError(null);

        const idToken = await currentUser.getIdToken();
        const queryString = downloadSessionId
          ? `?session_id=${encodeURIComponent(downloadSessionId)}`
          : "";

        const response = await fetch(
          `/api/clubs/${clubId}/downloads/${downloadSuccessId}/access${queryString}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Unable to unlock your download.");
        }

        const data = (await response.json()) as {
          download: ClubDownload;
          url?: string;
        };

        if (cancelled) {
          return;
        }

        const resolvedDownload = data.download;
        setDownloads((prev) => {
          const nextDownload: ClubDownload = {
            ...resolvedDownload,
            hasPurchased: true,
            purchasedAt:
              resolvedDownload.purchasedAt ??
              prev.find((item) => item.id === resolvedDownload.id)
                ?.purchasedAt ??
              new Date().toISOString(),
          };

          const exists = prev.some((item) => item.id === resolvedDownload.id);
          if (exists) {
            return prev.map((item) =>
              item.id === resolvedDownload.id ? nextDownload : item
            );
          }

          return [...prev, nextDownload].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        trackDownload(resolvedDownload.id, resolvedDownload.title);

        if (typeof window !== "undefined") {
          const targetUrl = data.url || resolvedDownload.url;
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[Dashboard] Download fulfillment error:", err);
          setDownloadActionError(
            err instanceof Error
              ? err.message
              : "We couldn't prepare your download. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setDownloadActionProcessing(false);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("downloadId");
          params.delete("session_id");
          const next = params.toString();
          router.replace(next ? `${pathname}?${next}` : pathname, {
            scroll: false,
          });
        }
      }
    };

    void processDownload();

    return () => {
      cancelled = true;
    };
  }, [
    downloadSuccessId,
    downloadSessionId,
    clubId,
    pathname,
    router,
    searchParams,
  ]);

  // Stop processing state when membership is detected
  useEffect(() => {
    if (processingPayment && (isMember || isHost)) {
      setProcessingPayment(false);
    }
  }, [isMember, isHost, processingPayment]);

  useEffect(() => {
    if (
      !isHost &&
      isPaymentRequired &&
      !processingPayment &&
      !sessionId &&
      clubData?.info.slug
    ) {
      console.warn("[Dashboard] Payment required - redirecting to overview", {
        clubId,
        slug: clubData.info.slug,
      });
      router.push(`/club/${clubData.info.slug}/overview?payment=required`);
      return;
    }

    // Don't redirect if we're processing payment or if there's a session_id (just paid)
    if (processingPayment || sessionId) {
      console.log(
        "[Dashboard] Not redirecting - payment processing or just completed"
      );
      return;
    }

    // Don't redirect if still loading or no clubData yet
    if (loading || !clubData || !clubId) {
      console.log(
        "[Dashboard] Not redirecting - still loading or no club data",
        { loading, clubData: !!clubData, clubId }
      );
      return;
    }

    // CRITICAL: Don't redirect until we've actually checked membership at least once
    if (!membershipChecked) {
      console.log("[Dashboard] Not redirecting - membership not checked yet", {
        isMember,
        isHost,
      });
      return;
    }

    // SAFEGUARD: If membership check completed but we have no clear member status, wait
    if (!isMember && !isHost && error === null && !loading) {
      // Give one more moment for state to settle
      const timeoutId = setTimeout(() => {
        console.log(
          "[Dashboard] Confirmed user is not a member or host after delay, redirecting to overview"
        );
        router.push(`/club/${clubData.info.slug}/overview`);
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // User has access
    if (isMember || isHost) {
      console.log("[Dashboard] User has access", { isMember, isHost });
    }
  }, [
    loading,
    isMember,
    isHost,
    isPaymentRequired,
    clubData,
    clubId,
    router,
    processingPayment,
    sessionId,
    membershipChecked,
    error,
  ]);

  useEffect(() => {
    // Don't fetch content if:
    // 1. No clubId
    // 2. Not a member or host
    // 3. Still processing payment
    // 4. Membership requires payment before access
    if (
      !clubId ||
      (!isMember && !isHost) ||
      processingPayment ||
      (isPaymentRequired && !isHost)
    ) {
      console.log("[Dashboard] Skipping content fetch:", {
        clubId,
        isMember,
        isHost,
        processingPayment,
        isPaymentRequired,
      });
      return;
    }

    let isCancelled = false;

    const fetchContent = async () => {
      setLoadingContent(true);
      try {
        if (activeTab === "journeys") {
          const authInstance = getAuth();
          const currentUser = authInstance.currentUser;

          if (!currentUser) {
            throw new Error("User is not authenticated.");
          }

          const idToken = await currentUser.getIdToken();
          const response = await fetch(`/api/clubs/${clubId}/journeys`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              if (!isCancelled) {
                setJourneys([]);
              }
              return;
            }

            const errorBody = await response.json().catch(() => null);
            const message =
              errorBody?.error ||
              `Failed to load journeys (${response.status})`;
            throw new Error(message);
          }

          const data = (await response.json()) as {
            journeys?: ClubJourney[];
          };

          const fetchedJourneys: ClubJourney[] =
            data.journeys?.map((journey) => ({
              ...journey,
              title: journey.title ?? "Untitled Journey",
              createdAt: journey.createdAt ?? new Date().toISOString(),
              updatedAt: journey.updatedAt ?? new Date().toISOString(),
            })) ?? [];

          if (!isCancelled) {
            setJourneys(fetchedJourneys);
          }
        } else if (activeTab === "downloads") {
          const authInstance = getAuth();
          const currentUser = authInstance.currentUser;

          if (!currentUser) {
            throw new Error("User is not authenticated.");
          }

          const idToken = await currentUser.getIdToken();
          const response = await fetch(`/api/clubs/${clubId}/downloads`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              if (!isCancelled) {
                setDownloads([]);
              }
              return;
            }

            if (response.status === 403) {
              if (!isCancelled) {
                setDownloads([]);
              }
              return;
            }

            const errorBody = await response.json().catch(() => null);
            const message =
              errorBody?.error ||
              `Failed to load downloads (${response.status})`;
            throw new Error(message);
          }

          const data = (await response.json()) as {
            downloads?: ClubDownload[];
          };

          const fetchedDownloads = (data.downloads ?? []).map((download) => ({
            ...download,
            createdAt: download.createdAt ?? new Date().toISOString(),
            updatedAt: download.updatedAt ?? new Date().toISOString(),
            isFree:
              download.isFree ??
              !(typeof download.price === "number" && download.price > 0),
          }));

          if (!isCancelled) {
            setDownloads(
              fetchedDownloads.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
            );
          }
        } else if (
          activeTab === "recommended" &&
          clubData?.info.recommendedClubs
        ) {
          const recommendedIds = clubData.info.recommendedClubs.slice(0, 10);
          if (recommendedIds.length > 0) {
            const clubsRef = collection(db, "clubs");
            const q = query(
              clubsRef,
              where(documentId(), "in", recommendedIds)
            );
            const snapshot = await getDocs(q);

            const clubs = snapshot.docs.map((docSnap) => {
              const data = docSnap.data() as ClubDoc;
              const normalizedVideoUrl =
                typeof data.info.videoUrl === "string"
                  ? data.info.videoUrl.trim()
                  : "";
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
                createdAt:
                  data.createdAt?.toDate?.()?.toISOString() ||
                  new Date().toISOString(),
                updatedAt:
                  data.updatedAt?.toDate?.()?.toISOString() ||
                  new Date().toISOString(),
              } as Club;
            });

            setRecommendedClubs(clubs);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${activeTab}:`, err);
      } finally {
        if (!isCancelled) {
          setLoadingContent(false);
        }
      }
    };

    fetchContent();

    return () => {
      isCancelled = true;
    };
  }, [
    clubId,
    activeTab,
    clubData?.info.recommendedClubs,
    isMember,
    isHost,
    processingPayment,
    isPaymentRequired,
  ]);

  // Fetch lesson counts for journeys
  useEffect(() => {
    if (!clubId || journeys.length === 0 || activeTab !== "journeys") {
      return;
    }

    let isCancelled = false;

    const fetchLessonCounts = async () => {
      try {
        const authInstance = getAuth();
        const currentUser = authInstance.currentUser;
        if (!currentUser) {
          return;
        }

        const idToken = await currentUser.getIdToken();
        const counts: Record<string, number> = {};

        const countPromises = journeys.map(async (journey) => {
          try {
            const response = await fetch(
              `/api/clubs/${clubId}/journeys/${journey.id}/lessons`,
              {
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              }
            );

            if (response.ok) {
              const data = (await response.json()) as {
                lessons?: unknown[];
              };
              counts[journey.id] = data.lessons?.length ?? 0;
            } else {
              counts[journey.id] = 0;
            }
          } catch (err) {
            console.error(
              `[Dashboard] Error fetching lesson count for journey ${journey.id}:`,
              err
            );
            counts[journey.id] = 0;
          }
        });

        await Promise.all(countPromises);

        if (!isCancelled) {
          setJourneyLessonCounts(counts);
        }
      } catch (err) {
        console.error("[Dashboard] Error fetching lesson counts:", err);
      }
    };

    fetchLessonCounts();

    return () => {
      isCancelled = true;
    };
  }, [clubId, journeys, activeTab]);

  // Show loading while ClubContext is initializing or processing payment
  if (loading || processingPayment) {
    const message = processingPayment
      ? "Processing your payment..."
      : "Loading club dashboard...";
    return <CalmLoadingScreen message={message} />;
  }

  if (error || !clubData || !clubId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b1829] text-slate-100">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Club Not Found</h1>
          <p className="text-slate-300/90 max-w-md px-4">
            {error || "The club you're looking for doesn't exist."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render dashboard content until membership is confirmed
  if (!isMember && !isHost) {
    // If there's a session_id, show processing (covered by loading check above)
    // Otherwise, will be redirected by useEffect
    return <CalmLoadingScreen message="Checking your access..." />;
  }

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#212529] text-zinc-200 font-sans selection:bg-primary/30 overflow-x-hidden relative">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] right-[20%] w-[20%] h-[20%] bg-neutral-900/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex min-h-screen flex-col lg:h-full lg:flex-row">
        <aside
          className={`hidden lg:flex h-full flex-col border-r border-white/5 bg-[#272b2f]/60 backdrop-blur-xl relative transition-all duration-300 ${
            sidebarCollapsed ? "w-20" : "w-72"
          }`}
        >
          {/* Header Section */}
          <div
            className={`p-6 border-b border-white/5 transition-all duration-300 ${
              sidebarCollapsed ? "p-4" : ""
            }`}
          >
            {!sidebarCollapsed ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/90 text-[#212529] flex items-center justify-center font-bold text-xl shadow-lg shadow-white/5 flex-shrink-0 overflow-hidden">
                    {clubLogoUrl ? (
                      <Image
                        src={clubLogoUrl}
                        alt={`${clubData.info.name} logo`}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="w-0 h-0 border-l-[7px] border-l-transparent border-b-[12px] border-b-[#212529] border-r-[7px] border-r-transparent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-white tracking-wide truncate">
                      {clubData.info.name}
                    </h1>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#212529]/50 border border-white/10 text-zinc-400 text-[10px] font-medium tracking-wide mt-1.5">
                      {memberCountLabel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/90 text-[#212529] flex items-center justify-center font-bold text-xl shadow-lg shadow-white/5 overflow-hidden">
                  {clubLogoUrl ? (
                    <Image
                      src={clubLogoUrl}
                      alt={`${clubData.info.name} logo`}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[10px] border-b-[#212529] border-r-[6px] border-r-transparent" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {!sidebarCollapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Menu
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeSettingsItem === "none" && activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    sidebarCollapsed
                      ? "justify-center px-3 py-3"
                      : "gap-3 px-4 py-3"
                  } ${
                    isActive
                      ? "bg-[#212529]/40 text-white border border-white/10"
                      : "text-zinc-500 hover:text-white hover:bg-white/5"
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-full shadow-[0_0_12px_#4e8cff]" />
                  )}
                  <span
                    className={`transition-colors duration-300 ${
                      isActive
                        ? "text-primary"
                        : "text-zinc-500 group-hover:text-white"
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
            {isHost && (
              <div
                className={`space-y-2 ${sidebarCollapsed ? "pt-2" : "pt-6"}`}
              >
                {!sidebarCollapsed && (
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Settings
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleEditClub}
                  className={`w-full flex items-center rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    sidebarCollapsed
                      ? "justify-center px-3 py-3"
                      : "gap-3 px-4 py-3"
                  } ${
                    activeSettingsItem === "editClub"
                      ? "bg-[#212529]/40 text-white border border-white/10"
                      : "text-zinc-500 hover:text-white hover:bg-white/5"
                  }`}
                  title={sidebarCollapsed ? "Edit Club" : undefined}
                >
                  {activeSettingsItem === "editClub" && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-full shadow-[0_0_12px_#4e8cff]" />
                  )}
                  <span
                    className={`transition-colors duration-300 ${
                      activeSettingsItem === "editClub"
                        ? "text-primary"
                        : "text-zinc-500 group-hover:text-white"
                    }`}
                  >
                    <Settings size={20} />
                  </span>
                  {!sidebarCollapsed && <span>Edit Club</span>}
                </button>
              </div>
            )}
          </nav>

          {/* Footer Section */}
          <div
            className={`p-4 border-t border-white/5 space-y-4 ${
              sidebarCollapsed ? "space-y-2" : ""
            }`}
          >
            {!isHost && (
              <button
                onClick={openLeaveClubDialog}
                className={`w-full flex items-center rounded-xl transition-colors ${
                  sidebarCollapsed
                    ? "justify-center px-3 py-3"
                    : "gap-3 px-4 py-3"
                } text-red-400/80 hover:text-red-300 hover:bg-red-500/10`}
                title={sidebarCollapsed ? "Leave the space" : undefined}
              >
                <LogOut size={20} />
                {!sidebarCollapsed && <span>Leave the space</span>}
              </button>
            )}
            {!sidebarCollapsed && (
              <p className="text-center text-[11px] font-medium tracking-[0.35em] text-white/50 uppercase">
                Powered by <br/>
                Imagine Humans
              </p>
            )}
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-[#272b2f] border border-white/10 hover:border-white/30 flex items-center justify-center text-white transition-all duration-200 hover:bg-[#212529] shadow-lg"
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>
        </aside>

        <main className="flex-1 min-w-0 relative flex flex-col">
          <div className="sticky top-0 z-40 h-20 flex items-center px-4 sm:px-8 backdrop-blur-sm bg-[#212529]/60 border-b border-white/5">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/40 lg:hidden"
                  aria-label="Toggle navigation menu"
                >
                  <Menu size={18} />
                </button>
                <div className="relative" ref={clubMenuRef}>
                  <button
                    type="button"
                    onClick={handleClubTrigger}
                    className="inline-flex min-w-[260px] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-left text-sm font-semibold text-white transition hover:border-primary/40 hover:bg-white/10"
                  >
                    <div className="flex flex-wrap items-center gap-2 leading-none text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Your club
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {resolvedClubName}
                      </p>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-zinc-400 transition-transform ${
                        clubMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {clubMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-white/10 bg-[#15181c]/95 backdrop-blur-xl shadow-2xl z-50">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                          Switch space
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto py-2">
                        {userClubsLoading ? (
                          <div className="flex items-center justify-center py-6 text-sm text-zinc-400">
                            Loading your clubs...
                          </div>
                        ) : userClubs.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-zinc-400">
                            Join or host another club to switch spaces.
                          </div>
                        ) : (
                          userClubs.map((club) => (
                            <button
                              key={club.id}
                              type="button"
                              onClick={() => handleClubSelect(club)}
                              className={`w-full px-4 py-3 text-left transition ${
                                isClubActive(club)
                                  ? "bg-primary/10 text-primary"
                                  : "text-zinc-300 hover:bg-white/5"
                              }`}
                            >
                              <p className="font-semibold">{club.info.name}</p>
                              <p className="text-xs text-zinc-500">
                                {club.membersCount} member
                                {club.membersCount === 1 ? "" : "s"}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="border-t border-white/5">
                        <button
                          type="button"
                          onClick={handleViewAllClubs}
                          className="w-full px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition"
                        >
                          View all clubs
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-zinc-500 hover:text-white transition-colors relative hover:scale-105 duration-200">
                  <Bell size={20} />
                  <span className="absolute top-[-2px] right-[-2px] w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
                </button>
                <div className="h-6 w-px bg-white/10" />
                <div className="relative hidden lg:block" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={handleUserMenuToggle}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white shadow-lg ring-2 ring-white/5 overflow-hidden"
                  >
                    {resolvedPhotoUrl ? (
                      <Image
                        src={resolvedPhotoUrl}
                        alt={user?.displayName ?? "User"}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </button>
                  {userMenuOpen && user && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-[#15181c]/95 backdrop-blur-xl shadow-2xl z-50">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-sm font-semibold text-white">
                          {user.displayName ?? "Member"}
                        </p>
                        {user.email && (
                          <p className="text-xs text-zinc-500 truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                      <div className="py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => handleProfileNavigate("/profile")}
                          className="block w-full px-4 py-2 text-left text-zinc-300 hover:bg-white/5"
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProfileNavigate("/your-clubs")}
                          className="block w-full px-4 py-2 text-left text-zinc-300 hover:bg-white/5"
                        >
                          Your clubs
                        </button>
                        {user.isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleProfileNavigate("/admin")}
                            className="block w-full px-4 py-2 text-left text-zinc-300 hover:bg-white/5"
                          >
                            Admin
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="block w-full px-4 py-2 text-left text-red-300 hover:bg-red-500/10"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {mobileNavOpen && (
            <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm">
              <div className="absolute inset-x-0 top-20 mx-4 rounded-3xl border border-white/10 bg-[#121418] p-6 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500">
                      Navigate
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {resolvedClubName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/30"
                    aria-label="Close navigation menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      activeSettingsItem === "none" && activeTab === item.key;
                    return (
                      <button
                        key={`mobile-nav-${item.key}`}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.key);
                          setMobileNavOpen(false);
                        }}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "border-primary bg-primary/10 text-white"
                            : "border-white/10 text-zinc-300 hover:border-white/30 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={18} />
                          {item.label}
                        </span>
                        {isActive && (
                          <span className="text-xs text-primary">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {isHost && (
                  <button
                    type="button"
                    onClick={() => {
                      handleEditClub();
                      setMobileNavOpen(false);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary/40 hover:bg-primary/10"
                  >
                    Manage Club Settings
                  </button>
                )}

                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-base font-semibold text-white">
                      {resolvedPhotoUrl ? (
                        <Image
                          src={resolvedPhotoUrl}
                          alt={user?.displayName ?? "User"}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        userInitial
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-white">
                        {user?.displayName ?? "Member"}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleProfileNavigate("/profile")}
                      className="rounded-full border border-white/10 px-3 py-1 text-white hover:border-white/30"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProfileNavigate("/your-clubs")}
                      className="rounded-full border border-white/10 px-3 py-1 text-white hover:border-white/30"
                    >
                      Your clubs
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="rounded-full border border-red-400/40 px-3 py-1 text-red-200 hover:border-red-300"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-12 pt-10 space-y-6">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Currently viewing
              </p>
              <h2 className="text-4xl font-bold text-white mt-2 tracking-tight">
                {activeNavLabel}
              </h2>
            </div>

            {leaveClubError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {leaveClubError}
              </div>
            )}

            {loadingContent ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-2 border-t-primary animate-spin" />
              </div>
            ) : (
              <>
                {isHomeLikeView && renderHomeGrid()}

                {activeTab === "journeys" && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div></div>
                      {isHost && (
                        <HostGate>
                          <button
                            type="button"
                            onClick={openCreateJourney}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary bg-transparent px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
                          >
                            <Plus size={16} />
                            Add New Journey
                          </button>
                        </HostGate>
                      )}
                    </div>
                    {journeyActionError && (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {journeyActionError}
                      </div>
                    )}
                    {journeys.length === 0 ? (
                      <div className="rounded-3xl bg-[#272b2f]/80 border border-white/10 p-10 text-center text-zinc-400">
                        No journeys available yet.
                      </div>
                    ) : (
                      <>
                        {isHost && (
                          <div className="rounded-3xl bg-[#272b2f]/80 border border-white/10 p-6">
                            <JourneyList
                              journeys={journeys}
                              clubId={clubId!}
                              onEdit={handleJourneyEdit}
                              onDelete={handleJourneyDeleteClick}
                              onManageLessons={handleManageLessons}
                              onReorder={handleJourneyReorder}
                            />
                          </div>
                        )}
                        {!isHost && (
                          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                            {journeys.map((journey) => {
                              const lessonCount =
                                journeyLessonCounts[journey.id] ?? 0;
                              const estimatedTime = journey.estimatedMinutes;
                              const displayText =
                                journey.summary || journey.description;

                              return (
                                <div
                                  key={journey.id}
                                  className="group flex flex-col rounded-3xl border border-white/10 bg-[#272b2f]/80 p-6 shadow-xl transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_40px_rgba(78,140,255,0.15)]"
                                >
                                  <div className="flex-1 space-y-4">
                                    <div>
                                      <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
                                        {journey.title}
                                      </h3>
                                      {displayText && (
                                        <p className="text-sm leading-relaxed text-zinc-400 line-clamp-2">
                                          {displayText}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                      {lessonCount > 0 && (
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-primary"
                                          >
                                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                          </svg>
                                          <span>
                                            {lessonCount} lesson
                                            {lessonCount === 1 ? "" : "s"}
                                          </span>
                                        </div>
                                      )}
                                      {estimatedTime && estimatedTime > 0 && (
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-primary"
                                          >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                          </svg>
                                          <span>
                                            {estimatedTime < 60
                                              ? `${estimatedTime} min`
                                              : `${Math.floor(estimatedTime / 60)}h ${estimatedTime % 60}m`}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => setOpenJourneyId(journey.id)}
                                    className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(78,140,255,0.35)] transition-all duration-300 hover:bg-[#437be0] hover:shadow-[0_15px_35px_rgba(78,140,255,0.45)] hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    Start Journey
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "downloads" && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div></div>
                      {isHost && (
                        <HostGate>
                          <button
                            type="button"
                            onClick={openCreateDownload}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary bg-transparent px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
                          >
                            <Plus size={16} />
                            Add Digital Product
                          </button>
                        </HostGate>
                      )}
                    </div>
                    {downloads.length === 0 ? (
                      <div className="rounded-3xl bg-[#272b2f]/80 border border-white/10 p-10 text-center text-zinc-400">
                        No downloads available yet.
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {downloads.map((download) => (
                          <div
                            key={download.id}
                            className="rounded-3xl bg-[#272b2f]/80 border border-white/10 p-6 shadow-xl hover:border-primary/40 transition"
                          >
                            <HostDownloadCard
                              download={download}
                              isHost={isHost}
                              onSelect={openDownloadDetails}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "recommended" && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div></div>
                      {isHost && (
                        <HostGate>
                          <button
                            type="button"
                            onClick={openRecommendedModal}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary bg-transparent px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
                          >
                            <Plus size={16} />
                            Add new
                          </button>
                        </HostGate>
                      )}
                    </div>
                    {recommendedClubs.length === 0 ? (
                      <div className="rounded-3xl bg-[#272b2f]/80 border border-white/10 p-10 text-center text-zinc-400">
                        No recommended clubs available.
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {recommendedClubs.map((club) => (
                          <div
                            key={club.id}
                            className="rounded-3xl bg-[#272b2f]/80 border border-white/10 p-6 shadow-xl flex flex-col justify-between"
                          >
                            <div>
                              <h4 className="text-lg font-semibold text-white">
                                {club.info.name}
                              </h4>
                              <p className="text-sm text-zinc-500 mt-2">
                                {club.info.description || "No description yet."}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                router.push(
                                  `/club/${club.info.slug ?? club.id}/overview`
                                )
                              }
                              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#437be0]"
                            >
                              Visit Club
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {clubId && journeyEditorState && (
        <JourneyEditor
          open={journeyEditorState !== null}
          mode={journeyEditorState.mode}
          clubId={clubId}
          journey={
            journeyEditorState.mode === "edit"
              ? journeyEditorState.journey
              : undefined
          }
          onClose={closeJourneyEditor}
          onSaved={handleJourneySaved}
        />
      )}
      {recommendedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#15181c]/95 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Recommended
                </p>
                <h3 className="text-xl font-semibold text-white">
                  Add a club
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Search by club name and pick which space to recommend.
                </p>
              </div>
              <button
                type="button"
                onClick={closeRecommendedModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white"
                aria-label="Close add recommended club dialog"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <label
                htmlFor="recommended-search"
                className="text-sm font-medium text-zinc-300"
              >
                Search by club name
              </label>
              <input
                id="recommended-search"
                type="text"
                value={recommendedSearch}
                onChange={(event) => setRecommendedSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleRecommendedAdd();
                  }
                }}
                disabled={recommendedActionBusy}
                className="w-full rounded-xl border border-white/10 bg-[#0d0f13]/70 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition disabled:opacity-60"
                placeholder="Start typing a club name..."
              />
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                {recommendedSearchLoading ? (
                  <p className="text-sm text-zinc-400">Searching...</p>
                ) : recommendedSearch.trim() === "" ? (
                  <p className="text-sm text-zinc-500">
                    Start typing to see matching clubs.
                  </p>
                ) : recommendedSearchResults.length === 0 ? (
                  <p className="text-sm text-zinc-500">No clubs found.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recommendedSearchResults.map((club) => {
                      const isSelected = recommendedSelected?.id === club.id;
                      return (
                        <button
                          key={club.id}
                          type="button"
                          onClick={() => setRecommendedSelected(club)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-primary bg-primary/10 text-white"
                              : "border-white/10 bg-[#0d0f13]/60 text-zinc-200 hover:border-white/30 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold leading-snug">
                                {club.info.name}
                              </p>
                              <p className="text-xs text-zinc-500 line-clamp-2">
                                {club.info.description || "No description yet."}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                                Selected
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {recommendedActionError && (
                <p className="text-xs font-medium text-red-400">
                  {recommendedActionError}
                </p>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeRecommendedModal}
                disabled={recommendedActionBusy}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRecommendedAdd()}
                disabled={recommendedActionBusy || !recommendedSelected}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(78,140,255,0.35)] transition hover:bg-[#437be0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {recommendedActionBusy ? "Adding..." : "Add club"}
              </button>
            </div>
          </div>
        </div>
      )}
      <DownloadDetailsDialog
        open={activeDownload !== null}
        download={activeDownload}
        isHost={isHost}
        processing={downloadActionProcessing}
        error={downloadActionError}
        onClose={closeDownloadDetails}
        onDownload={handleDownloadAction}
        onEdit={isHost ? handleDownloadEdit : undefined}
      />
      {clubId && managedJourney && (
        <LessonManager
          clubId={clubId}
          journey={managedJourney}
          onClose={() => setManagedJourney(null)}
        />
      )}
      <ConfirmDialog
        open={journeyDeleteTarget !== null}
        title="Delete journey?"
        description="This will permanently remove the journey and all of its lessons. This action cannot be undone."
        confirmLabel="Delete journey"
        destructive
        loading={journeyDeleteLoading}
        onCancel={() => setJourneyDeleteTarget(null)}
        onConfirm={handleJourneyDeleteConfirm}
      />
      <ConfirmDialog
        open={leaveDialogOpen}
        title="Leave this space?"
        description="Your membership and billing will end immediately. You can rejoin any time if the host still has space."
        confirmLabel="Leave the space"
        destructive
        loading={leaveClubLoading}
        onCancel={() => setLeaveDialogOpen(false)}
        onConfirm={handleLeaveClub}
      />
      {downloadEditorState && clubId && (
        <DownloadEditor
          open={downloadEditorState !== null}
          mode={downloadEditorState.mode}
          clubId={clubId}
          download={
            downloadEditorState.mode === "edit"
              ? downloadEditorState.download
              : undefined
          }
          onClose={closeDownloadEditor}
          onSaved={handleDownloadSaved}
        />
      )}
      {openJourneyId && (
        <JourneyModal
          journeyId={openJourneyId}
          open={openJourneyId !== null}
          onClose={() => setOpenJourneyId(null)}
        />
      )}
    </div>
  );
}

/**
 * Club Dashboard Page
 */
export default function ClubDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;

  if (!slug) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Invalid club URL</p>
      </div>
    );
  }

  return (
    <ClubProvider slug={slug}>
      <ClubDashboardContent />
    </ClubProvider>
  );
}
