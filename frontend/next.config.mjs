/** @type {import('next').NextConfig} */

// Derive the API host from the configured API URL so uploaded product images
// (served from the backend's /uploads) are allowed by next/image — in dev and
// in production alike, without hard-coding the host here.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
let apiPattern;
try {
  const u = new URL(apiUrl);
  apiPattern = {
    protocol: u.protocol.replace(':', ''),
    hostname: u.hostname,
    ...(u.port ? { port: u.port } : {}),
  };
} catch {
  apiPattern = { protocol: 'http', hostname: 'localhost', port: '4000' };
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      apiPattern,
      { protocol: 'http', hostname: '127.0.0.1' },
      // Supabase Storage public bucket (production image host).
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
