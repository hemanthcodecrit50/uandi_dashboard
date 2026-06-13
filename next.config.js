/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling native Node.js modules; let Node require them at runtime.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const rules = [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
        ],
      },
    ];
    return rules;
  },
};

module.exports = nextConfig;
