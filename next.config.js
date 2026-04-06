/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.ytimg.com', 'yt3.ggpht.com'],
  },
  serverExternalPackages: ['youtube-sr'],
};

module.exports = nextConfig;
