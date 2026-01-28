"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Header, Footer, Background, SpellCard, AuthGuard, PageLoading } from "@/components";

interface SubService {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  image: string | null;
  isActive: boolean;
}

interface ServiceInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export default function ServiceSubServicesPage() {
  const params = useParams();
  const serviceSlug = params.serviceSlug as string;
  
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [subServices, setSubServices] = useState<SubService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubServices = async () => {
      try {
        const response = await fetch(`/api/services/${serviceSlug}/sub-services`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setService(data.service);
          setSubServices(data.subServices || []);
        }
      } catch {
        // Silent error handling
      } finally {
        setIsLoading(false);
      }
    };

    if (serviceSlug) {
      fetchSubServices();
    }
  }, [serviceSlug]);

  const pageTitle = useMemo(() => 
    service 
      ? `WHAT KIND OF ${service.name.toUpperCase()} MAGIC DO YOU NEED TODAY?`
      : "WHAT KIND OF MAGIC DO YOU NEED TODAY?",
    [service]
  );

  const subServicesWithRoutes = useMemo(() => {
    if (!serviceSlug) return [];

    return subServices.map((subService) => {
      const routeSlug = subService.slug.replace(/_/g, "-");

      return {
        ...subService,
        route: `/${serviceSlug}/${routeSlug}`
      };
    });
  }, [subServices, serviceSlug]);

  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col">
        <Background />
        <Header />

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
            <h2 className="text-white text-xl font-bold tracking-wide mb-8 uppercase">
              {pageTitle}
            </h2>

            {subServicesWithRoutes.length === 0 ? (
              <div className="text-white/70">No services available</div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6">
                {subServicesWithRoutes.map((subService) => (
                  <SpellCard
                    key={subService.id}
                    title={subService.name}
                    subtitle={subService.subtitle || ""}
                    description={subService.description || ""}
                    imageSrc={subService.image || ""}
                    imageAlt={subService.name}
                    href={subService.route}
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
