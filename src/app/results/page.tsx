"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { SearchData, TopResult, TitlesBody } from "@/lib/api";
import { AuthGuard, Toast, Background, ServiceNav, UserMenu } from "@/components";
import { useSession } from "next-auth/react";
import { useTypewriter, useTypewriterHTML } from "@/hooks/useTypewriter";

export default function ResultsPage() {
  // const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [topResults, setTopResults] = useState<TopResult[] | string>([]);
  const [topResultsType, setTopResultsType] = useState<"array" | "html">("array");
  const [intent, setIntent] = useState("");
  const [blueprint, setBlueprint] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [intentComplete, setIntentComplete] = useState(false);
  const [blueprintReady, setBlueprintReady] = useState(false);
  const [titlesBody, setTitlesBody] = useState<TitlesBody | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const [googleUrl, setGoogleUrl] = useState("");

  const hasStartedRef = useRef(false);

  // Check if intent contains HTML tags
  const intentIsHTML = useMemo(() => {
    return typeof intent === "string" && intent.trim() !== "" && /<[a-z][\s\S]*>/i.test(intent);
  }, [intent]);

  // Typewriter for intent - use HTML typewriter if intent contains HTML, otherwise use text typewriter
  const { displayedText: displayedIntentText, isTyping: isTypingIntentText } = useTypewriter(
    intentIsHTML ? "" : intent,
    {
      speed: 30,
      onComplete: () => setIntentComplete(true),
    }
  );

  const { displayedHTML: displayedIntentHTML, isTyping: isTypingIntentHTML } = useTypewriterHTML(
    intentIsHTML ? intent : "",
    {
      speed: 5,
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
    { speed: 5 }
  );

  // Convert top results to HTML format for typewriter effect (only for array type - Google datasource)
  const topResultsContent = useMemo(() => {
    if (isLoading) return "";
    
    // HTML type: use HTML as it comes from API (respect as-is)
    if (topResultsType === "html" && typeof topResults === "string") {
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
  }, [isLoading, topResultsType, topResults]);

  const { displayedHTML: displayedTopResultsHTML, isTyping: isTypingTopResults } = useTypewriterHTML(
    topResultsContent,
    { speed: 5 }
  );

  // Load results from localStorage on mount - synchronous for instant display
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const storedData = localStorage.getItem("seoai_search_data");
    const storedResults = localStorage.getItem("seoai_search_results");

    if (!storedData || !storedResults) {
      setError("No search results found. Please start a new search.");
      setIsLoading(false);
      return;
    }

    try {
      const data = JSON.parse(storedData) as SearchData;
      const results = JSON.parse(storedResults) as {
        topResults: TopResult[] | string;
        topResultsType?: "array" | "html";
        intent: string;
        blueprint: string;
        titlesBody: TitlesBody | null;
      };
      
      // Set all data immediately - no async needed
      setSearchData(data);
      
      // Determine type based on stored type or datasource
      let resultsType: "array" | "html" = results.topResultsType || "array";
      if (!results.topResultsType && results.titlesBody?.topResultsDataSource) {
        // If datasource is Google, it's array; otherwise it's HTML
        resultsType = results.titlesBody.topResultsDataSource === "GOOGLE" ? "array" : "html";
      } else if (!results.topResultsType) {
        // Fallback: check if topResults is array or string
        resultsType = Array.isArray(results.topResults) ? "array" : "html";
      }
      
      setTopResults(results.topResults || (resultsType === "array" ? [] : ""));
      setTopResultsType(resultsType);
      setIntent(results.intent || "");
      setBlueprint(results.blueprint || "");
      // Set blueprintReady based on whether blueprint exists
      const hasBlueprint = !!(results.blueprint && results.blueprint.trim() !== "");
      setBlueprintReady(hasBlueprint);
      setTitlesBody(results.titlesBody || null);
      
      // If there's no intent, mark it as complete immediately
      if (!results.intent || results.intent.trim() === "") {
        setIntentComplete(true);
      }

      // const keyword = data.keyword || data.collection || data.product || "";
      // setGoogleUrl(`https://www.google.com/search?q=${encodeURIComponent(`${keyword} ${data.location || ""}`)}`);
      
      setIsLoading(false);
    } catch {
      setError("Error loading search results. Please start a new search.");
      setIsLoading(false);
    }
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

            {/* Top Results Title */}
            <h1 className="text-4xl font-black text-gray-900 mb-8">
              {titlesBody?.resultsTitle}
            </h1>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="star-spinner text-gray-600">★</span>
                <p className="text-gray-600 mt-4">Analyzing top competitors...</p>
              </div>
            ) : (topResultsType === "array" && Array.isArray(topResults) && topResults.length === 0) || 
                 (topResultsType === "html" && (!topResults || topResults === "")) ? (
              <p className="text-gray-600 text-center py-12">No results found. Please try a different search.</p>
            ) : (
              <div className="space-y-8">
                {topResultsType === "html" ? (
                  <div className="blueprint-content" dangerouslySetInnerHTML={{ __html: displayedTopResultsHTML }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: displayedTopResultsHTML }} />
                )}
                {isTypingTopResults && <span className="inline-block w-2 h-5 bg-gray-800 animate-pulse ml-1">|</span>}
              </div>
            )}

            {/* Intent Section */}
            {intent && (
              <div className="mt-12">
                <h2 className="text-4xl font-black text-gray-900 mb-4">
                  {titlesBody?.intentTitle}
                </h2>
                {intentIsHTML ? (
                  <div className="text-xl font-bold text-gray-800 blueprint-content">
                    <div dangerouslySetInnerHTML={{ __html: displayedIntentHTML }} />
                    {isTypingIntentHTML && <span className="inline-block w-2 h-5 bg-gray-800 animate-pulse ml-1">|</span>}
                  </div>
                ) : (
                  <p className="text-xl font-bold text-gray-800 uppercase">
                    {displayedIntentText}
                    {isTypingIntentText && <span className="animate-pulse">|</span>}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Blueprint */}
        <div className="w-full lg:w-1/2 results-right min-h-screen print:min-h-0">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-black text-gray-900 mb-8">
              {titlesBody?.blueprintTitle}
            </h1>

            {!shouldShowBlueprint ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="star-spinner text-gray-600">★</span>
                <p className="text-gray-600 mt-4">
                  {!blueprintReady ? "Generating your blueprint..." : "Waiting for intent analysis..."}
                </p>
              </div>
            ) : displayedBlueprintHTML ? (
              <div>
                {/* <div className="mb-8 text-gray-800">
                  <p className="mb-1"><span className="font-bold">Target Keyword:</span> {keyword} {searchData?.location}</p>
                  <p className="mb-1"><span className="font-bold">Store:</span> {searchData?.storeName || "-"}</p>
                  <p><span className="font-bold">Location:</span> {searchData?.location}</p>
                </div> */}
                <div className="blueprint-content" dangerouslySetInnerHTML={{ __html: displayedBlueprintHTML }} />
                {isTypingBlueprint && <span className="inline-block w-2 h-5 bg-gray-800 animate-pulse ml-1">|</span>}
              </div>
            ) : null}
          </div>
        </div>
        </div>
      </main>
    </AuthGuard>
  );
}