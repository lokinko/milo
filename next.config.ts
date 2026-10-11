import type { NextConfig } from 'next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/milo';
if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(basePath)) throw new Error('Invalid NEXT_PUBLIC_BASE_PATH');
const config: NextConfig = {
  output: 'standalone', basePath, poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'same-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ] }]; },
};
export default config;
