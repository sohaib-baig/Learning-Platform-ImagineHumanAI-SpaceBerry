"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";

interface ClubBannerProps {
  bannerUrl?: string;
  videoUrl?: string;
  name: string;
  description: string;
  vision: string;
}

/**
 * ClubBanner Component
 * Displays the club's hero banner with video or image, and name/vision
 * Video takes precedence over banner image if provided
 */
export function ClubBanner({
  bannerUrl,
  videoUrl,
  name,
  description,
  vision,
}: ClubBannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video plays when component mounts
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch((error) => {
        // Auto-play may be blocked by browser, but video will play on user interaction
        console.log("Video autoplay prevented:", error);
      });
    }
  }, [videoUrl]);

  return (
    <div className="relative w-full h-96 bg-gradient-to-r from-blue-600 to-blue-700 overflow-hidden">
      {/* Video Player - takes precedence over image */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : bannerUrl ? (
        <Image
          src={bannerUrl}
          alt={`${name} banner`}
          fill
          sizes="100vw"
          className="absolute inset-0 object-cover"
          priority
        />
      ) : null}
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <h1 className="text-5xl font-bold mb-4 text-center">{name}</h1>
        <p className="text-xl max-w-3xl text-center">{vision}</p>
        {description && (
          <p className="mt-6 max-w-3xl text-center text-base text-slate-100/90">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

