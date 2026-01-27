import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthHeader } from "@/lib/session-token";
import { PromptType } from "@/types/database";

// In development (Docker): use internal network URL (BACKEND_API_URL)
// In production (Vercel/Fly.io): use public URL (NEXT_PUBLIC_API_URL)
const getBackendUrl = (): string => {
  // Server-side: prefer internal URL for Docker, fallback to public URL
  if (process.env.BACKEND_API_URL) {
    return process.env.BACKEND_API_URL;
  }
  // Fallback to public URL (used in production on Vercel)
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
};

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.error("Search API: Unauthorized - no session");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Please log in again" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();

    const backendUrl = getBackendUrl();
    
    // Ensure URL has protocol
    let backendBaseUrl = backendUrl;
    if (!backendBaseUrl.startsWith("http://") && !backendBaseUrl.startsWith("https://")) {
      backendBaseUrl = `http://${backendBaseUrl}`;
    }
    
    const searchUrl = `${backendBaseUrl}/search_stream`;
     // Fetch prompts from database to get titles and datasource
     let titles: { resultsTitle: string; intentTitle: string; blueprintTitle: string; topResultsDataSource?: string } | null = null;
     if (body.subServiceId) {
       try {
         const authHeader = await getAuthHeader();
         if (authHeader) {
           const promptsResponse = await fetch(`${backendBaseUrl}/api/sub-services/${body.subServiceId}/prompts`, {
             headers: {
               "Authorization": authHeader,
               "Content-Type": "application/json",
             },
           });

           if (promptsResponse.ok) {
             const promptsData = await promptsResponse.json();
             const prompts = promptsData.prompts || promptsData || [];
             
             // Find prompts by type and use their names as titles
             const topResultsPrompt = prompts.find((p: { promptType: string }) => p.promptType === PromptType.TOP_RESULTS);
             const intentPrompt = prompts.find((p: { promptType: string }) => p.promptType === PromptType.INTENT);
             const blueprintPrompt = prompts.find((p: { promptType: string }) => p.promptType === PromptType.BLUEPRINT);

             titles = {
               resultsTitle: topResultsPrompt?.name || "Top Results",
               intentTitle: intentPrompt?.name || "Intent",
               blueprintTitle: blueprintPrompt?.name || "Blueprint",
               topResultsDataSource: topResultsPrompt?.dataSource || null,
             };
           }
         }
       } catch (error) {
         console.error("Error fetching prompts for titles:", error);
       }
     }
    
    // Forward the request to the backend
    const backendResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).catch((fetchError) => {
      console.error("Search API: Fetch error", fetchError);
      throw new Error(`Failed to connect to backend: ${fetchError.message}`);
    });

    if (!backendResponse.ok) {
      let errorText = "";
      try {
        errorText = await backendResponse.text();
      } catch {
        errorText = `Backend returned status ${backendResponse.status}`;
      }
      console.error(`Search API: Backend error (${backendResponse.status}):`, errorText);
      
      // Return error as SSE event so client can handle it properly
      const errorMessage = `Backend error: ${backendResponse.status}`;
      const errorDetails = errorText ? (errorText.length > 200 ? errorText.substring(0, 200) + "..." : errorText) : "";
      
      return new Response(
        `data: ${JSON.stringify({ type: "error", content: errorMessage, details: errorDetails })}\n\n`,
        { 
          status: 200, // Return 200 so SSE stream can send error message
          headers: { 
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          } 
        }
      );
    }

    // Stream the response back to the client
    const reader = backendResponse.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: "No response body from backend" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a readable stream to forward SSE data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send titles first if available
          if (titles) {
            const titlesEvent = `data: ${JSON.stringify({ type: "titles", content: titles })}\n\n`;
            controller.enqueue(new TextEncoder().encode(titlesEvent));
          }

          // Then forward the backend stream
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Return error as SSE event so client can handle it properly
    return new Response(
      `data: ${JSON.stringify({ type: "error", content: "Internal server error", details: errorMessage })}\n\n`,
      { 
        status: 200, // Return 200 so SSE stream can send error message
        headers: { 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        } 
      }
    );
  }
}
