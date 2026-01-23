import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError, createSuccessResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Force dynamic rendering - this route requires authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[id]
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('Users API: Unauthorized - no session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized: Failed to get session token" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      logger.error(`User fetch failed for user ${session.user.id}`, {
        status: response.status,
        userId: session.user.id,
        targetUserId: id
      });
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      throw new Error(errorData.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    logger.debug(`User fetched successfully for user ${session.user.id}`);
    return createSuccessResponse(data);
  } catch (error) {
    logger.error('User API error', error);
    return handleApiError(error);
  }
}

/**
 * PATCH /api/users/[id]
 * Update user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized: Failed to get session token" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.error(`User update failed for user ${session.user.id}`, {
        status: response.status,
        userId: session.user.id,
        targetUserId: id
      });
      const error = await response.json().catch(() => ({ error: "Backend error" }));
      throw new Error(error.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`User updated successfully by user ${session.user.id}`);
    return createSuccessResponse(data);
  } catch (error) {
    logger.error('User update error', error);
    return handleApiError(error);
  }
}
