import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError, createSuccessResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Force dynamic rendering - this route requires authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('Services API: Unauthorized - no session');
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized: Failed to get session token" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/services`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      logger.error(`Services API failed for user ${session.user.id}`, {
        status: response.status,
        userId: session.user.id
      });
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      throw new Error(errorData.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    logger.debug(`Services fetched successfully for user ${session.user.id}`);
    return createSuccessResponse(data);
  } catch (error) {
    logger.error('Services API error', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized: Failed to get session token" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/services`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.error(`Services creation failed for user ${session.user.id}`, {
        status: response.status,
        userId: session.user.id
      });
      const error = await response.json().catch(() => ({ error: "Backend error" }));
      throw new Error(error.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Service created successfully by user ${session.user.id}`);
    return createSuccessResponse(data, 201);
  } catch (error) {
    logger.error('Services creation error', error);
    return handleApiError(error);
  }
}