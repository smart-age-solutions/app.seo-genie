import { NextResponse } from "next/server";

// Log at module level to verify file is being loaded
console.log("[services/public/route.ts] Module loaded at:", new Date().toISOString());

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * GET /api/services/public
 * Returns all active service categories for display on the home page
 * Public endpoint - no authentication required
 */
export async function GET(request?: Request) {
  console.log("[services/public] ===== GET handler called =====");
  console.log("[services/public] Request URL:", request?.url || "no request object");
  console.log("[services/public] BACKEND_URL:", BACKEND_URL);
  console.log("[services/public] Environment check:", {
    BACKEND_URL: !!process.env.BACKEND_URL,
    NEXT_PUBLIC_BACKEND_URL: !!process.env.NEXT_PUBLIC_BACKEND_URL,
    BACKEND_API_URL: !!process.env.BACKEND_API_URL,
  });
  
  try {
    const backendUrl = `${BACKEND_URL}/api/services/public`;
    console.log("[services/public] Fetching from backend:", backendUrl);
    
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    console.log("[services/public] Backend response status:", response.status);
    console.log("[services/public] Backend response ok:", response.ok);


    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[services/public] Backend error:", response.status, errorText);
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[services/public] Backend returned data:", {
      hasServices: !!data.services,
      servicesCount: data.services?.length || 0,
      dataKeys: Object.keys(data),
      fullData: JSON.stringify(data).substring(0, 200),
    });
    
    // Ensure we return services array even if backend returns empty
    const services = data.services || [];
    console.log("[services/public] Final services to return:", services.length);
    
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