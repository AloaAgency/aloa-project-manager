const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eycgzjqwowrdmjlzqqyg.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Add headers for development CORS and HMR
  async headers() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    return [
      {
        // Apply these headers to all routes in development
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
      },
      {
        // Specific headers for Next.js HMR and static files
        source: '/_next/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
        ],
      },
    ]
  },
  compiler: {
    removeConsole: isProduction ? { exclude: ['error', 'warn'] } : false,
  },
  // Configure webpack for development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Enable CORS for webpack dev server
      config.devServer = {
        ...config.devServer,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
        },
      }
      // Configure WebSocket for HMR
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after changes
        ignored: /node_modules/,
      }
    }
    return config
  },
}

module.exports = nextConfig
