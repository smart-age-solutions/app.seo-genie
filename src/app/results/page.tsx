"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { TopResult, TitlesBody } from "@/lib/api";
import { AuthGuard, Toast, Background, ServiceNav, UserMenu } from "@/components";
import { useSession } from "next-auth/react";
import { useTypewriter, useTypewriterHTML } from "@/hooks/useTypewriter";

export default function ResultsPage() {
  const [topResults, setTopResults] = useState<TopResult[] | string>([]);
  const [topResultsType, setTopResultsType] = useState<"array" | "html">("array");
  const [intent, setIntent] = useState("");
  const [blueprint, setBlueprint] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [intentComplete, setIntentComplete] = useState(false);
  const [blueprintReady, setBlueprintReady] = useState(false);
  const [titlesBody, setTitlesBody] = useState<TitlesBody | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasStartedRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Check if intent contains HTML tags
  const intentIsHTML = useMemo(() => {
    return typeof intent === "string" && intent.trim() !== "" && /<[a-z][\s\S]*>/i.test(intent);
  }, [intent]);

  // Typewriter for intent - use HTML typewriter if intent contains HTML, otherwise use text typewriter
  // Speed = characters per update cycle (higher = faster, updates at ~20-30fps)
  const { displayedText: displayedIntentText, isTyping: isTypingIntentText } = useTypewriter(
    intentIsHTML ? "" : intent,
    {
      speed: 12, // readable text speed
      onComplete: () => setIntentComplete(true),
    }
  );

  const { displayedHTML: displayedIntentHTML, isTyping: isTypingIntentHTML } = useTypewriterHTML(
    intentIsHTML ? intent : "",
    {
      speed: 12, // HTML content speed
      onComplete: () => setIntentComplete(true),
    }
  );

  // Set intentComplete immediately if there's no intent or if intent is empty
  useEffect(() => {
    if (!intent || intent.trim() === "") {
      setIntentComplete(true);
    }
  }, [intent]);

  // Determine if we should show blueprint (ready and intent is complete or empty)
  const shouldShowBlueprint = blueprintReady && (intentComplete || !intent || intent.trim() === "");

  // Typewriter for blueprint - only start when intent is complete (or if there's no intent)
  const { displayedHTML: displayedBlueprintHTML, isTyping: isTypingBlueprint } = useTypewriterHTML(
    shouldShowBlueprint ? blueprint : "",
    { speed: 12 } // fast smooth typing for blueprint
  );

  // Convert top results to HTML format for typewriter effect (only for array type - Google datasource)
  const topResultsContent = useMemo(() => {
    // HTML type: use HTML as it comes from API (respect as-is)
    if (topResultsType === "html" && typeof topResults === "string" && topResults) {
      return topResults;
    }
    
    // Array type: map array to formatted HTML
    if (topResultsType === "array" && Array.isArray(topResults) && topResults.length > 0) {
      return topResults
        .map(
          (result, index) => `
            <div class="border-b border-gray-300 pb-6">
              <h2 class="text-xl font-black text-gray-900 mb-2">${index + 1}. ${result.title}</h2>
              <p class="text-sm text-gray-600 mb-2">
                <span class="font-medium">URL:</span>
                <a href="${result.url}" target="_blank" rel="noopener noreferrer" class="text-accent-teal underline">${result.url}</a>
              </p>
              <p class="text-sm text-gray-700 mb-1">
                <span class="font-medium">Meta Title:</span> ${(result.meta_title || "-").replace(/\*\*/g, "")}
              </p>
              <p class="text-sm text-gray-700 mb-1">
                <span class="font-medium">Meta Description:</span> ${result.meta_description || "-"}
              </p>
              <p class="text-sm text-gray-700 mb-1">
                <span class="font-medium">H1 Heading:</span> ${(result.h1_heading || "-").replace(/\*\*/g, "")}
              </p>
              <p class="text-sm text-gray-700">
                <span class="font-medium">Estimated Content Length:</span> ~${result.estimated_content_length} words
              </p>
            </div>
          `
        )
        .join("");
    }
    
    return "";
  }, [topResultsType, topResults]);
  
  // Check if we're waiting for top results
  const waitingForTopResults = isLoading && !topResultsContent;

  const { displayedHTML: displayedTopResultsHTML, isTyping: isTypingTopResults } = useTypewriterHTML(
    topResultsContent,
    { speed: 12 } // fast smooth typing for top results
  );

  // Poll localStorage for updates from the form page's stream
  useEffect(() => {
    if (!isPolling) return;

    const pollForUpdates = () => {
      const storedResults = localStorage.getItem("seoai_search_results");
      if (!storedResults) return;
      
      try {
        const results = JSON.parse(storedResults) as {
          topResults: TopResult[] | string;
          topResultsType?: "array" | "html";
          intent: string;
          blueprint: string;
          titlesBody: TitlesBody | null;
        };
        
        // Update state with new data
        if (results.titlesBody && !titlesBody) {
          setTitlesBody(results.titlesBody);
        }
        
        if (results.intent && !intent) {
          setIntent(results.intent);
        }
        
        if (results.blueprint && !blueprint) {
          setBlueprint(results.blueprint);
          setBlueprintReady(true);
          // Stop polling when blueprint arrives (last item)
          setIsPolling(false);
        }
      } catch {
        // Ignore parse errors
      }
    };

    // Poll every 500ms
    pollingRef.current = setInterval(pollForUpdates, 500);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isPolling, titlesBody, intent, blueprint]);

  // Load on mount - read from localStorage and start polling for updates
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const storedResults = localStorage.getItem("seoai_search_results");
    if (storedResults) {
      try {
        const results = JSON.parse(storedResults) as {
          topResults: TopResult[] | string;
          topResultsType?: "array" | "html";
          intent: string;
          blueprint: string;
          titlesBody: TitlesBody | null;
          hasNavigated?: boolean;
        };
        
        let resultsType: "array" | "html" = results.topResultsType || "array";
        if (!results.topResultsType && results.titlesBody?.topResultsDataSource) {
          resultsType = results.titlesBody.topResultsDataSource === "GOOGLE" ? "array" : "html";
        } else if (!results.topResultsType) {
          resultsType = Array.isArray(results.topResults) ? "array" : "html";
        }
        
        // Set initial data
        setTopResults(results.topResults || (resultsType === "array" ? [] : ""));
        setTopResultsType(resultsType);
        setIntent(results.intent || "");
        setBlueprint(results.blueprint || "");
        setTitlesBody(results.titlesBody || null);
        
        const hasBlueprint = !!(results.blueprint && results.blueprint.trim() !== "");
        setBlueprintReady(hasBlueprint);
        
        if (!results.intent || results.intent.trim() === "") {
          setIntentComplete(true);
        }
        
        setIsLoading(false);
        
        // Start polling if stream is still in progress (no blueprint yet)
        if (!hasBlueprint) {
          setIsPolling(true);
        }
        
        return;
      } catch {
        // Invalid cached results
      }
    }

    // No data found
    setError("No search data found. Please start a new search.");
    setIsLoading(false);
  }, []);

  // const keyword = searchData?.keyword || searchData?.collection || searchData?.product || "";

  const { data: session } = useSession();

  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col">
        <Background />
        {/* Top bar with navigation and user menu only */}
        {session && (
          <header className="w-full pt-4 pb-2 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-end items-center gap-3">
                <ServiceNav />
                <UserMenu />
              </div>
            </div>
          </header>
        )}
        <div className="flex-1 flex flex-col lg:flex-row print:flex-col">
          {error && <Toast message={error} type="error" duration={8000} onClose={() => setError(null)} />}

        {/* Left Column - Top Results */}
        <div className="w-full lg:w-1/2 results-left min-h-screen print:min-h-0 print:break-after-page">
          <div className="max-w-2xl mx-auto">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-8 no-print">
              {/* <Link href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-accent-teal underline hover:text-accent-teal/80">
                View Google Results →
              </Link> */}
              <div className="flex gap-3">
                <Link href="/" prefetch className="genie-btn genie-btn-dark text-sm px-4 py-2">New Search</Link>
                <button
                  onClick={() => window.print()}
                  disabled={!blueprintReady || isTypingBlueprint}
                  className="genie-btn genie-btn-teal text-sm px-4 py-2 disabled:opacity-50"
                >
                  Download PDF
                </button>
              </div>
            </div>

            {/* Top Results Section - Show title if available, then loading or content */}
            {(titlesBody?.resultsTitle || isLoading || topResultsContent) && (
              <h1 className="text-4xl font-black text-gray-900 mb-8">
                {titlesBody?.resultsTitle || "Top Results"}
              </h1>
            )}

            {isLoading || waitingForTopResults || (!displayedTopResultsHTML && topResultsContent) ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="star-spinner text-gray-600">★</span>
                <p className="text-gray-600 mt-4">Analyzing top competitors...</p>
              </div>
            ) : !isPolling && !isLoading && ((topResultsType === "array" && Array.isArray(topResults) && topResults.length === 0) || 
                 (topResultsType === "html" && (!topResults || topResults === ""))) ? (
              <p className="text-gray-600 text-center py-12">No results found. Please try a different search.</p>
            ) : (
              <div className="space-y-8">
                {topResultsType === "html" ? (
                  <div className="blueprint-content" dangerouslySetInnerHTML={{ __html: displayedTopResultsHTML }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: displayedTopResultsHTML }} />
                )}
                {isTypingTopResults && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="star-spinner text-sm">★</span>
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
              </div>
            )}

            {/* Intent Section - Show title if available, then loading or content */}
            {(titlesBody?.intentTitle || intent) && (
              <div className="mt-12">
                <h2 className="text-4xl font-black text-gray-900 mb-4">
                  {titlesBody?.intentTitle || "Intent"}
                </h2>
                
                {/* Loading state: show spinner if title exists but no intent data yet */}
                {!intent ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <span className="star-spinner text-gray-600">★</span>
                    <p className="text-gray-600 mt-4">Analyzing intent...</p>
                  </div>
                ) : intentIsHTML ? (
                  !displayedIntentHTML ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span className="star-spinner text-gray-600">★</span>
                      <p className="text-gray-600 mt-4">Analyzing intent...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl font-bold text-gray-800 blueprint-content">
                        <div dangerouslySetInnerHTML={{ __html: displayedIntentHTML }} />
                      </div>
                      {isTypingIntentHTML && (
                        <div className="flex items-center gap-2 text-gray-500 mt-4">
                          <span className="star-spinner text-sm">★</span>
                          <span className="text-sm">Loading...</span>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  !displayedIntentText ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span className="star-spinner text-gray-600">★</span>
                      <p className="text-gray-600 mt-4">Analyzing intent...</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-bold text-gray-800 uppercase">
                        {displayedIntentText}
                      </p>
                      {isTypingIntentText && (
                        <div className="flex items-center gap-2 text-gray-500 mt-4">
                          <span className="star-spinner text-sm">★</span>
                          <span className="text-sm">Loading...</span>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Blueprint */}
        <div className="w-full lg:w-1/2 results-right min-h-screen print:min-h-0">
          <div className="max-w-2xl mx-auto">
            {/* Blueprint Section - Show title if available, then loading or content */}
            {(titlesBody?.blueprintTitle || blueprintReady || isPolling) && (
              <h1 className="text-4xl font-black text-gray-900 mb-8">
                {titlesBody?.blueprintTitle || "Blueprint"}
              </h1>
            )}

            {(isPolling && !blueprintReady) || !shouldShowBlueprint || (shouldShowBlueprint && blueprint && !displayedBlueprintHTML) ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="star-spinner text-gray-600">★</span>
                <p className="text-gray-600 mt-4">
                  {isPolling && !blueprintReady ? "AI is thinking..." : !blueprintReady ? "Generating your blueprint..." : "Preparing content..."}
                </p>
              </div>
            ) : displayedBlueprintHTML ? (
              <div>
                <div className="blueprint-content" dangerouslySetInnerHTML={{ __html: displayedBlueprintHTML }} />
                {isTypingBlueprint && (
                  <div className="flex items-center gap-2 text-gray-500 mt-4">
                    <span className="star-spinner text-sm">★</span>
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
        </div>
      </main>
    </AuthGuard>
  );
}