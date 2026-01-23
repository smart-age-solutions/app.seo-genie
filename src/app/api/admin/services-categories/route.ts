import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

// GET /api/admin/services-categories - Get all service categories
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

    // Fetch services from backend
    const servicesResponse = await fetch(`${BACKEND_URL}/api/services`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!servicesResponse.ok) {
      throw new Error(`Backend error: ${servicesResponse.status}`);
    }

    const servicesData = await servicesResponse.json();
    const services = servicesData.services || [];

    // Enrich with sub-services and prompts
    const servicesWithDetails = await Promise.all(
      services.map(async (service: { id: string }) => {
        const subServicesResponse = await fetch(`${BACKEND_URL}/api/sub-services?serviceId=${service.id}`, {
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
        });
        
        const subServicesData = subServicesResponse.ok ? await subServicesResponse.json() : { subServices: [] };
        const subServices = subServicesData.subServices || [];
        
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
        return { ...service, subServices: subServicesWithPrompts };
      })
    );

    return NextResponse.json({ services: servicesWithDetails });
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/services-categories - Create a new service category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, name, description, icon, image, isActive } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Slug and name are required" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/services`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug,
        name,
        description,
        icon,
        image,
        isActive: isActive ?? true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ service: data.service }, { status: 201 });
  } catch (error) {
    console.error("Error creating service category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
