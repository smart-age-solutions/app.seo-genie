import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Admin routes require authentication, keep dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/services
 * Returns all service categories with their sub-services and prompts
 * Requires admin or manager role
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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

    // For each service, fetch sub-services and their prompts
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

    return NextResponse.json({
      services: servicesWithDetails,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
