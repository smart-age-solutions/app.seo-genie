import { NextRequest, NextResponse } from "next/server";
import { handleApiError, createSuccessResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/create-session
 * Proxy to backend to create/update session in database
 * Public endpoint - no authentication required (needed during login)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionToken, expires } = body;

    if (!userId || !sessionToken) {
      return NextResponse.json(
        { error: "userId and sessionToken are required" },
        { status: 400 }
      );
    }

    // Call backend API: POST /api/public/auth/session
    const response = await fetch(`${BACKEND_URL}/api/public/auth/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        sessionToken,
        expires,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to create session" }));
      return NextResponse.json(
        { error: errorData.error || "Failed to create session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.debug(`Session created/updated for user ${userId}`);
    return createSuccessResponse(data);
  } catch (error) {
    logger.error("Error creating session:", error);
    return handleApiError(error);
  }
}
