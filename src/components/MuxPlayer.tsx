"use client";

import { useEffect, useRef, type ComponentRef } from "react";
import MuxPlayerComponent from "@mux/mux-player-react";
import { getMuxPosterUrl } from "../lib/mux";
import { saveProgress } from "../lib/db/progress";
import { analytics } from "../lib/analytics";

interface MuxPlayerProps {
  playbackId: string;
  title: string;
  userId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  initialTime?: number;
  durationSec?: number;
}

type MuxPlayerHandle = ComponentRef<typeof MuxPlayerComponent>;

export function MuxPlayer({
  playbackId,
  title,
  userId,
  courseId,
  moduleId,
  lessonId,
  initialTime = 0,
  durationSec,
}: MuxPlayerProps) {
  const playerRef = useRef<MuxPlayerHandle | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestTimeRef = useRef<number>(initialTime);
  
  useEffect(() => {
    // Set initial time when player loads
    const player = playerRef.current;
    if (player && initialTime > 0) {
      player.currentTime = initialTime;
    }
    
    // Setup auto-save interval (every 10 seconds)
    saveIntervalRef.current = setInterval(() => {
      const currentPlayer = playerRef.current;
      if (currentPlayer && currentPlayer.currentTime > 0) {
        const time = Math.floor(currentPlayer.currentTime);
        latestTimeRef.current = time;
        saveProgress(userId, courseId, moduleId, lessonId, time, durationSec);
      }
    }, 10000);
    
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      
      // Final save on unmount
      if (player && latestTimeRef.current > 0) {
        saveProgress(userId, courseId, moduleId, lessonId, latestTimeRef.current, durationSec);
      }
    };
  }, [userId, courseId, moduleId, lessonId, initialTime, durationSec]);
  
  // Event handlers
  const handlePlay = () => {
    analytics.track("play_video", { 
      courseId, 
      lessonId, 
      title 
    });
  };
  
  const handlePause = () => {
    analytics.track("pause_video", { 
      courseId, 
      lessonId, 
      title 
    });
    
    // Save progress on pause
    if (playerRef.current && playerRef.current.currentTime > 0) {
      const time = Math.floor(playerRef.current.currentTime);
      latestTimeRef.current = time;
      saveProgress(userId, courseId, moduleId, lessonId, time, durationSec);
    }
  };
  
  const handleSeeked = () => {
    if (playerRef.current) {
      const time = Math.floor(playerRef.current.currentTime);
      latestTimeRef.current = time;
      analytics.track("seek_video", { 
        courseId, 
        lessonId, 
        title, 
        t: time 
      });
    }
  };
  
  const handleEnded = () => {
    // Save final progress and mark as completed
    if (durationSec) {
      saveProgress(userId, courseId, moduleId, lessonId, durationSec, durationSec);
      latestTimeRef.current = durationSec;
    }
  };
  
  return (
    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden">
      <MuxPlayerComponent
        ref={(element) => {
          playerRef.current = element;
        }}
        playbackId={playbackId}
        streamType="on-demand"
        primaryColor="#55b7f5"
        secondaryColor="#ffffff"
        title={title}
        poster={getMuxPosterUrl(playbackId)}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        onEnded={handleEnded}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
