import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { backendApi } from "./backend-api";
import { UserRole, UserStatus } from "@/types/database";
import { randomBytes } from "crypto";

// Function to get Google OAuth credentials from backend API
// Uses direct API route that bypasses authentication (needed for NextAuth initialization)
async function getGoogleCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  try {
    // Use direct API route that doesn't require authentication
    const isServer = typeof window === "undefined";
    const baseUrl = isServer
      ? process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      : "";
    const url = `${baseUrl}/api/auth/google-status`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      cache: "no-store", // Ensure no caching
    });

    if (!response.ok) {
      // If status endpoint returns false or error, return null (no Google OAuth)
      return null;
    }

    const data = await response.json();
    const settings = data.settings;

    if (settings?.oauthClientId && settings?.oauthClientSecret) {
      return {
        clientId: settings.oauthClientId,
        clientSecret: settings.oauthClientSecret,
      };
    }
    return null;
  } catch (error) {
    // Log error but don't throw - allow app to continue without Google OAuth
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching Google credentials from backend (non-blocking):", errorMessage);
    return null;
  }
}

// Cache for Google credentials (refreshed on server restart or after TTL)
// Note: In serverless environments (Vercel), this cache is per-instance
// Each function invocation may have a fresh cache, so we use a shorter TTL
let cachedGoogleCredentials: { clientId: string; clientSecret: string } | null = null;
let credentialsCacheTime: number = 0;
const CREDENTIALS_CACHE_TTL = 30 * 1000; // 30 seconds cache (shorter for serverless)

async function getCachedGoogleCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const now = Date.now();
  // In serverless, always fetch fresh if cache is too old or doesn't exist
  // This ensures credentials are always up-to-date
  if (cachedGoogleCredentials && now - credentialsCacheTime < CREDENTIALS_CACHE_TTL) {
    return cachedGoogleCredentials;
  }
  
  // Always fetch fresh credentials (cache is just to avoid multiple calls in same request)
  cachedGoogleCredentials = await getGoogleCredentials();
  credentialsCacheTime = now;
  return cachedGoogleCredentials;
}

