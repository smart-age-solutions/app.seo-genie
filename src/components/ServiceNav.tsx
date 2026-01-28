"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface SubService {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  image: string | null;
}

interface Service {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  subServices: SubService[];
}

export function ServiceNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch("/api/services/navigation", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
        } else {
          console.error("Error fetching services:", response.status, response.statusText);
          setServices([]);
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const getSubServiceRoute = useCallback((serviceSlug: string, subServiceSlug: string) => {
    const serviceRoute = serviceSlug.replace(/_/g, "-");
    const subServiceRoute = subServiceSlug.replace(/_/g, "-");
    return `/${serviceRoute}/${subServiceRoute}`;
  }, []);

  const getServiceHref = useCallback((service: Service) => {
    if (service.subServices.length === 1) {
      const subService = service.subServices[0];
      return getSubServiceRoute(service.slug, subService.slug);
    } else if (service.subServices.length > 1) {
      // Use consistent slug conversion
      return `/${service.slug.replace(/_/g, "-")}`;
    }
    return "#";
  }, [getSubServiceRoute]);

  const currentCategory = useMemo(() => {
    for (const service of services) {
      // Use consistent slug conversion
      const serviceRoute = service.slug.replace(/_/g, "-");
      if (pathname === `/${serviceRoute}` || pathname.startsWith(`/${serviceRoute}/`)) {
        return service.name;
      }
    }
    return null;
  }, [services, pathname]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span className="text-sm font-medium">Services</span>
        {currentCategory && (
          <span className="text-xs bg-accent-purple/50 px-2 py-0.5 rounded">
            {currentCategory}
          </span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-primary-dark/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden">
          <Link href="/" prefetch className={`flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10 ${pathname === "/" ? "bg-white/10" : ""}`}>
            <span className="text-white font-medium">Home</span>
          </Link>

          {isLoading ? (
            <div className="px-4 py-3 text-white/50 text-sm">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="px-4 py-3 text-white/50 text-sm">No services available</div>
          ) : (
            services.map((service) => {
              // Use consistent slug conversion
              const serviceRoute = service.slug.replace(/_/g, "-");
              const serviceHref = getServiceHref(service);
              const isActive = pathname === `/${serviceRoute}` || pathname.startsWith(`/${serviceRoute}/`);

              return (
                <div key={service.id} className="border-b border-white/10 last:border-b-0">
                  <Link href={serviceHref} prefetch className={`flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${isActive ? "bg-white/10" : ""}`}>
                    {service.icon ? (
                      <div className="w-5 h-5 relative">
                        <Image src={service.icon} alt={service.name} fill className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <span className="text-lg">📋</span>
                    )}
                    <span className="text-white font-bold">{service.name}</span>
                    <span className="text-white/50 text-xs ml-auto">
                      {service.subServices.length} {service.subServices.length === 1 ? "service" : "services"}
                    </span>
                  </Link>

                  {service.subServices.length > 0 && (
                    <div className="bg-black/20">
                      {service.subServices.map((subService) => {
                        const subServiceHref = getSubServiceRoute(service.slug, subService.slug);
                        const isSubServiceActive = pathname === subServiceHref; 
                        const imageSrc = subService.image;

                        return (
                          <Link
                            key={subService.id}
                            href={subServiceHref}
                            prefetch
                            className={`flex items-center gap-3 px-4 py-2.5 pl-8 hover:bg-white/10 transition-colors ${isSubServiceActive ? "bg-accent-purple/30 border-l-2 border-accent-purple" : ""}`}
                          >
                            {imageSrc ? (
                              <div className="w-4 h-4 relative">
                                <Image src={imageSrc} alt={subService.name} fill className="object-contain" unoptimized />
                              </div>
                            ) : (
                              <span className="text-base">•</span>
                            )}
                            <span className="text-white/90 text-sm">{subService.name}</span>
                            {isSubServiceActive && <span className="ml-auto text-accent-purple text-xs">●</span>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
