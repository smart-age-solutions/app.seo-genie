"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { ServiceNav } from "./ServiceNav";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="w-full pt-6 pb-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Top bar with navigation and user menu */}
        {session && (
          <div className="flex justify-end items-center gap-3 mb-4">
            <ServiceNav />
            <UserMenu />
          </div>
        )}

        {/* Logo and tagline */}
        <div className="text-center">
          <p className="text-white/80 text-lg mb-4 font-light tracking-wide">
            SEO Magic for Jewelers - Powered by AI
          </p>
          <Link href="/" prefetch className="inline-block">
            <Image
              src="/images/logo.png"
              alt="SEO Genie"
              width={600}
              height={150}
              className="mx-auto max-w-[90vw] h-auto"
              priority
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
