import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

// GET /api/auth/google-status - Get Google OAuth credentials
// This is a public route - no auth required (used by NextAuth during initialization)
export async function GET() {
  try {
    // Use public endpoint to get Google OAuth credentials
    const response = await fetch(`${BACKEND_URL}/api/public/settings/google`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ settings: null });
    }

    const data = await response.json();
    const settings = data.settings || data;

    // Return settings with credentials for NextAuth to use
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching Google OAuth settings:", error);
    return NextResponse.json({ settings: null });
  }
}
