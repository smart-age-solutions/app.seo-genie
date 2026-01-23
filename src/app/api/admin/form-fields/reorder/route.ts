import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/form-fields/reorder
 * Reorder form fields
 * Requires admin role
 * 
 * Body: { fieldIds: string[] } - Array of field IDs in the desired order
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subServiceId, fieldIds } = body as { subServiceId: string; fieldIds: string[] };

    if (!subServiceId) {
      return NextResponse.json(
        { error: "subServiceId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid fieldIds array" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/sub-services/${subServiceId}/form-fields/reorder`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fieldIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    return NextResponse.json({
      message: "Form fields reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering form fields:", error);
    return NextResponse.json(
      { error: "Failed to reorder form fields" },
      { status: 500 }
    );
  }
}
