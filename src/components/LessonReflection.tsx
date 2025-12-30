"use client";

import { useEffect, useState, useRef } from "react";
import { saveReflection } from "@/lib/firestore/classroom";
import { analytics } from "@/lib/analytics";

interface LessonReflectionProps {
  userId?: string;
  journeyId: string;
  lessonId: string;
  initialText?: string;
}

export function LessonReflection({
  userId,
  journeyId,
  lessonId,
  initialText = "",
}: LessonReflectionProps) {
  const [reflectionText, setReflectionText] = useState<string>(initialText);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save reflections with debounce
  useEffect(() => {
    if (!userId) return;

    if (reflectionText !== initialText) {
      setStatus("saving");
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set a new timeout for 1 second
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveReflection(userId, journeyId, lessonId, reflectionText);
          setStatus("saved");
          
          // Track reflection saved
          analytics.track("reflection_saved", {
            journeyId,
            lessonId
          });
        } catch (error) {
          console.error("Failed to save reflection:", error);
          setStatus("error");
        }
      }, 1000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [reflectionText, userId, journeyId, lessonId, initialText]);

  // Reset status after a delay
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (status === "saved" || status === "error") {
      timeout = setTimeout(() => {
        setStatus("idle");
      }, 3000);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [status]);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium text-slate-900 mb-2">
        What does this spark for you?
      </h3>
      <textarea
        value={reflectionText}
        onChange={(e) => setReflectionText(e.target.value)}
        placeholder="Share your thoughts, insights, or questions about what you've learned..."
        className="w-full p-4 border border-slate-200 rounded-xl min-h-32 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        maxLength={500}
      />
      
      <div className="flex justify-between mt-2">
        <div className="text-sm text-slate-500">
          {reflectionText.length}/500 characters
        </div>
        <div className="text-sm">
          {status === "saving" && <span className="text-amber-600">Saving...</span>}
          {status === "saved" && <span className="text-green-600">Saved ✓</span>}
          {status === "error" && <span className="text-red-600">Error saving</span>}
        </div>
      </div>
    </div>
  );
}