// Function to create auth options dynamically
export async function getAuthOptions(): Promise<NextAuthOptions> {
  const googleCredentials = await getCachedGoogleCredentials();
  
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      id: "credentials",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          // Note: Backend needs to implement POST /api/auth/login endpoint
          // For now, we'll use the user lookup and validate password client-side
          // TODO: Backend should implement /api/auth/login that validates password
          const user = await backendApi.auth.findUserByEmail(credentials.email);

          if (!user || !user.password) {
            throw new Error("Invalid credentials");
          }

          // Note: Password validation should be done on backend
          // For now, we need bcrypt here temporarily until backend implements login endpoint
          // TODO: Replace with backend API call to /api/auth/login
          const bcrypt = await import("bcryptjs");
          const isPasswordValid = await bcrypt.default.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          if (user.status === UserStatus.INACTIVE) {
            throw new Error("Your account has been inactive. Please contact the administrator.");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            status: user.status,
          };
        } catch (error) {
          console.error("Auth error:", error);
          const errorMessage = error instanceof Error ? error.message : "Invalid credentials";
          throw new Error(errorMessage);
        }
      },
    }),
  ];

  // Only add Google provider if credentials are configured
  if (googleCredentials) {
    console.log("Google OAuth provider configured successfully");
    providers.unshift(
      GoogleProvider({
        clientId: googleCredentials.clientId,
        clientSecret: googleCredentials.clientSecret,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
          },
        },
      })
    );
  } else {
    console.warn("Google OAuth provider not configured - credentials not found");
  }

  return {
    // No adapter - using JWT strategy only
    // Note: NEXTAUTH_URL environment variable is used by NextAuth automatically
    // Make sure it's set correctly in Vercel environment variables
    providers,
    callbacks: {
      async signIn({ user, account }) {
        // For Google sign-in, handle user creation/lookup
        if (account?.provider === "google") {
          const email = user.email;
          if (!email) {
            console.error("Google signIn: No email provided");
            return false;
          }

          console.log("Google signIn: Processing user with email:", email);

          try {
            // Check if user already exists via backend API
            let existingUser = null;
            try {
              existingUser = await backendApi.auth.findUserByEmail(email);
              console.log("Google signIn: Found existing user:", existingUser?.id);
            } catch (err) {
              console.log("Google signIn: User not found, will create new:", err instanceof Error ? err.message : err);
            }

            if (existingUser) {
              // Check if user is blocked
              if (existingUser.status === UserStatus.INACTIVE) {
                return "/login?error=blocked";
              }

              // Update user object with data from DB so jwt callback can use it
              user.id = existingUser.id;
              user.role = existingUser.role;
              user.status = existingUser.status;

              console.log("Google signIn: Existing user authenticated successfully");
              return true;
            }

            // Create new user (auto-approved)
            console.log("Google signIn: Creating new user...");
            try {
              const newUser = await backendApi.auth.createUser({
                email,
                name: user.name || email.split("@")[0],
                image: user.image || null,
                role: UserRole.USER,
                status: UserStatus.ACTIVE,
                provider: "google",
                providerId: account.providerAccountId,
              });

              console.log("Google signIn: New user created:", newUser?.id);

              user.id = newUser.id;
              user.role = newUser.role;
              user.status = newUser.status;

              return true;
            } catch (error) {
              console.error("Google signIn: Error creating new user:", error instanceof Error ? error.message : error);
              return "/login?error=create_failed";
            }
          } catch (error) {
            console.error("Google signIn: Unexpected error:", error instanceof Error ? error.message : error);
            return "/login?error=unexpected";
          }
        }

        return true;
      },
      async jwt({ token, user, trigger, session }) {
        // User object should have id/role/status after signIn callback creates it
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.status = user.status;
          
          // Generate a secure session token for database storage (only on initial login)
          if (!token.sessionToken) {
            token.sessionToken = randomBytes(32).toString('base64url');
          }
          
          // Mark that we need to create session (only on first login)
          token.needsSessionCreation = true;
        }
        
        // Create session in database only once after successful login
        if (token.id && token.needsSessionCreation) {
          const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          try {
            await backendApi.auth.createSession(
              token.id as string,
              token.sessionToken as string,
              expires
            );
            // Mark session as created so we don't try again
            token.needsSessionCreation = false;
          } catch (error) {
            console.error("Error creating session in database (non-blocking):", error instanceof Error ? error.message : error);
            // Don't mark as created so it can retry next time
          }
        }

        // Handle session update
        if (trigger === "update" && session) {
          token.role = session.role;
          token.status = session.status;
        }

        // Refresh user data from backend API for existing tokens (not during initial login)
        if (token.id && !user && trigger !== "signIn" && (!token.role || !token.status)) {
          try {
            const dbUser = await backendApi.auth.findUserById(token.id as string);
            if (dbUser) {
              token.role = dbUser.role;
              token.status = dbUser.status;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes("404") && !errorMessage.includes("not found") && !errorMessage.includes("Failed to fetch user")) {
              console.error("Error refreshing user data (non-blocking):", errorMessage);
            }
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as UserRole;
          session.user.status = token.status as UserStatus;
          // Add sessionToken to session so API routes can use it
          session.sessionToken = token.sessionToken as string;
        }
        return session;
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
  };
}

// Static authOptions for getServerSession() calls in API routes
// This needs to have the same session/jwt callbacks as getAuthOptions()
// so that getServerSession can properly decode the JWT token
export const authOptions: NextAuthOptions = {
  // Providers are empty here - they're only needed for the login flow
  // which uses getAuthOptions() in the [...nextauth] route handler
  providers: [],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Same logic as getAuthOptions() to ensure token structure matches
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        if (!token.sessionToken) {
          token.sessionToken = randomBytes(32).toString('base64url');
        }
      }
      if (trigger === "update" && session) {
        token.role = session.role;
        token.status = session.status;
      }
      return token;
    },
    async session({ session, token }) {
      // Same logic as getAuthOptions() to ensure session structure matches
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.sessionToken = token.sessionToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to check if user has admin access
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

// Helper function to check if user has manager or admin access
export function isManagerOrAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.USER;
}

// Helper function to check if user is approved
export function isApproved(status: UserStatus): boolean {
  return status === UserStatus.ACTIVE;
}

// Function to check if Google OAuth is configured
export async function isGoogleOAuthConfigured(): Promise<boolean> {
  const credentials = await getCachedGoogleCredentials();
  return credentials !== null;
}

// Clear credentials cache (call after updating settings)
export function clearCredentialsCache(): void {
  cachedGoogleCredentials = null;
  credentialsCacheTime = 0;
}
