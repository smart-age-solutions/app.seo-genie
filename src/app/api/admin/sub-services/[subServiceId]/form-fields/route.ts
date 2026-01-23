import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isManagerOrAdmin } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { FieldType, FieldLayout } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

// GET /api/admin/sub-services/[subServiceId]/form-fields - Get all form fields for a sub-service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subServiceId } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly
    const url = `${BACKEND_URL}/api/sub-services/${subServiceId}/form-fields${includeInactive ? "?includeInactive=true" : ""}`;
    const response = await fetch(url, {
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
    console.error("Error fetching form fields:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/sub-services/[subServiceId]/form-fields - Create a new form field
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
    const {
      fieldId,
      label,
      placeholder,
      helpText,
      fieldType,
      fieldLayout,
      isRequired,
      isActive,
      minLength,
      maxLength,
      pattern,
      options,
      defaultValue,
    } = body;

    if (!fieldId || !label) {
      return NextResponse.json(
        { error: "fieldId and label are required" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/sub-services/${subServiceId}/form-fields`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fieldId,
        label,
        placeholder: placeholder || null,
        helpText: helpText || null,
        fieldType: fieldType || FieldType.TEXT,
        fieldLayout: fieldLayout || FieldLayout.FULL,
        isRequired: isRequired ?? false,
        isActive: isActive ?? true,
        minLength: minLength || null,
        maxLength: maxLength || null,
        pattern: pattern || null,
        options: options || null,
        defaultValue: defaultValue || null,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating form field:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
