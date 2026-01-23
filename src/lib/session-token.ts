/**
 * Helper function to get session token from NextAuth session
 * Falls back to legacy format if sessionToken is not available
 */
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSessionToken(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return null;
    }

    // Try to get sessionToken from session (added in session callback)
    const sessionToken = (session as any)?.sessionToken;
    if (sessionToken) {
      return sessionToken;
    }

    // Fallback to legacy format for backward compatibility
    // This will work with the backend's fallback logic
    return `session_${session.user.id}_${Date.now()}`;
  } catch (error) {
    console.error("Error getting session token:", error);
    return null;
  }
}

/**
 * Helper function to get Authorization header value
 * Returns Bearer token with sessionToken or legacy format
 */
export async function getAuthHeader(): Promise<string | null> {
  const token = await getSessionToken();
  return token ? `Bearer ${token}` : null;
}
