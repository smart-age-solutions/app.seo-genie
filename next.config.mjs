/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone" - Removido para Vercel (standalone é para Docker/self-hosted)
  eslint: {
    // Ignora erros de ESLint durante o build para não bloquear o deploy
    // Os erros ainda aparecem no desenvolvimento, mas não impedem o build
    ignoreDuringBuilds: true,
  },
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
