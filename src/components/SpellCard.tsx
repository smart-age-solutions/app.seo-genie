"use client";

import Image from "next/image";
import Link from "next/link";

interface SpellCardProps {
  title: string;
  subtitle?: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  tag?: string;
  buttonText?: string;
}

export function SpellCard({
  title,
  subtitle,
  description,
  imageSrc,
  imageAlt,
  href,
  tag = "GOOGLE + AI",
  buttonText = "CAST THIS SPELL",
}: SpellCardProps) {
  return (
    <Link href={href} prefetch className="spell-card w-full max-w-xs cursor-pointer group">
      <div className="w-32 h-32 relative mb-4">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-contain"
        />
      </div>
      
      <span className="tag-badge mb-3">{tag}</span>
      
      <h3 className="text-xl font-black text-gray-900 mb-1 leading-tight">
        {title}
      </h3>
      {subtitle && (
        <h4 className="text-lg font-bold text-gray-800 mb-2">{subtitle}</h4>
      )}
      
      <p className="text-sm text-gray-700 mb-4">
        <span className="font-bold">Focus:</span> {description}
      </p>
      
      <button className="genie-btn w-full group-hover:opacity-90">
        {buttonText}
      </button>
    </Link>
  );
}
