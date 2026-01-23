"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [prevPath, setPrevPath] = useState(pathname);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      setPrevPath(pathname);
      return;
    }

    if (pathname !== prevPath) {
      startTransition(() => {
        setPrevPath(pathname);
      });
    }
  }, [pathname, prevPath, startTransition, isInitialLoad]);

  // Only show subtle transition effect for route changes, not initial load
  // Next.js handles prefetching, so transitions should be instant
  return <>{children}</>;
}
