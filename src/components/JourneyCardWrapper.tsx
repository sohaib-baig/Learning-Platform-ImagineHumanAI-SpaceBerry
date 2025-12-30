"use client";

import { Journey, Enrollment, Progress } from "@/types/classroom";
import { JourneyCard } from "./JourneyCard";
import { resumeJourneyPath } from "@/app/classroom/actions";

interface JourneyCardWrapperProps {
  journey: Journey;
  enrollment?: Enrollment;
  progress?: Progress;
  totalLessons?: number;
}

export function JourneyCardWrapper({ journey, enrollment, progress, totalLessons }: JourneyCardWrapperProps) {
  const handleClick = async () => {
    const path = await resumeJourneyPath(journey.id);
    window.location.href = path;
  };

  return (
    <div onClick={handleClick}>
      <JourneyCard journey={journey} enrollment={enrollment} progress={progress} totalLessons={totalLessons} />
    </div>
  );
}
