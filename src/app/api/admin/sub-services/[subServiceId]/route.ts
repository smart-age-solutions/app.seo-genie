import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Admin routes require authentication, keep dynamic
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/sub-services/[subServiceId]
 * Update a sub-service
 * Requires admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { subServiceId } = await params;
    const body = await request.json();

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/sub-services/${subServiceId}`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        subtitle: body.subtitle,
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
    return NextResponse.json({
      subService: data.subService,
    });
  } catch (error) {
    console.error("Error updating sub-service:", error);
    return NextResponse.json(
      { error: "Failed to update sub-service" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sub-services/[subServiceId]
 * Delete a sub-service (cascade deletes all associated prompts)
 * Requires admin role
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { subServiceId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/sub-services/${subServiceId}`, {
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

    return NextResponse.json({
      success: true,
      message: "Sub-service deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sub-service:", error);
    return NextResponse.json(
      { error: "Failed to delete sub-service" },
      { status: 500 }
    );
  }
}
