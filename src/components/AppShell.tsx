"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signOutUser, onAuthChange, type User } from "@/lib/auth-client";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { ClubSwitcher } from "./ClubSwitcher";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Club, ClubDoc } from "@/types/club";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resumeRequested = searchParams?.get("resume") === "true";
  const { onboarding, loading: onboardingLoading } = useOnboardingProgress(
    user?.uid
  );

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const normalizedPath = pathname ?? "/";
  const isOnboardingPath = normalizedPath.startsWith("/onboarding");
  const hideHeader =
    normalizedPath === "/" ||
    normalizedPath.startsWith("/platform") ||
    isOnboardingPath;
  const fullScreenPatterns = [
    /^\/admin/,
    /^\/club\/[^/]+\/dashboard/,
    /^\/club\/[^/]+\/editor/,
    /^\/club\/[^/]+\/overview/,
    /^\/your-clubs/,
    /^\/profile/,
  ];
  const useFullScreenLayout = fullScreenPatterns.some((pattern) =>
    pattern.test(normalizedPath)
  );
  const shouldHideHeader = hideHeader || useFullScreenLayout;

  // Fetch current club data when on a club page
  useEffect(() => {
    const fetchCurrentClub = async () => {
      if (!pathname?.startsWith("/club/")) {
        setCurrentClub(null);
        return;
      }

      // Extract slug from pathname (e.g., /club/my-club/dashboard -> my-club)
      const slugMatch = pathname.match(/^\/club\/([^/]+)/);
      if (!slugMatch) {
        setCurrentClub(null);
        return;
      }

      const slug = slugMatch[1];

      try {
        const clubsRef = collection(db, "clubs");
        const q = query(clubsRef, where("info.slug", "==", slug));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const clubDocSnap = snapshot.docs[0];
          const clubDocData = clubDocSnap.data() as ClubDoc;
          const club: Club = {
            id: clubDocSnap.id,
            info: {
              ...clubDocData.info,
              description: clubDocData.info.description ?? "",
              price:
                typeof clubDocData.info.price === "number"
                  ? clubDocData.info.price
                  : 0,
              currency: clubDocData.info.currency ?? "AUD",
              priceChangedAt:
                clubDocData.info.priceChangedAt?.toDate?.()?.toISOString() ??
                (typeof clubDocData.info.priceChangedAt === "string"
                  ? clubDocData.info.priceChangedAt
                  : undefined),
              reviews: clubDocData.info.reviews?.map((review) => ({
                ...review,
                createdAt:
                  review.createdAt?.toDate?.()?.toISOString() ||
                  new Date().toISOString(),
              })),
            },
            hostId: clubDocData.hostId,
            membersCount: clubDocData.membersCount,
            pricingLocked: clubDocData.pricingLocked ?? false,
            createdAt:
              clubDocData.createdAt?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            updatedAt:
              clubDocData.updatedAt?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
          };
          setCurrentClub(club);
        } else {
          setCurrentClub(null);
        }
      } catch (err) {
        console.error("Error fetching current club:", err);
        setCurrentClub(null);
      }
    };

    fetchCurrentClub();
  }, [pathname]);

  const hostResumeActive =
    Boolean(onboarding?.progress?.currentStep?.startsWith("host:")) &&
    onboarding?.hostStatus?.activated !== true;
  const pendingHostActivation =
    onboarding?.hostStatus?.pendingActivation === true &&
    onboarding?.hostStatus?.activated !== true;

  useEffect(() => {
    if (!user || onboardingLoading) {
      return;
    }

    const isOnboardingComplete = Boolean(onboarding?.completedAt);
    if (!isOnboardingComplete) {
      if (!isPathAllowedDuringOnboarding(normalizedPath)) {
        if (!isOnboardingPath) {
          console.log("[AppShell] redirect to onboarding/start", {
            path: normalizedPath,
            onboarding,
          });
          router.replace("/onboarding/start");
        }
      }
      return;
    }

    if (isOnboardingPath && !(resumeRequested || hostResumeActive)) {
      console.log("[AppShell] redirect from onboarding to your-clubs", {
        path: normalizedPath,
        resumeRequested,
        hostResumeActive,
      });
      router.replace("/your-clubs");
    }
  }, [
    onboarding?.completedAt,
    onboarding?.hostStatus?.activated,
    onboarding?.progress?.currentStep,
    onboardingLoading,
    pathname,
    router,
    resumeRequested,
    hostResumeActive,
    user,
    normalizedPath,
    isOnboardingPath,
    onboarding,
  ]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Keep a server-readable session cookie in sync with Firebase Auth state.
  useEffect(() => {
    if (!authReady) {
      return;
    }

    const syncSessionCookie = async () => {
      try {
        if (user) {
          const idToken = await user.getIdToken(true);
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } else {
          await fetch("/api/auth/session", { method: "DELETE" });
        }
      } catch (error) {
        console.error("Failed to sync auth session", error);
      }
    };

    syncSessionCookie();
  }, [user, authReady]);

  const handleSignOut = async () => {
    await signOutUser();
    window.location.href = "/";
  };

  useEffect(() => {
    console.log("[AppShell] pathname", normalizedPath, {
      hasUser: Boolean(user),
      onboardingLoaded: !onboardingLoading,
      onboardingComplete: Boolean(onboarding?.completedAt),
    });
  }, [normalizedPath, onboarding, onboardingLoading, user]);

  return (
    <>
      {!shouldHideHeader && (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 md:px-6">
            {/* Club name with member count - shown when on a club page */}
            {currentClub ? (
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-slate-900">
                  {currentClub.info.name}
                </h1>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {currentClub.membersCount === 1
                    ? "1 member"
                    : `${currentClub.membersCount} members`}
                </span>
              </div>
            ) : (
              <Link
                href={user ? "/your-clubs" : "/"}
                className="font-semibold text-slate-900 transition hover:text-slate-700"
              >
                {user ? "Your clubs" : "Home"}
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden text-slate-700 hover:text-slate-900"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-4">
              {/* Club Switcher */}
              {user && pathname?.startsWith("/club/") && <ClubSwitcher />}

              {/* Authentication */}
              {user ? (
                <div className="relative">
                  <button
                    className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center"
                    onClick={toggleMenu}
                    aria-label="User menu"
                  >
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {user.displayName?.charAt(0).toUpperCase() || "U"}
                      </span>
                    )}
                  </button>

                  {/* Dropdown menu */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-soft py-2 border border-slate-200">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      {user.isAdmin && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Admin
                        </Link>
                      )}
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={handleSignOut}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/signin"
                  className="text-slate-700 hover:text-slate-900"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>

          {/* Mobile navigation */}
          {menuOpen && (
            <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4">
              <nav className="flex flex-col gap-3">
                {user && pathname?.startsWith("/club/") && (
                  <div className="py-2">
                    <ClubSwitcher />
                  </div>
                )}

                {user && pathname?.startsWith("/club/") && (
                  <div className="border-t border-slate-100 my-2"></div>
                )}

                {user ? (
                  <>
                    <Link
                      href="/profile"
                      className="text-slate-700 hover:text-slate-900 py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </Link>

                    {user.isAdmin && (
                      <Link
                        href="/admin"
                        className="text-slate-700 hover:text-slate-900 py-2"
                        onClick={() => setMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}

                    <button
                      className="text-left text-slate-700 hover:text-slate-900 py-2"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/signin"
                    className="text-slate-700 hover:text-slate-900 py-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          )}
        </header>
      )}
      {!shouldHideHeader && pendingHostActivation && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between md:px-6">
            <p className="font-medium">
              Finish Stripe checkout to unlock your host tools.
            </p>
            <Link
              href="/onboarding/host/select-plan?resume=true"
              className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-amber-500"
            >
              Resume checkout
            </Link>
          </div>
        </div>
      )}
      <main
        className={
          useFullScreenLayout
            ? "min-h-screen w-screen max-w-none"
            : "max-w-6xl mx-auto w-full px-4 py-8 md:px-6"
        }
      >
        {children}
      </main>
    </>
  );
}

function isPathAllowedDuringOnboarding(pathname: string): boolean {
  const allowList = [
    /^\/$/,
    /^\/onboarding/,
    /^\/your-clubs/,
    /^\/admin/,
    /^\/club(\/|$)/,
    /^\/profile/,
    /^\/dashboard/,
  ];

  return allowList.some((pattern) => pattern.test(pathname));
}
