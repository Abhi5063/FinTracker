/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from any https source (extend as needed)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Expose only NEXT_PUBLIC_ prefixed env vars to the browser bundle
  env: {
    NEXT_PUBLIC_APP_NAME: 'FinTrack',
  },
};

module.exports = nextConfig;
