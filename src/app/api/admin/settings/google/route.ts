import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin, clearCredentialsCache } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

// GET /api/admin/settings/google - Get Google settings (Admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/settings/google`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    const settings = data.settings || data;

    // Mask sensitive values
    return NextResponse.json({
      settings: {
        id: settings.id,
        oauthClientId: settings.oauthClientId,
        hasOauthClientId: !!settings.oauthClientId,
        oauthClientSecret: settings.oauthClientSecret 
          ? "****" + settings.oauthClientSecret.slice(-4) 
          : null,
        hasOauthClientSecret: !!settings.oauthClientSecret,
        searchApiKey: settings.searchApiKey 
          ? "****" + settings.searchApiKey.slice(-4) 
          : null,
        hasSearchApiKey: !!settings.searchApiKey,
        searchEngineId: settings.searchEngineId 
          ? "****" + settings.searchEngineId.slice(-4) 
          : null,
        hasSearchEngineId: !!settings.searchEngineId,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching Google settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings/google - Update Google settings (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { oauthClientId, oauthClientSecret, searchApiKey, searchEngineId } = body;

    const updateData: Record<string, unknown> = {};

    // Handle OAuth Client ID
    if (oauthClientId !== undefined) {
      if (oauthClientId === null || oauthClientId === "") {
        updateData.oauthClientId = null;
      } else if (!oauthClientId.startsWith("****")) {
        updateData.oauthClientId = oauthClientId;
      }
    }

    // Handle OAuth Client Secret
    if (oauthClientSecret !== undefined) {
      if (oauthClientSecret === null || oauthClientSecret === "") {
        updateData.oauthClientSecret = null;
      } else if (!oauthClientSecret.startsWith("****")) {
        updateData.oauthClientSecret = oauthClientSecret;
      }
    }

    // Handle Search API Key
    if (searchApiKey !== undefined) {
      if (searchApiKey === null || searchApiKey === "") {
        updateData.searchApiKey = null;
      } else if (!searchApiKey.startsWith("****")) {
        updateData.searchApiKey = searchApiKey;
      }
    }

    // Handle Search Engine ID
    if (searchEngineId !== undefined) {
      if (searchEngineId === null || searchEngineId === "") {
        updateData.searchEngineId = null;
      } else if (!searchEngineId.startsWith("****")) {
        updateData.searchEngineId = searchEngineId;
      }
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/settings/google`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    const settings = data.settings || data;

    // Clear the credentials cache so NextAuth picks up the new values
    clearCredentialsCache();

    return NextResponse.json({
      settings: {
        id: settings.id,
        oauthClientId: settings.oauthClientId,
        hasOauthClientId: !!settings.oauthClientId,
        oauthClientSecret: settings.oauthClientSecret 
          ? "****" + settings.oauthClientSecret.slice(-4) 
          : null,
        hasOauthClientSecret: !!settings.oauthClientSecret,
        searchApiKey: settings.searchApiKey 
          ? "****" + settings.searchApiKey.slice(-4) 
          : null,
        hasSearchApiKey: !!settings.searchApiKey,
        searchEngineId: settings.searchEngineId 
          ? "****" + settings.searchEngineId.slice(-4) 
          : null,
        hasSearchEngineId: !!settings.searchEngineId,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating Google settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
