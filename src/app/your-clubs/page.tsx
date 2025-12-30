"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  documentId,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { ClubCard } from "@/components/ClubCard";
import { ClubDirectory } from "@/components/ClubDirectory";
import type { Club } from "@/types/club";
import { mapClubDoc } from "@/lib/club";
import { Lightbulb, Plus, Sparkles, Users } from "lucide-react";

/**
 * Your Clubs Page
 * Displays all clubs the user has joined
 */
export default function YourClubsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [topClubs, setTopClubs] = useState<Club[]>([]);
  const [hostedClubIds, setHostedClubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (!authLoading && !user) {
      router.push("/signin");
      return;
    }

    const fetchTopClubs = async () => {
      const clubsRef = collection(db, "clubs");
      const topClubsQuery = query(
        clubsRef,
        orderBy("membersCount", "desc"),
        limit(6)
      );
      const topClubsSnapshot = await getDocs(topClubsQuery);
      const popularClubs = topClubsSnapshot.docs.map(mapClubDoc);
      setTopClubs(popularClubs);
    };

    const fetchUserClubs = async () => {
      if (!user?.uid) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get user's clubs
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          await fetchTopClubs();
          setLoading(false);
          return;
        }

        const userData = userDocSnap.data();
        const clubsJoined = Array.isArray(userData?.clubsJoined)
          ? (userData?.clubsJoined as string[])
          : [];
        const clubsHosted = Array.isArray(userData?.clubsHosted)
          ? (userData?.clubsHosted as string[])
          : [];
        setHostedClubIds(clubsHosted);
        const allClubIds = Array.from(
          new Set<string>([...clubsJoined, ...clubsHosted])
        );

        if (allClubIds.length === 0) {
          await fetchTopClubs();
          setLoading(false);
          return;
        }

        // Fetch club data (Firestore 'in' queries limited to 10 items)
        // For more than 10 clubs, you'd need to batch the queries
        const clubsRef = collection(db, "clubs");
        const q = query(
          clubsRef,
          where(documentId(), "in", allClubIds.slice(0, 10))
        );
        const snapshot = await getDocs(q);

        const fetchedClubs = snapshot.docs.map(mapClubDoc);

        // Sort clubs: hosted first, then by name
        const sortedClubs = fetchedClubs.sort((a, b) => {
          const aIsHosted = clubsHosted.includes(a.id);
          const bIsHosted = clubsHosted.includes(b.id);

          if (aIsHosted && !bIsHosted) return -1;
          if (!aIsHosted && bIsHosted) return 1;

          return a.info.name.localeCompare(b.info.name);
        });

        setClubs(sortedClubs);
      } catch (err) {
        console.error("Error fetching user clubs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch clubs");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserClubs();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212529]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212529]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Error</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  const hasClubs = clubs.length > 0;

  return (
    <div className="fixed inset-0 min-h-screen w-full bg-[#212529] text-zinc-300 font-sans overflow-x-hidden overflow-y-auto relative">
      {/* Ambient Background Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed top-[20%] right-[20%] w-[20%] h-[20%] bg-primary/5 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="border-b border-white/[0.05] bg-[#212529]/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    Your spaces
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding/start?resume=true")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base transition-all shadow-[0_0_20px_rgba(78,140,255,0.3)] hover:shadow-[0_0_25px_rgba(78,140,255,0.5)] transform active:scale-95 flex-shrink-0 self-start sm:self-start"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Start a New Space</span>
                  <span className="sm:hidden">New Space</span>
                </button>
              </div>
              <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
                {hasClubs
                  ? "Where your conversations, learning and belonging live."
                  : "You're not in any clubs yet — here are the most active spaces members love."}
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
          {/* Your Clubs Section */}
          {hasClubs && (
            <section className="animate-fadeIn space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Users size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Spaces you&apos;re part of
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                    {clubs.length} {clubs.length === 1 ? "space" : "spaces"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {clubs.map((club) => (
                  <div
                    key={club.id}
                    className="group rounded-3xl bg-[#272b2f]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl hover:bg-[#272b2f] transition-all hover:border-white/10 hover:shadow-2xl"
                  >
                    <ClubCard
                      club={club}
                      actionLabel="Open Club"
                      actionHref={`/club/${club.info.slug}/dashboard`}
                      variant="dark"
                      isHost={hostedClubIds.includes(club.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Popular Clubs Section (when user has no clubs) */}
          {!hasClubs && topClubs.length > 0 && (
            <section className="animate-fadeIn space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Popular spaces to explore
                  </h2>
                </div>
              </div>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {topClubs.map((club) => (
                  <div
                    key={club.id}
                    className="group rounded-3xl bg-[#272b2f]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl hover:bg-[#272b2f] transition-all hover:border-white/10 hover:shadow-2xl"
                  >
                    <ClubCard
                      club={club}
                      actionLabel="Explore club"
                      actionHref={`/club/${club.info.slug}/overview`}
                      variant="dark"
                      isHost={hostedClubIds.includes(club.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <ClubDirectory
            title="Our current creators"
            description="Browse the most active spaces across Imagine Humans."
            actionLabel="Explore club"
            hostedClubIds={hostedClubIds}
            icon={<Lightbulb size={20} className="text-primary" />}
          />
        </div>
      </div>
    </div>
  );
}
