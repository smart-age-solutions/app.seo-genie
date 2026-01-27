"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { PageTransition } from "./PageTransition";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Add basePath if NextAuth is not at /api/auth
      basePath="/api/auth"
      // Add refetchInterval to prevent stale sessions
      refetchInterval={60}
      // Add refetchOnWindowFocus to keep session fresh
      refetchOnWindowFocus={true}
    >
      <PageTransition>{children}</PageTransition>
    </SessionProvider>
  );
}
