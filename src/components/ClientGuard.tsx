"use client";

import { useEffect, useState } from "react";
import { onAuthChange, type User } from "@/lib/auth-client";
import { CalmLoadingScreen } from "./CalmLoadingScreen";

interface ClientGuardProps {
  children: React.ReactNode;
}

export function ClientGuard({ children }: ClientGuardProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      
      // Redirect to signin if user is null (signed out)
      if (currentUser === null) {
        window.location.href = "/signin";
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Show a calm loading screen while auth state resolves
  if (user === undefined) {
    return <CalmLoadingScreen />;
  }

  // Redirect to signin if user is null
  if (user === null) {
    return null;
  }

  // User is signed in, render children
  return <>{children}</>;
}
