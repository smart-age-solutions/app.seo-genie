import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError, createSuccessResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Build backend URL with query params
    const backendUrl = new URL(`${BACKEND_URL}/api/users`);
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized: Failed to get session token" }, { status: 401 });
    }

    const response = await fetch(backendUrl.toString(), {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      logger.error(`Users fetch failed for user ${session.user.id}`, {
        status: response.status,
        userId: session.user.id,
        query: Object.fromEntries(searchParams)
      });
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      throw new Error(errorData.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    logger.debug(`Users fetched successfully for user ${session.user.id}`);
    return createSuccessResponse(data);
  } catch (error) {
    logger.error('Users API error', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // For OAuth user creation, allow without session (public route)
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}