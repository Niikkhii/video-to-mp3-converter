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
      
      // Don't externalize lamejs - bundle it completely
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter(
          external => typeof external !== 'string' || !external.includes('lamejs')
        )
      }
    }
    return config
  },
}

module.exports = nextConfig

