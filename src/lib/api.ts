export interface SearchData {
  subServiceId?: string;
  storeName: string;
  location: string;
  keyword?: string;
  collection?: string;
  filters?: string;
  product?: string;
  features?: string;
  spellType: "high-authority" | "collection" | "product" | "geo-collection" | "geo-product";
  formData?: Record<string, string>;
}

export interface TopResult {
  title: string;
  url: string;
  meta_title: string;
  meta_description: string;
  h1_heading: string;
  estimated_content_length: string;
}

interface StreamCallbacks {
  onTopResults: (results: TopResult[]) => void;
  onIntent: (intent: string) => void;
  onBlueprint: (blueprint: string) => void;
  onError: (error: string) => void;
}

export async function searchStream(data: SearchData, callbacks: StreamCallbacks): Promise<void> {
  const formData: Record<string, string> = data.formData || {};
  
  // Add standard fields
  if (data.storeName) formData.store = data.storeName;
  if (data.location) formData.location = data.location;
  
  const keyword = data.keyword || data.collection || data.product || "";
  if (keyword) formData.keyword = keyword;
  if (data.collection) formData.collection = data.collection;
  if (data.filters) formData.filters = data.filters;
  if (data.product) formData.product = data.product;
  if (data.features) formData.features = data.features;
  
  const query = `${keyword} ${data.location}`.trim();
  formData.query = query;

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subServiceId: data.subServiceId,
        formData,
        query,
        store: data.storeName,
        location: data.location,
        keyword,
        spell_type: data.spellType,
      }),
    });

    // Check if response is SSE stream (text/event-stream) or JSON error
    const contentType = response.headers.get("content-type") || "";
    
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = `HTTP error: ${response.status}`;
      try {
        if (contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } else if (contentType.includes("text/event-stream")) {
          // If it's SSE, read the error from the stream
          const reader = response.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            const { value } = await reader.read();
            if (value) {
              const text = decoder.decode(value);
              const match = text.match(/data: ({.*})/);
              if (match) {
                try {
                  const parsed = JSON.parse(match[1]);
                  errorMessage = parsed.content || parsed.error || errorMessage;
                } catch {}
              }
            }
          }
        } else {
          errorMessage = response.statusText || errorMessage;
        }
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Check if we got SSE stream
    if (!contentType.includes("text/event-stream")) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        
        try {
          const parsed = JSON.parse(part.slice(6));
          
          switch (parsed.type) {
            case "top_results":
              // Backend sends array of TopResult directly
              const results = Array.isArray(parsed.content) ? parsed.content : [];
              if (results.length > 0) {
                callbacks.onTopResults(results);
              }
              break;
            case "intent":
              callbacks.onIntent(parsed.content);
              break;
            case "blueprint":
              callbacks.onBlueprint(parsed.content);
              break;
            case "error":
              callbacks.onError(`${parsed.content}${parsed.details ? `: ${parsed.details}` : ""}`);
              break;
          }
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unexpected error";
    console.error("Search stream error:", errorMessage, error);
    callbacks.onError(errorMessage);
  }
}
