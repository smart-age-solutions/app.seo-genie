import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// Force dynamic rendering to prevent static generation attempts
export const dynamic = 'force-dynamic';

// Dynamic handler that fetches Google credentials from database
// For NextAuth v4 with App Router, we need to create handlers dynamically
const handler = async (req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) => {
  const authOptions = await getAuthOptions();
  const params = await ctx.params;
  // NextAuth v4 detects Route Handler and handles it appropriately
  return NextAuth(authOptions)(req, { params });
};

export { handler as GET, handler as POST };
