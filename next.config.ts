import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = process.env.REPO_NAME || 'air-agent';

// Enable static export only when explicitly requested (e.g., for GitHub Pages deployment)
// Set STATIC_EXPORT=true to build for static hosting
// By default, keep server functionality for MCP server support
const useStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  // Only use static export when explicitly enabled
  ...(useStaticExport ? { output: 'export' } : {}),
  basePath: isProd && useStaticExport ? `/${repoName}` : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
