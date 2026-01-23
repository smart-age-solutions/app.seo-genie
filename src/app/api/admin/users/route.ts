import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserStatus, UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Admin routes require authentication, keep dynamic
export const dynamic = 'force-dynamic';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as UserStatus | null;
    const role = searchParams.get("role") as UserRole | null;
    const search = searchParams.get("search");

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query params
    const queryParams = new URLSearchParams();
    if (status) queryParams.append("status", status);
    if (role) queryParams.append("role", role);

    const response = await fetch(`${BACKEND_URL}/api/users?${queryParams.toString()}`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Backend users fetch failed:", response.status);
      return NextResponse.json({ users: [] });
    }

    const data = await response.json();
    let users = data.users || [];

    // Ensure users is an array
    if (!Array.isArray(users)) {
      console.error("Backend returned non-array users:", users);
      return NextResponse.json({ users: [] });
    }

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter((user: { name?: string; email?: string }) =>
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ users: [] });
  }
}

// PATCH /api/admin/users - Update user status or role
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, status, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Only admin can change roles
    if (role && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Only admin can change user roles" },
        { status: 403 }
      );
    }

    // Prevent changing own role/status
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update user via backend API
    let response;
    if (status) {
      response = await fetch(`${BACKEND_URL}/api/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
    } else if (role) {
      response = await fetch(`${BACKEND_URL}/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });
    } else {
      response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, role }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
