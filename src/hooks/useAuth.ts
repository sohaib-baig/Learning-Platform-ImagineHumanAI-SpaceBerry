"use client";

import { useState, useEffect } from "react";
import { onAuthChange, type User } from "@/lib/auth-client";

/**
 * Hook to get the current authenticated user
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

