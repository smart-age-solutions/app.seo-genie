import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole, FieldType, FieldLayout } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/form-fields?subServiceId=xxx
 * Get all form fields for a sub-service
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const subServiceId = searchParams.get("subServiceId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    if (!subServiceId) {
      return NextResponse.json(
        { error: "subServiceId is required" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly to avoid recursion
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
      { error: "Failed to fetch form fields" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/form-fields
 * Create a new form field
 * Requires admin role
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
    const {
      subServiceId,
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

    // Validate required fields
    if (!subServiceId || !fieldId || !label) {
      return NextResponse.json(
        { error: "Missing required fields: subServiceId, fieldId, label" },
        { status: 400 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly to avoid recursion
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
    return NextResponse.json({
      formField: data.formField,
      message: "Form field created successfully",
    });
  } catch (error) {
    console.error("Error creating form field:", error);
    return NextResponse.json(
      { error: "Failed to create form field" },
      { status: 500 }
    );
  }
}
