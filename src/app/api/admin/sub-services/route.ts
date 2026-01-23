import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

// GET /api/admin/sub-services - Get all sub-services (optionally filtered by serviceId)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sub-services from backend
    const queryParams = serviceId ? `?serviceId=${serviceId}` : "";
    const response = await fetch(`${BACKEND_URL}/api/sub-services${queryParams}`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    const subServices = data.subServices || [];

    // For each sub-service, fetch prompts
    const subServicesWithPrompts = await Promise.all(
      subServices.map(async (subService: { id: string }) => {
        const promptsResponse = await fetch(`${BACKEND_URL}/api/sub-services/${subService.id}/prompts`, {
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
        });
        const promptsData = promptsResponse.ok ? await promptsResponse.json() : { prompts: [] };
        return { ...subService, prompts: promptsData.prompts || [] };
      })
    );

    return NextResponse.json({ subServices: subServicesWithPrompts });
  } catch (error) {
    console.error("Error fetching sub-services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/sub-services - Create a new sub-service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, slug, name, description, image, isActive } = body;

    if (!serviceId || !slug || !name) {
      return NextResponse.json(
        { error: "serviceId, slug, and name are required" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/sub-services`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceId,
        slug,
        name,
        description,
        image,
        isActive: isActive ?? true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ subService: data.subService }, { status: 201 });
  } catch (error) {
    console.error("Error creating sub-service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
