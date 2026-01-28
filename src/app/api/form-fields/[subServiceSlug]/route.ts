import { NextRequest, NextResponse } from "next/server";
import { urlToDbSlug } from "@/lib/slug-utils";
import { validateSubServiceRoute } from "@/lib/route-guards";

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://backend:3001";

/**
 * GET /api/form-fields/[subServiceSlug]
 * Get all active form fields for a sub-service (public endpoint)
 * Used by the dynamic form page to render the form
 * Proxies to backend public endpoint
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subServiceSlug: string }> }
) {
  try {
    const { subServiceSlug } = await params;

    // Validate route parameters
    const validation = validateSubServiceRoute({ subServiceSlug });
    if (!validation.isValid) {
      return validation.error!;
    }

    // Normalize slug for backend
    const normalizedSlug = urlToDbSlug(subServiceSlug);

    const response = await fetch(`${BACKEND_URL}/api/form-fields/${normalizedSlug}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Sub-service not found or inactive" },
          { 
            status: 404,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          }
        );
      }
      throw new Error("Backend request failed");
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Error fetching form fields:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
