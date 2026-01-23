"use client";

import Image from "next/image";

interface SelectionCardProps {
  title: string;
  href: string;
  icons: { src: string; alt: string }[];
  onClick?: () => void;
}

export function SelectionCard({ title, icons, onClick }: SelectionCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="spell-card w-72 h-96 justify-center cursor-pointer group"
    >
      <h2 className="text-5xl font-light text-gray-900 tracking-wider mb-6">
        {title}
      </h2>
      <div className="flex items-center gap-3">
        {icons.map((icon, index) => (
          <div key={index} className="w-10 h-10 relative">
            <Image
              src={icon.src}
              alt={icon.alt}
              fill
              className="object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
