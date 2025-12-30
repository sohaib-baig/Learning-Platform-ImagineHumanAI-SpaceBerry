"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// This page is skipped in the new flow as Step 1 (Club Name) and Step 2 (Description) 
// have been combined. We redirect to the club-name page to ensure proper flow.
function HostClubDescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeRequested = searchParams?.get("resume") === "true";

  useEffect(() => {
    const path = "/onboarding/host/club-name";
    const target = resumeRequested 
      ? `${path}${path.includes("?") ? "&" : "?"}resume=true` 
      : path;
    router.replace(target);
  }, [router, resumeRequested]);

  return null;
    }

export default function HostClubDescriptionPage() {
  return (
    <Suspense fallback={null}>
      <HostClubDescriptionContent />
    </Suspense>
  );
}
