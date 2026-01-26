import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Admin routes require authentication, keep dynamic
export const dynamic = 'force-dynamic';

// GET /api/admin/services/[serviceId]/prompts/[promptId] - Get a specific prompt
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; promptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { promptId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/prompts/${promptId}`, {
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching prompt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/services/[serviceId]/prompts/[promptId] - Update a prompt
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; promptId: string }> }
) {

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, promptType, template, placeholders, isActive, sortOrder } = body;

    const updateData: Record<string, unknown> = {
      lastEditedBy: session.user.id,
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (promptType !== undefined) updateData.promptType = promptType;
    if (template !== undefined) updateData.template = template;
    if (placeholders !== undefined) updateData.placeholders = placeholders;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const { promptId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/prompts/${promptId}`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services/[serviceId]/prompts/[promptId] - Delete a prompt
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; promptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { promptId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/prompts/${promptId}`, {
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
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
