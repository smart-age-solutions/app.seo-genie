"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingOverlay } from "./LoadingOverlay";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (status === "loading") {
        console.warn("Session loading timeout - redirecting to login");
        if (!hasRedirected) {
          setHasRedirected(true);
          router.push("/login");
        }
      }
    }, 5000); // 5 second timeout

    if (status === "loading") {
      return () => clearTimeout(timeoutId);
    }

    if (!session && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
      return () => clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [session, status, router, hasRedirected]);

  if (status === "loading") {
    return <LoadingOverlay isVisible={true} message="Loading..." />;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
