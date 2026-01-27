import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://backend:3001";

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * GET /api/services/navigation
 * Returns all active services with their sub-services for navigation menu
 * Proxies to backend
 */
export async function GET() {
  try {
    // Get all active services
    const servicesResponse = await fetch(`${BACKEND_URL}/api/services/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!servicesResponse.ok) {
      throw new Error("Backend request failed");
    }

    const servicesData = await servicesResponse.json();
    const services = servicesData.services || [];

    // For each service, get its sub-services using public route
    // Use Promise.allSettled to handle cases where services may have been deleted
    const servicesWithSubServicesResults = await Promise.allSettled(
      services.map(async (service: Record<string, unknown>) => {
        try {
          const subServicesResponse = await fetch(
            `${BACKEND_URL}/api/services/${service.id}/sub-services/public`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          let subServices: Record<string, unknown>[] = [];
          if (subServicesResponse.ok) {
            const subServicesData = await subServicesResponse.json();
            subServices = subServicesData.subServices || [];
          } else if (subServicesResponse.status === 404) {
            // Service or sub-services not found - skip this service
            console.warn(`Service ${service.id} (${service.slug}) not found or has no sub-services`);
            return null;
          }

          // Use same image loading logic as homepage: images array > image > icon
          const imagesArray = Array.isArray(service.images) ? service.images : [];
          const imageSources = imagesArray.length > 0
            ? imagesArray
            : service.image
            ? [service.image]
            : [];
          
          const serviceIcon = imageSources.length > 0 ? (imageSources[0] as string) : (service.icon as string | undefined);

          return {
            id: service.id,
            slug: service.slug,
            name: service.name,
            icon: serviceIcon,
            subServices: subServices.map((s: Record<string, unknown>) => ({
              id: s.id as string,
              slug: s.slug as string,
              name: s.name as string,
              subtitle: s.subtitle as string | null,
              image: s.image as string | null,
              isActive: s.isActive as boolean,
            })),
          };
        } catch (error) {
          console.error(`Error fetching sub-services for service ${service.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null results (services that failed to load or don't exist)
    const servicesWithSubServices = servicesWithSubServicesResults
      .map((result) => result.status === "fulfilled" ? result.value : null)
      .filter((service): service is NonNullable<typeof service> => service !== null);

    return NextResponse.json({
      services: servicesWithSubServices,
    });
  } catch (error) {
    console.error("Error fetching services for navigation:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
