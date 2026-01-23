import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

/**
 * GET /api/services/public
 * Returns all active service categories for display on the home page
 * Public endpoint - no authentication required
 */
export async function GET() {
  console.log("API: Fetching public services");
  try {
    const response = await fetch(`${BACKEND_URL}/api/services/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("API: Backend response status:", response.status);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    console.log("API: Returning services data, count:", data.services?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching public services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}