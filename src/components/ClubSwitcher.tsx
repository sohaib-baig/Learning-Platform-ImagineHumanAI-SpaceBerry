"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useUserClubs } from "@/hooks/useUserClubs";

/**
 * ClubSwitcher Component
 * Displays a dropdown to switch between joined clubs
 */
export function ClubSwitcher({ currentClubId }: { currentClubId?: string | null }) {
  const { clubs, currentClub, loading } = useUserClubs(currentClubId);
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        Loading clubs...
      </div>
    );
  }

  if (clubs.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">
          {currentClub ? currentClub.info.name : "Select Club"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-2">
              <div className="px-4 py-2 text-xs text-gray-500 uppercase font-semibold">
                Your Clubs
              </div>
              {clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/club/${club.info.slug}/dashboard`}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 hover:bg-gray-100 transition-colors ${
                    club.id === currentClub?.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <div className="font-medium">{club.info.name}</div>
                  <div className="text-xs text-gray-500">
                    {club.membersCount} members
                  </div>
                </Link>
              ))}
              <hr className="my-2" />
              <Link
                href="/your-clubs"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-blue-600 hover:bg-gray-100 transition-colors font-medium"
              >
                View All Clubs
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

