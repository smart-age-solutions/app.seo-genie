import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * GET /api/services/public
 * Returns all active service categories for display on the home page
 * Public endpoint - no authentication required
 */
export async function GET(request: Request) {
  console.log("[services/public] GET request received", request.url);
  // console.log("[services/public] Environment check:", {
  //   BACKEND_URL: !!process.env.BACKEND_URL,
  //   NEXT_PUBLIC_BACKEND_URL: !!process.env.NEXT_PUBLIC_BACKEND_URL,
  //   BACKEND_API_URL: !!process.env.BACKEND_API_URL,
  // });
  
  try {
    const backendUrl = `${BACKEND_URL}/api/services/public`;
    
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[services/public] Backend error:", response.status, errorText);
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // console.log("[services/public] Backend returned data:", {
    //   hasServices: !!data.services,
    //   servicesCount: data.services?.length || 0,
    //   dataKeys: Object.keys(data),
    //   fullData: JSON.stringify(data).substring(0, 200),
    // });
    
    // Ensure we return services array even if backend returns empty
    const services = data.services || [];
    
    // Prevent caching - ensure fresh data on every request
    return NextResponse.json({ services }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[services/public] Error fetching public services:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("[services/public] Stack:", error.stack);
    }
    
    // Return empty array instead of error to prevent frontend breakage
    return NextResponse.json(
      { services: [], error: errorMessage },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}