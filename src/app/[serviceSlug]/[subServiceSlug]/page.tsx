"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header, Footer, Background, FormCard, FormField as FormFieldWrapper, LoadingOverlay, AuthGuard, FormMessage, PageLoading } from "@/components";
import { searchStream, TopResult, TitlesBody } from "@/lib/api";

interface DynamicFormField {
  id: string;
  fieldId: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  fieldType: string;
  fieldLayout: string;
  isRequired: boolean;
  minLength: number | null;
  maxLength: number | null;
  pattern: string | null;
  options: Record<string, unknown> | null;
  defaultValue: string | null;
  sortOrder: number;
}

export default function DynamicSubServicePage() {
  const params = useParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const subServiceSlug = params.subServiceSlug as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [formError, setFormError] = useState("");
  const [formFields, setFormFields] = useState<DynamicFormField[]>([]);
  const [subService, setSubService] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Normalize slug once
  const normalizedSlug = useMemo(() => {
    if (!subServiceSlug) return '';
    return subServiceSlug.replace(/-/g, "_");
  }, [subServiceSlug]);

  // Fetch sub-service and form fields in parallel
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        // Use subServiceSlug (with hyphens) for API calls - APIs will normalize internally
        // Add cache: 'no-store' to prevent browser caching
        const [serviceResponse, fieldsResponse] = await Promise.all([
          fetch(`/api/sub-services/slug/${subServiceSlug}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          }),
          fetch(`/api/form-fields/${subServiceSlug}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          }),
        ]);

        if (cancelled) return;

        // Process service data
        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json();
          if (serviceData.service) {
            setSubService({ id: serviceData.service.id, name: serviceData.service.name });
            setServiceAvailable(serviceData.service.isActive || false);
            setServiceName(serviceData.service.name || "");
          } else {
            setServiceAvailable(false);
          }
        } else {
          const errorData = await serviceResponse.json().catch(() => ({}));
          console.error("Error fetching service:", errorData);
          setServiceAvailable(false);
        }

        // Process form fields
        if (fieldsResponse.ok) {
          const fieldsData = await fieldsResponse.json();
          const fields = fieldsData.formFields || [];
          console.log("Form fields received:", fields.length, fields);
          setFormFields(fields);

          // Initialize form data with defaults
          const initialData: Record<string, string> = {};
          fields.forEach((field: DynamicFormField) => {
            initialData[field.fieldId] = field.defaultValue || "";
          });
          setFormData(initialData);
        } else {
          const errorData = await fieldsResponse.json().catch(() => ({}));
          console.error("Error fetching form fields:", fieldsResponse.status, errorData);
          setFormFields([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error in fetchData:", error);
          setServiceAvailable(false);
          setFormFields([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPage(false);
        }
      }
    };

    if (subServiceSlug) {
      fetchData();
    } else {
      setIsLoadingPage(false);
    }
    return () => { cancelled = true; };
  }, [subServiceSlug]);

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!serviceAvailable || !subService?.id) {
      setFormError("Service is unavailable or still loading. Please try again.");
      return;
    }

    // Validate required fields
    const missingFields = formFields
      .filter((field) => field.isRequired && !formData[field.fieldId]?.trim())
      .map((field) => field.label);

    if (missingFields.length > 0) {
      setFormError(`Please fill in: ${missingFields.join(", ")}`);
      return;
    }

    setIsLoading(true);
    setFormError("");

    try {
      // Prepare the request data
      const requestData = {
        ...formData,
        spellType: normalizedSlug,
        subServiceId: subService.id,
        storeName: formData.store || '',
        location: formData.location || '',
      };

      // Build API form data
      const apiFormData: Record<string, string> = {};
      Object.entries(requestData).forEach(([key, value]) => {
        if (key !== "spellType" && key !== "subServiceId" && typeof value === "string") {
          apiFormData[key] = value;
        }
      });

      // Clear previous results
      localStorage.removeItem("seoai_search_results");
      
      // Save request data for results page to continue streaming
      localStorage.setItem("seoai_search_request", JSON.stringify(requestData));

      // Track results as they come in
      const results: { 
        topResults: TopResult[] | string; 
        topResultsType: "array" | "html"; 
        titlesBody: TitlesBody | null; 
        intent: string; 
        blueprint: string;
        hasNavigated?: boolean;
      } = { 
        topResults: [], 
        topResultsType: "array",
        titlesBody: null,
        intent: "", 
        blueprint: "",
        hasNavigated: false
      };

      let hasNavigated = false;

      // Start streaming - navigate to results when first result arrives
      await searchStream({
        ...requestData,
        formData: apiFormData,
        storeName: formData.store || '',
        location: formData.location || '',
        spellType: requestData.spellType as "high-authority" | "collection" | "product" | "geo-collection" | "geo-product"
      }, {
        onTitles: (titles: TitlesBody) => {
          // Titles arrive first - save immediately
          results.titlesBody = titles;
          localStorage.setItem("seoai_search_results", JSON.stringify(results));
        },
        onTopResults: (topResults) => {
          if (Array.isArray(topResults)) {
            results.topResults = topResults;
            results.topResultsType = "array";
          } else if (typeof topResults === "string") {
            const cleaned = topResults.replace(/```html|```/gi, "").trim();
            results.topResults = cleaned;
            results.topResultsType = "html";
          }
          
          // Save and navigate when we get top results (titles should already be set)
          if (!hasNavigated) {
            hasNavigated = true;
            results.hasNavigated = true;
            localStorage.setItem("seoai_search_results", JSON.stringify(results));
            startTransition(() => {
              router.push("/results");
            });
          }
        },
        onIntent: (intentData) => {
          const cleaned = intentData.replace(/```html|```/gi, "").trim();
          results.intent = cleaned;
          localStorage.setItem("seoai_search_results", JSON.stringify(results));
        },
        onBlueprint: (blueprintData) => {
          const cleaned = blueprintData.replace(/```html|```/gi, "").trim();
          results.blueprint = cleaned;
          localStorage.setItem("seoai_search_results", JSON.stringify(results));
        },
        onError: (err) => {
          if (!hasNavigated) {
            setFormError(err);
            setIsLoading(false);
          }
        },
      });

    } catch {
      setFormError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const renderFormField = useCallback((field: DynamicFormField) => {
    const value = formData[field.fieldId] || "";
    const isTextarea = field.fieldType === "TEXTAREA";
    const inputType = field.fieldType === "EMAIL" ? "email" 
      : field.fieldType === "URL" ? "url"
      : field.fieldType === "NUMBER" ? "number"
      : "text";

    const inputProps: React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement> = {
      className: "genie-input",
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        handleFieldChange(field.fieldId, e.target.value);
      },
      placeholder: field.placeholder || undefined,
      required: field.isRequired,
    };

    if (isTextarea) {
      inputProps.rows = 4;
    } else {
      inputProps.type = inputType;
      if (field.minLength) inputProps.minLength = field.minLength;
      if (field.maxLength) inputProps.maxLength = field.maxLength;
      if (field.pattern) inputProps.pattern = field.pattern;
    }

    return (
      <FormFieldWrapper key={field.id} label={field.label}>
        {isTextarea ? <textarea {...inputProps} /> : <input {...inputProps} />}
        {field.helpText && <p className="text-xs text-white/50 mt-1">{field.helpText}</p>}
      </FormFieldWrapper>
    );
  }, [formData, handleFieldChange]);

  const sortedFields = useMemo(() => 
    [...formFields].sort((a, b) => a.sortOrder - b.sortOrder),
    [formFields]
  );

  const hasHalfLayout = useMemo(() => 
    formFields.some((f) => f.fieldLayout === "HALF"),
    [formFields]
  );

  const pageTitle = useMemo(() => 
    serviceName ? serviceName.toUpperCase() : "",
    [serviceName]
  );

  // Show loading inline while page is loading
  if (isLoadingPage) {
    return (
      <AuthGuard>
        <main className="min-h-screen flex flex-col">
          <Background />
          <Header />
          <PageLoading />
          <Footer />
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col">
        <Background />
        <LoadingOverlay isVisible={isLoading} />
        <Header />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          {serviceName && (
            <h2 className="text-white text-2xl font-black tracking-wide mb-8 uppercase">
              {pageTitle}
            </h2>
          )}

          {!serviceAvailable ? (
            <div className="text-center py-8">
              <div className="text-white mb-4">⚠️</div>
              <div className="text-white/70">
                This service is currently unavailable. Please contact the administrator.
              </div>
            </div>
          ) : sortedFields.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/70">
                No form fields configured. Please contact the administrator.
              </div>
            </div>
          ) : (
            <FormCard onSubmit={handleSubmit}>
              {formError && <FormMessage message={formError} type="error" />}

              <div className={hasHalfLayout ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                {sortedFields.map(renderFormField)}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent-purple hover:bg-accent-purple/80 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Processing..." : "SHOW ME THE MAGIC"}
              </button>
            </FormCard>
          )}
        </div>

        <Footer />
      </main>
    </AuthGuard>
  );
}
