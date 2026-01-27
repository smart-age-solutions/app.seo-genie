import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Admin routes require authentication, keep dynamic
export const dynamic = 'force-dynamic';

// GET /api/admin/sub-services/[subServiceId]/prompts - Get all prompts for a sub-service
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subServiceId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly to avoid recursion
    const response = await fetch(`${BACKEND_URL}/api/sub-services/${subServiceId}/prompts`, {
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
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/sub-services/[subServiceId]/prompts - Create a new prompt for a sub-service
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subServiceId } = await params;
    const body = await request.json();
    const { slug, name, description, promptType, dataSource, template, placeholders, isActive } = body;

    if (!slug || !name || !template) {
      return NextResponse.json(
        { error: "Slug, name, and template are required" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prepare request body - include dataSource if provided
    const requestBody: Record<string, unknown> = {
      slug,
      name,
      description,
      promptType: promptType,
      template,
      placeholders: placeholders || [],
      isActive: isActive ?? true,
      lastEditedBy: session.user.id,
    };

    // Include dataSource if provided (required for TOP_RESULTS prompts)
    if (dataSource) {
      requestBody.dataSource = dataSource;
    }

    // Call backend directly to avoid recursion
    const response = await fetch(`${BACKEND_URL}/api/sub-services/${subServiceId}/prompts`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating prompt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
