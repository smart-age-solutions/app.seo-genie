"use client";

import { useState } from "react";
import Image from "next/image";

interface MultiImageUploadProps {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function MultiImageUpload({ label, images, onChange, maxImages = 3 }: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.");
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setError(null);
    setIsUploading(index);

    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload image");
      }

      const data = await response.json();
      
      // Update images array - ensure array is large enough
      const newImages = [...images];
      // Fill with empty strings if needed to reach the index
      while (newImages.length <= index) {
        newImages.push("");
      }
      newImages[index] = data.url;
      // Remove trailing empty strings but keep the structure
      onChange(newImages);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload image");
    } finally {
      setIsUploading(null);
    }
  };

  const handleRemove = async (index: number) => {
    const imageUrl = images[index];
    if (!imageUrl) return;

    try {
      // Delete from server
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl }),
      });

      // Remove from array
      const newImages = images.filter((_, i) => i !== index);
      onChange(newImages);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete image");
    }
  };

  // Always show at least 1 slot, or images.length + 1 if we can add more (up to maxImages)
  const canAddMore = images.length < maxImages;
  const slotsToShow = images.length === 0 
    ? 1  // Show at least 1 slot when empty
    : canAddMore 
      ? images.length + 1  // Show current images + 1 empty slot
      : images.length;  // Show all slots when at max
  const slots = Array.from({ length: slotsToShow }, (_, i) => i);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/80 mb-2">
        {label}
      </label>

      <div className="grid grid-cols-3 gap-3">
        {slots.map((slotIndex) => {
          const imageUrl = images[slotIndex];
          const isEmptySlot = !imageUrl && slotIndex >= images.length;
          
          return (
            <div key={slotIndex} className="relative group">
              <div className="aspect-square rounded-md border border-white/10 bg-gray-800/30 overflow-hidden relative transition-all hover:border-purple-500/40 hover:bg-gray-800/40">
                {imageUrl ? (
                  <>
                    <Image
                      src={imageUrl}
                      alt={`Image ${slotIndex + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(slotIndex)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-500/90 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
                      title="Remove image"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-purple-500/5 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                      onChange={(e) => handleFileChange(e, slotIndex)}
                      className="hidden"
                      disabled={isUploading === slotIndex || isUploading !== null}
                    />
                    {isUploading === slotIndex ? (
                      <div className="text-purple-400">
                        <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="text-center text-white/40">
                        <svg className="mx-auto h-8 w-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[10px] font-medium">{isEmptySlot ? "Upload" : "Replace"}</span>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}

      <p className="text-[10px] text-white/40 mt-1">
        JPEG, PNG, WebP, SVG • Max 5MB
      </p>
    </div>
  );
}
