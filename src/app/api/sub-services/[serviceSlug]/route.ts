import { NextRequest, NextResponse } from "next/server";
import { urlToDbSlug } from "@/lib/slug-utils";
import { validateServiceRoute } from "@/lib/route-guards";

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://backend:3001";

/**
 * GET /api/services/[serviceSlug]
 * Get a sub-service by its slug (for checking if it's active/available)
 * Public endpoint - used by forms to check if service is available
 * Proxies to backend
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceSlug: string }> }
) {
  try {
    const { serviceSlug } = await params;

    // Validate route parameters
    const validation = validateServiceRoute({ serviceSlug });
    if (!validation.isValid) {
      return validation.error!;
    }

    // Normalize slug for backend
    const normalizedSlug = urlToDbSlug(serviceSlug);

    const response = await fetch(`${BACKEND_URL}/api/sub-services/slug/${normalizedSlug}/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching service status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
