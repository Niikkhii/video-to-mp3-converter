/** @type {import('next').NextConfig} */
const nextConfig = {
  // API routes handle body parsing themselves via export const config
  webpack: (config, { isServer }) => {
    // Handle CommonJS modules like lamejs
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig

