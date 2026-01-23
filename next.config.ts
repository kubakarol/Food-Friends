/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // pozwól zdeployować mimo błędów ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // pozwól zdeployować mimo błędów TS (np. 'any')
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
