"use client";

export function PageLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
      <div className="flex flex-col items-center gap-4">
        <span className="star-spinner text-white text-4xl">★</span>
        <p className="text-white/70 text-lg">Loading...</p>
      </div>
    </div>
  );
}
