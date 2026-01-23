import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { UserRole } from "@/types/database";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Admin routes require authentication, keep dynamic
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/form-fields/[fieldId]
 * Update a form field
 * Requires admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { fieldId } = await params;
    const body = await request.json();

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly to avoid recursion
    const response = await fetch(`${BACKEND_URL}/api/form-fields/${fieldId}`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: body.label,
        placeholder: body.placeholder,
        helpText: body.helpText,
        fieldType: body.fieldType,
        fieldLayout: body.fieldLayout,
        isRequired: body.isRequired,
        isActive: body.isActive,
        minLength: body.minLength,
        maxLength: body.maxLength,
        pattern: body.pattern,
        options: body.options,
        defaultValue: body.defaultValue,
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
      message: "Form field updated successfully",
    });
  } catch (error) {
    console.error("Error updating form field:", error);
    return NextResponse.json(
      { error: "Failed to update form field" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/form-fields/[fieldId]
 * Delete a form field
 * Requires admin role
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { fieldId } = await params;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend directly to avoid recursion
    const response = await fetch(`${BACKEND_URL}/api/form-fields/${fieldId}`, {
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
      message: "Form field deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting form field:", error);
    return NextResponse.json(
      { error: "Failed to delete form field" },
      { status: 500 }
    );
  }
}
