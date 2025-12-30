"use client";

import { useEffect, useRef, type ComponentRef } from "react";
import YouTube, { type YouTubePlayer } from "react-youtube";
import MuxPlayerComponent from "@mux/mux-player-react";
import { markLessonAsComplete, markLessonCompleted } from "@/lib/firestore/classroom";
import { analytics } from "@/lib/analytics";
import { extractYouTubeVideoId } from "@/lib/youtube";

interface VideoPlayerProps {
  playbackId: string;
  title: string;
  userId?: string;
  journeyId: string;
  lessonId: string;
  clubId: string;
  initialTime?: number;
  durationSeconds?: number;
  onCompletion?: () => void;
}

type MuxPlayerHandle = ComponentRef<typeof MuxPlayerComponent>;

type VideoSource =
  | { type: "youtube"; videoId: string }
  | { type: "mux"; playbackId: string };

const MUX_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function extractMuxPlaybackId(rawValue: string | null | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (MUX_ID_REGEX.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    if (!url.hostname.includes("mux.com")) {
      return null;
    }
    const match = url.pathname.match(/\/([^/]+?)(?:\.m3u8)?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function resolveVideoSource(value: string): VideoSource | null {
  const youtubeId = extractYouTubeVideoId(value);
  if (youtubeId) {
    return { type: "youtube", videoId: youtubeId };
  }
  const muxPlaybackId = extractMuxPlaybackId(value);
  if (muxPlaybackId) {
    return { type: "mux", playbackId: muxPlaybackId };
  }
  return null;
}

export function VideoPlayer(props: VideoPlayerProps) {
  const source = resolveVideoSource(props.playbackId);

  if (!source) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        Unable to load this video. Please confirm the video link is valid.
      </div>
    );
  }

  if (source.type === "youtube") {
    return <YouTubeVideoPlayer {...props} videoId={source.videoId} />;
  }

  return <MuxVideoPlayer {...props} playbackId={source.playbackId} />;
}

interface YouTubeVideoPlayerProps extends VideoPlayerProps {
  videoId: string;
}

function YouTubeVideoPlayer({
  videoId,
  title,
  userId,
  journeyId,
  lessonId,
  clubId,
  initialTime = 0,
  durationSeconds,
  onCompletion,
}: YouTubeVideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    if (playerRef.current && initialTime > 0) {
      playerRef.current.seekTo(initialTime, true);
    }
  }, [initialTime, videoId]);

  const handleReady = (event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
    if (initialTime > 0) {
      event.target.seekTo(initialTime, true);
    }
  };

  const handlePlay = () => {
    analytics.track("play_video", {
      journeyId,
      clubId,
      lessonId,
      title,
    });
  };

  const handlePause = () => {
    analytics.track("pause_video", {
      journeyId,
      clubId,
      lessonId,
      title,
    });
  };

  const handleEnded = async () => {
    if (userId) {
      try {
        await markLessonAsComplete(
          userId,
          journeyId,
          lessonId,
          clubId,
          durationSeconds ?? 0
        );
        await markLessonCompleted({
          uid: userId,
          clubId,
          journeyId,
          lessonId,
        });
        analytics.track("lesson_completed", {
          journeyId,
          clubId,
          lessonId,
          method: "auto",
        });
        if (onCompletion) {
          onCompletion();
        }
      } catch (error) {
        console.error("Failed to mark lesson as complete:", error);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
        <YouTube
          videoId={videoId}
          onReady={handleReady}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnd={handleEnded}
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
            },
          }}
          className="h-full w-full"
          iframeClassName="h-full w-full"
        />
      </div>
    </div>
  );
}

interface MuxVideoPlayerProps extends VideoPlayerProps {
  playbackId: string;
}

function MuxVideoPlayer({
  playbackId,
  title,
  userId,
  journeyId,
  lessonId,
  clubId,
  initialTime = 0,
  durationSeconds,
  onCompletion,
}: MuxVideoPlayerProps) {
  const playerRef = useRef<MuxPlayerHandle | null>(null);

  useEffect(() => {
    if (playerRef.current && initialTime > 0) {
      playerRef.current.currentTime = initialTime;
    }
  }, [initialTime]);

  const handlePlay = () => {
    analytics.track("play_video", {
      journeyId,
      clubId,
      lessonId,
      title,
    });
  };

  const handlePause = () => {
    analytics.track("pause_video", {
      journeyId,
      clubId,
      lessonId,
      title,
    });
  };

  const handleSeeked = () => {
    if (playerRef.current) {
      const time = Math.floor(playerRef.current.currentTime);
      analytics.track("seek_video", {
        journeyId,
        clubId,
        lessonId,
        title,
        position: time,
      });
    }
  };

  const handleEnded = async () => {
    if (userId) {
      try {
        await markLessonAsComplete(
          userId,
          journeyId,
          lessonId,
          clubId,
          durationSeconds ?? 0
        );
        await markLessonCompleted({
          uid: userId,
          clubId,
          journeyId,
          lessonId,
        });

        analytics.track("lesson_completed", {
          journeyId,
          clubId,
          lessonId,
          method: "auto",
        });

        if (onCompletion) {
          onCompletion();
        }
      } catch (error) {
        console.error("Failed to mark lesson as complete:", error);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
        <MuxPlayerComponent
          ref={(element) => {
            playerRef.current = element;
          }}
          playbackId={playbackId}
          streamType="on-demand"
          primaryColor="#55b7f5"
          secondaryColor="#ffffff"
          title={title}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onEnded={handleEnded}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}

