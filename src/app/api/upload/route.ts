import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Upload image(s) - proxies to backend API
 * Supports both single and multiple image uploads
 * 
 * Single image: FormData with "file" or "image" field
 * Multiple images: FormData with "images" field (array)
 * Optional: "folder" field in FormData
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      console.log("[upload] No auth header found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get form data from request
    const formData = await request.formData();
    
    // Check if it's multiple images upload
    const imagesField = formData.getAll("images");
    const fileField = formData.get("file");
    const imageField = formData.get("image");
    const folder = formData.get("folder") as string | null;

    // console.log("[upload] Form data parsed:", {
    //   hasImages: imagesField.length > 0,
    //   hasFile: !!fileField,
    //   hasImage: !!imageField,
    //   hasFolder: !!folder,
    // });

    // Determine if it's multiple images or single image
    const isMultipleUpload = imagesField.length > 0 || (formData.getAll("images").length > 0);

    if (isMultipleUpload) {
      // Multiple images upload - use /api/upload/images
      const images = imagesField.length > 0 
        ? imagesField 
        : formData.getAll("images");
      
      if (images.length === 0) {
        return NextResponse.json(
          { error: "No images provided" },
          { status: 400 }
        );
      }

      // Validate all files
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      for (const file of images) {
        if (file instanceof File) {
          if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
              { error: `Invalid file type: ${file.type}. Only JPEG, PNG, WebP, and SVG are allowed.` },
              { status: 400 }
            );
          }
          if (file.size > maxSize) {
            return NextResponse.json(
              { error: `File too large: ${file.name}. Maximum size is 5MB.` },
              { status: 400 }
            );
          }
        }
      }

      // Create FormData for backend
      const backendFormData = new FormData();
      images.forEach((file) => {
        backendFormData.append("images", file);
      });
      if (folder) {
        backendFormData.append("folder", folder);
      }

      // Forward to backend API: POST /api/upload/images
      const backendUrl = `${BACKEND_URL}/api/upload/images`;
      console.log("[upload] Sending to backend:", backendUrl);
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
        },
        body: backendFormData,
      });

      console.log("[upload] Backend response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("[upload] Backend error:", response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Backend upload failed" };
        }
        return NextResponse.json(
          { error: errorData.error || "Failed to upload images" },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log("[upload] Backend returned:", { urlsCount: data.urls?.length || 0 });
      // Backend returns: { urls: string[], count: number, message: string }
      return NextResponse.json(data);
    } else {
      // Single image upload - use /api/upload/image
      const file = (fileField || imageField) as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed." },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 5MB." },
          { status: 400 }
        );
      }

      // Create FormData for backend
      // Backend expects field name "image" (not "file")
      const backendFormData = new FormData();
      backendFormData.append("image", file);
      if (folder) {
        backendFormData.append("folder", folder);
      }

      // console.log("[upload] File details:", {
      //   name: file.name,
      //   type: file.type,
      //   size: file.size,
      //   hasFolder: !!folder,
      // });

      // Forward to backend API: POST /api/upload/image
      // Note: Don't set Content-Type header - fetch will set it automatically with boundary
      const backendUrl = `${BACKEND_URL}/api/upload/image`;
      // console.log("[upload] Sending to backend:", backendUrl);
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
        },
        body: backendFormData,
      });

      // console.log("[upload] Backend response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("[upload] Backend error:", response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Backend upload failed" };
        }
        return NextResponse.json(
          { error: errorData.error || "Failed to upload file" },
          { status: response.status }
        );
      }

      const data = await response.json();
      // console.log("[upload] Backend returned:", { url: data.url });
      // Backend returns: { url: string, message: string }
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("[upload] Error uploading file:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[upload] Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: "Failed to upload file",
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Delete an uploaded image - proxies to backend API
 * Expects URL parameter or body with "url" or "filename"
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Try to get URL from query params first, then from body
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get("url") || searchParams.get("filename");

    // If not in query params, try body
    if (!imageUrl) {
      try {
        const body = await request.json();
        imageUrl = body.url || body.filename;
      } catch {
        // Body might not be JSON, that's okay
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No URL or filename provided" },
        { status: 400 }
      );
    }

    // Security: Basic validation
    if (imageUrl.includes("..") || imageUrl.includes("//")) {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    // Forward to backend API
    // Note: Backend DELETE endpoint might need to be checked
    // For now, we'll try /api/upload with query param
    const deleteUrl = `${BACKEND_URL}/api/upload?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Authorization": authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend delete failed" }));
      return NextResponse.json(
        { error: errorData.error || "Failed to delete file" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
