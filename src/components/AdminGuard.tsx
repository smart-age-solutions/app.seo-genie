"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types/database";
import { LoadingOverlay } from "./LoadingOverlay";

interface AdminGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AdminGuard({
  children,
  allowedRoles = [UserRole.ADMIN, UserRole.USER],
}: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (!allowedRoles.includes(session.user.role)) {
      router.push("/");
      return;
    }
  }, [session, status, router, allowedRoles]);

  if (status === "loading") {
    return <LoadingOverlay isVisible={true} message="Loading..." />;
  }

  if (!session || !allowedRoles.includes(session.user.role)) {
    return null;
  }

  return <>{children}</>;
}
