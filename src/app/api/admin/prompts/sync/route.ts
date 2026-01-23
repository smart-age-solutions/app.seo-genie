import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

// POST /api/admin/prompts/sync - Sync prompts to backend
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active prompts from backend API
    const promptsResponse = await fetch(`${BACKEND_URL}/api/prompt-templates`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!promptsResponse.ok) {
      throw new Error(`Failed to fetch prompts: ${promptsResponse.status}`);
    }

    const promptsData = await promptsResponse.json();
    const prompts = promptsData.prompts || promptsData || [];
    const activePrompts = prompts.filter((p: Record<string, unknown>) => p.isActive);

    // Sync each prompt to backend
    const syncResults = await Promise.all(
      activePrompts.map(async (prompt: Record<string, unknown>) => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/prompts`, {
            method: "PUT",
            headers: {
              "Authorization": authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: prompt.name,
              content: prompt.prompt,
              version: prompt.version,
            }),
          });

          if (!response.ok) {
            return {
              name: prompt.name,
              success: false,
              error: `Backend returned ${response.status}`,
            };
          }

          return {
            name: prompt.name,
            success: true,
          };
        } catch (error) {
          return {
            name: prompt.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const failed = syncResults.filter((r) => !r.success);
    
    if (failed.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Failed to sync ${failed.length} prompt(s)`,
        results: syncResults,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${activePrompts.length} prompt(s)`,
      results: syncResults,
    });
  } catch (error) {
    console.error("Error syncing prompts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
