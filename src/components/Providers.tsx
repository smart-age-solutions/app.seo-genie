"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { PageTransition } from "./PageTransition";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <PageTransition>{children}</PageTransition>
    </SessionProvider>
  );
}
