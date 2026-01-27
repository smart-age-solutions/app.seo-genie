/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone" - Removido para Vercel (standalone é para Docker/self-hosted)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
