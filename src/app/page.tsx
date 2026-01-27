"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header, Footer, Background, SelectionCard, PageLoading, AuthGuard } from "@/components";
import { Service } from "@/types/database";

export default function HomePage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services/public")
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      })
      .then(data => {
        setServices(data.services || []);
      })
      .catch(error => {
        console.error("Failed to fetch services:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleServiceClick = (service: Service) => {
    const slug = service.slug || service.name?.toLowerCase().replace(/\s+/g, "-");
    if (slug) {
      router.push(`/${slug}`);
    }
  };

  const servicesWithIcons = useMemo(() => 
    services.map((service) => {
      const imageSources = service.images?.length > 0
        ? service.images
        : [];

      return {
        ...service,
        icons: imageSources.map((src: string, idx: number) => ({
          src,
          alt: `${service.name} ${idx + 1}`
        })),
        href: `/${service.slug || service.name?.toLowerCase().replace(/\s+/g, "-") || "#"}`
      };
    }),
    [services]
  );

  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col">
        <Background />
        <Header />

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
            <h2 className="text-white text-2xl font-bold tracking-wide mb-8 uppercase">
              WHAT KIND OF MAGIC DO YOU NEED TODAY?
            </h2>

            {servicesWithIcons.length === 0 ? (
              <div className="text-white/70">No services available</div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6">
                {servicesWithIcons.map((service) => (
                  <SelectionCard
                    key={service.id}
                    title={service.name}
                    href={service.href}
                    icons={service.icons}
                    onClick={() => handleServiceClick(service)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <Footer />
      </main>
    </AuthGuard>
  );
}
