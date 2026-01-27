import { NextRequest, NextResponse } from "next/server";
import { urlToDbSlug } from "@/lib/slug-utils";
import { validateServiceRoute } from "@/lib/route-guards";

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://backend:3001";

/**
 * GET /api/services/[serviceSlug]/sub-services
 * Get all active sub-services for a service category
 * Public endpoint - used to determine navigation logic
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

    // Get service by slug from backend (public route)
    const serviceResponse = await fetch(`${BACKEND_URL}/api/services/slug/${normalizedSlug}/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!serviceResponse.ok) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 404 }
      );
    }

    const serviceData = await serviceResponse.json();
    const service = serviceData.service;
    const subServices = serviceData.subServices;

    // Filter only active sub-services
    const activeSubServices = (subServices || []).filter((s: Record<string, unknown>) => s.isActive);

    return NextResponse.json({
      service: {
        id: service.id,
        slug: service.slug,
        name: service.name,
        description: service.description,
      },
      subServices: activeSubServices,
      count: serviceData.count,
    });
  } catch (error) {
    console.error("Error fetching sub-services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
