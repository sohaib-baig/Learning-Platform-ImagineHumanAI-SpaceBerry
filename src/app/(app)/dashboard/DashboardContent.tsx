"use client";

import { useEffect, useState } from "react";
import { onAuthChange } from "@/lib/auth-client";
import {
  useCurrentlyEnrolledJourneys,
  useCompletedJourneys,
} from "@/hooks/useDashboardData";
import { YourJourneysGrid } from "./components/YourJourneysGrid";

/**
 * Loading skeleton component
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 bg-slate-200 rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse"></div>
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse"></div>
      </div>
      <div className="h-96 bg-slate-200 rounded-2xl animate-pulse"></div>
    </div>
  );
}

/**
 * Dashboard Content Component
 * Composes all dashboard sections with data hooks
 */
export function DashboardContent() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      if (currentUser) {
        setUid(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all dashboard data
  const { enrolled, loading: enrolledLoading } = useCurrentlyEnrolledJourneys(uid);
  const { completed, loading: completedLoading } = useCompletedJourneys(uid);

  // Overall loading state
  const isLoading =
    loading ||
    enrolledLoading ||
    completedLoading;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!uid) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Your Journeys Grid */}
      <YourJourneysGrid enrolled={enrolled} completed={completed} />
    </div>
  );
}

