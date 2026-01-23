import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Admin routes require authentication, keep dynamic
export const dynamic = 'force-dynamic';

// GET /api/admin/services-categories/[serviceId] - Get a specific service category
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch service from backend
    const serviceResponse = await fetch(`${BACKEND_URL}/api/services/${serviceId}`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!serviceResponse.ok) {
      const errorData = await serviceResponse.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: serviceResponse.status });
    }

    const serviceData = await serviceResponse.json();
    const service = serviceData.service || serviceData;

    // Fetch sub-services
    const subServicesResponse = await fetch(`${BACKEND_URL}/api/sub-services?serviceId=${serviceId}`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });
    
    const subServicesData = subServicesResponse.ok ? await subServicesResponse.json() : { subServices: [] };
    const subServices = subServicesData.subServices || [];

    // Fetch prompts for each sub-service
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

    return NextResponse.json({ service: { ...service, subServices: subServicesWithPrompts } });
  } catch (error) {
    console.error("Error fetching service category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/services-categories/[serviceId] - Update a service category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceId } = await params;
    const body = await request.json();

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/services/${serviceId}`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        description: body.description,
        image: body.image,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ service: data.service || data });
  } catch (error) {
    console.error("Error updating service category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services-categories/[serviceId] - Delete a service category
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/services/${serviceId}`, {
      method: "DELETE",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
