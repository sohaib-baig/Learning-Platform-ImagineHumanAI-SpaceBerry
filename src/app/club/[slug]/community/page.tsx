"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ClubProvider, useClub } from "@/context/ClubContext";
import { useAuth } from "@/hooks/useAuth";
import { CommunityFeed } from "@/components/community/CommunityFeed";

function CommunityFeedContent() {
  const { clubId, loading, error } = useClub();
  const { user, loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !clubId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error ?? "We could not find this club. Please check the URL."}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
        Sign in to participate in your community feed.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <CommunityFeed clubId={clubId} currentUserId={user.uid} />
    </div>
  );
}

export default function ClubCommunityPage() {
  const params = useParams();
  const slugParam = params?.slug;

  if (typeof slugParam !== "string" || !slugParam.trim()) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Invalid club URL
        </p>
      </div>
    );
  }

  return (
    <ClubProvider slug={slugParam}>
      <CommunityFeedContent />
    </ClubProvider>
  );
}
