"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Club } from "@/types/club";
import { evaluateClubBadges } from "@/lib/badges";
import { ClubBadgesBar } from "./ClubBadges";

interface HostProfile {
  name?: string;
  photoURL?: string;
}

const hostProfileCache = new Map<string, HostProfile>();

interface ClubCardProps {
  club: Club;
  actionLabel?: string;
  actionHref?: string;
  variant?: "light" | "dark";
  isHost?: boolean;
}

/**
 * ClubCard Component
 * Displays a club card with banner, name, and action button
 */
export function ClubCard({
  club,
  actionHref,
  variant = "light",
  isHost = false,
}: ClubCardProps) {
  const href = actionHref || `/club/${club.info.slug}/overview`;
  const isDark = variant === "dark";
  const hasLogo = Boolean(club.info.profileImageUrl);
  const badges = evaluateClubBadges(club);

  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);

  const hostName = hostProfile?.name?.trim() || "Club host";

  const hostInitials = useMemo(() => {
    const firstLetter = hostName.trim().charAt(0);
    return firstLetter ? firstLetter.toUpperCase() : "H";
  }, [hostName]);

  useEffect(() => {
    let isSubscribed = true;

    const fetchHostProfile = async () => {
      if (!club.hostId) {
        return;
      }

      if (hostProfileCache.has(club.hostId)) {
        setHostProfile(hostProfileCache.get(club.hostId)!);
        return;
      }

      setHostProfile(null);

      try {
        const hostRef = doc(db, "users", club.hostId);
        const hostSnap = await getDoc(hostRef);

        if (hostSnap.exists()) {
          const data = hostSnap.data() as {
            displayName?: string;
            photoURL?: string;
          };
          if (isSubscribed) {
            const profile = {
              name: data.displayName ?? undefined,
              photoURL: data.photoURL ?? undefined,
            };
            hostProfileCache.set(club.hostId, profile);
            setHostProfile(profile);
          }
        }
      } catch (error) {
        console.error("Failed to load host profile", error);
      }
    };

    fetchHostProfile();

    return () => {
      isSubscribed = false;
    };
  }, [club.hostId]);

  return (
    <Link
      href={href}
      className={`group block ${
        isDark
          ? "bg-transparent"
          : "bg-white rounded-lg shadow-md hover:shadow-xl"
      } overflow-hidden transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70`}
    >
      {/* Banner */}
      <div
        className={`relative h-48 ${
          isDark
            ? "bg-gradient-to-r from-primary/20 to-primary/30"
            : "bg-gradient-to-r from-blue-500 to-blue-600"
        }`}
      >
        {hasLogo ? (
          <Image
            src={club.info.profileImageUrl!}
            alt={`${club.info.name} logo`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          club.info.bannerUrl && (
            <Image
              src={club.info.bannerUrl}
              alt={`${club.info.name} banner`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
              priority={false}
            />
          )
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/30 pointer-events-none" />
        {isHost && (
          <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-white/90 text-[#0f172a] px-3 py-1 text-xs font-semibold shadow-lg">
            Hosting
          </span>
        )}
        <div className="absolute -bottom-10 left-6">
          <div
            className={`relative h-20 w-20 rounded-full border-4 ${
              isDark ? "border-[#212529]" : "border-white"
            } bg-[#161a1d] shadow-xl overflow-hidden`}
          >
            {hostProfile?.photoURL ? (
              <Image
                src={hostProfile.photoURL}
                alt={`${hostName} profile photo`}
                fill
                sizes="80px"
                className="object-cover"
                priority={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 to-primary/60 text-white text-xl font-semibold">
                {hostInitials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-12">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3
            className={`text-xl sm:text-2xl font-bold ${
              isDark ? "text-white" : ""
            }`}
          >
            {club.info.name}
          </h3>
          <ClubBadgesBar badges={badges} />
        </div>
        <div
          className={`mb-3 flex items-center gap-2 text-sm ${
            isDark ? "text-zinc-300" : "text-gray-700"
          }`}
        >
          <span className="text-xs uppercase tracking-[0.08em] text-primary font-semibold">
            by
          </span>
          <span
            className={`font-semibold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {hostName}
          </span>
        </div>
        <p
          className={`mb-4 line-clamp-2 ${
            isDark ? "text-zinc-400" : "text-gray-600"
          }`}
        >
          {club.info.vision}
        </p>

        {/* Stats */}
        <div
          className={`flex items-center justify-between text-sm ${
            isDark ? "text-zinc-400" : "text-gray-500"
          }`}
        >
          <span>{club.membersCount} members</span>
          {club.info.price > 0 && (
            <span
              className={`font-semibold ${
                isDark ? "text-zinc-300" : "text-gray-700"
              }`}
            >
              {club.info.currency} ${club.info.price.toFixed(2)}
            </span>
          )}
          {club.info.price === 0 && (
            <span
              className={`font-semibold ${
                isDark ? "text-green-400" : "text-green-600"
              }`}
            >
              Free
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
