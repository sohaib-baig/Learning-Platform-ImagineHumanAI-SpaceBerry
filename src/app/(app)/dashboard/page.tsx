"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientGuard } from "@/components/ClientGuard";

/**
 * Legacy Dashboard Page
 * Redirects to the default ImagineHumans Academy club dashboard
 * for backward compatibility with existing users
 */
export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to your clubs
    router.push("/your-clubs");
  }, [router]);

  return (
    <ClientGuard>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    </ClientGuard>
  );
}
