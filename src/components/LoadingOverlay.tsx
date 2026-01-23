"use client";

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

export function LoadingOverlay({
  message = "Fetching Magical Insights...",
  isVisible,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <span className="star-spinner">★</span>
      <span className="text-white text-lg">{message}</span>
    </div>
  );
}
