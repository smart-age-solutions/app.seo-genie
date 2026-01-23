import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings/ai - Get AI settings
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/settings/ai`, {
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

    // Only admin can see API key (masked)
    const isAdminUser = isAdmin(session.user.role);
    
    return NextResponse.json({
      settings: {
        ...settings,
        apiKey: isAdminUser && settings.apiKey 
          ? "sk-****" + settings.apiKey.slice(-4) 
          : null,
        hasApiKey: !!settings.apiKey,
      },
    });
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings/ai - Update AI settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { aiProvider, aiModel, temperature, maxTokens, apiKey } = body;

    // Only admin can update API key
    if (apiKey !== undefined && !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Only admin can update API key" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (aiProvider !== undefined) updateData.aiProvider = aiProvider;
    if (aiModel !== undefined) updateData.aiModel = aiModel;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    
    // Handle API key - only if admin and not the masked version
    if (apiKey !== undefined && isAdmin(session.user.role)) {
      if (apiKey === null || apiKey === "") {
        updateData.apiKey = null;
      } else if (!apiKey.startsWith("sk-****")) {
        updateData.apiKey = apiKey;
      }
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/settings/ai`, {
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

    return NextResponse.json({
      settings: {
        ...settings,
        apiKey: isAdmin(session.user.role) && settings.apiKey 
          ? "sk-****" + settings.apiKey.slice(-4) 
          : null,
        hasApiKey: !!settings.apiKey,
      },
    });
  } catch (error) {
    console.error("Error updating AI settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
