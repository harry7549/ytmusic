/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    domains: ['i.ytimg.com', 'yt3.ggpht.com'],
    unoptimized: true, // required for static export
  },
};

module.exports = nextConfig;
