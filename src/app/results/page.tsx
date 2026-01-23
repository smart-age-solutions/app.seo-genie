"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { SearchData, TopResult } from "@/lib/api";
import { AuthGuard, Toast } from "@/components";
import { useTypewriter, useTypewriterHTML } from "@/hooks/useTypewriter";

export default function ResultsPage() {
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [topResults, setTopResults] = useState<TopResult[]>([]);
  const [intent, setIntent] = useState("");
  const [blueprint, setBlueprint] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [intentComplete, setIntentComplete] = useState(false);
  const [blueprintReady, setBlueprintReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleUrl, setGoogleUrl] = useState("");

  const hasStartedRef = useRef(false);

  // Typewriter for intent
  const { displayedText: displayedIntent, isTyping: isTypingIntent } = useTypewriter(intent, {
    speed: 30,
    onComplete: () => setIntentComplete(true),
  });

  // Typewriter for blueprint - only start when intent is complete
  const { displayedHTML: displayedBlueprintHTML, isTyping: isTypingBlueprint } = useTypewriterHTML(
    blueprintReady && intentComplete ? blueprint : "",
    { speed: 5 }
  );

  // Convert top results to HTML format for typewriter effect
  const topResultsHTML = useMemo(() => {
    if (!topResults || topResults.length === 0) return "";
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
  }, [topResults]);

  // Typewriter for top results with HTML formatting
  const { displayedHTML: displayedTopResultsHTML, isTyping: isTypingTopResults } = useTypewriterHTML(
    !isLoading && topResultsHTML ? topResultsHTML : "",
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
        topResults: TopResult[];
        intent: string;
        blueprint: string;
      };
      
      // Set all data immediately - no async needed
      setSearchData(data);
      setTopResults(results.topResults || []);
      setIntent(results.intent || "");
      setBlueprint(results.blueprint || "");
      setBlueprintReady(!!results.blueprint);
      
      const keyword = data.keyword || data.collection || data.product || "";
      setGoogleUrl(`https://www.google.com/search?q=${encodeURIComponent(`${keyword} ${data.location || ""}`)}`);
      
      setIsLoading(false);
    } catch {
      setError("Error loading search results. Please start a new search.");
      setIsLoading(false);
    }
  }, []);

  const keyword = searchData?.keyword || searchData?.collection || searchData?.product || "";

  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col lg:flex-row print:flex-col">
        {error && <Toast message={error} type="error" duration={8000} onClose={() => setError(null)} />}

        {/* Left Column - Top Results */}
        <div className="w-full lg:w-1/2 results-left min-h-screen print:min-h-0 print:break-after-page">
          <div className="max-w-2xl mx-auto">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-8 no-print">
              <Link href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-accent-teal underline hover:text-accent-teal/80">
                View Google Results →
              </Link>
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

            <h1 className="text-4xl font-black text-gray-900 mb-8">TOP RESULTS</h1>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="star-spinner text-gray-600">★</span>
                <p className="text-gray-600 mt-4">Analyzing top competitors...</p>
              </div>
            ) : topResults.length === 0 ? (
              <p className="text-gray-600 text-center py-12">No results found. Please try a different search.</p>
            ) : (
              <div className="space-y-8">
                <div dangerouslySetInnerHTML={{ __html: displayedTopResultsHTML }} />
                {isTypingTopResults && <span className="inline-block w-2 h-5 bg-gray-800 animate-pulse ml-1">|</span>}
              </div>
            )}

            {/* Intent Section */}
            <div className="mt-12">
              <h2 className="text-4xl font-black text-gray-900 mb-4">INTENT</h2>
              {!intent ? (
                <div className="flex items-center gap-3">
                  <span className="star-spinner text-gray-600 text-2xl">★</span>
                  <p className="text-gray-600">Analyzing search intent...</p>
                </div>
              ) : (
                <p className="text-xl font-bold text-gray-800 uppercase">
                  {displayedIntent}
                  {isTypingIntent && <span className="animate-pulse">|</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Blueprint */}
        <div className="w-full lg:w-1/2 results-right min-h-screen print:min-h-0">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-black text-gray-900 mb-8">BLUEPRINT FOR SUCCESS</h1>

            {!blueprintReady || !intentComplete ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="star-spinner text-gray-600">★</span>
                <p className="text-gray-600 mt-4">
                  {!blueprintReady ? "Generating your blueprint..." : "Waiting for intent analysis..."}
                </p>
              </div>
            ) : displayedBlueprintHTML ? (
              <div>
                <div className="mb-8 text-gray-800">
                  <p className="mb-1"><span className="font-bold">Target Keyword:</span> {keyword} {searchData?.location}</p>
                  <p className="mb-1"><span className="font-bold">Store:</span> {searchData?.storeName || "-"}</p>
                  <p><span className="font-bold">Location:</span> {searchData?.location}</p>
                </div>
                <div className="blueprint-content" dangerouslySetInnerHTML={{ __html: displayedBlueprintHTML }} />
                {isTypingBlueprint && <span className="inline-block w-2 h-5 bg-gray-800 animate-pulse ml-1">|</span>}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
