import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://backend:3001";

/**
 * GET /api/sub-services/slug/[subServiceSlug]
 * Get a sub-service by its slug (public endpoint)
 * Proxies to backend /api/sub-services/slug/:slug/public
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subServiceSlug: string }> }
) {
  try {
    const { subServiceSlug } = await params;

    if (!subServiceSlug) {
      return NextResponse.json(
        { error: "Missing subServiceSlug parameter" },
        { status: 400 }
      );
    }

    // Normalize slug (convert hyphens to underscores for DB lookup)
    const normalizedSlug = subServiceSlug.replace(/-/g, "_");

    const response = await fetch(`${BACKEND_URL}/api/sub-services/slug/${normalizedSlug}/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Sub-service not found" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching sub-service by slug:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
