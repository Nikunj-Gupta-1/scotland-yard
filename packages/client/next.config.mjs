import os from 'node:os';
import fs from 'node:fs';

function getLocalDevOrigins() {
  const origins = new Set(['localhost', '127.0.0.1', '10.30.87.193']);
  if (process.env.ALLOWED_DEV_ORIGINS) {
    for (const origin of process.env.ALLOWED_DEV_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  try {
    const interfaces = os.networkInterfaces();
    for (const ifaceList of Object.values(interfaces)) {
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        if (!iface.internal && iface.family === 'IPv4') {
          origins.add(iface.address);
          origins.add(`${iface.address}:3000`);
        }
      }
    }
  } catch {
    // fallback to static origins
  }
  return Array.from(origins);
}

function getBasePath() {
  if (process.env.BASE_PATH !== undefined) return process.env.BASE_PATH;
  try {
    const routesManifestUrl = new URL('./.next/routes-manifest.json', import.meta.url);
    if (fs.existsSync(routesManifestUrl)) {
      const manifest = JSON.parse(fs.readFileSync(routesManifestUrl, 'utf8'));
      if (manifest.basePath) return manifest.basePath;
    }
  } catch {
    // fallback
  }
  return '';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@scotland-yard/common'],
  allowedDevOrigins: getLocalDevOrigins(),
  basePath: getBasePath(),
};

export default nextConfig;
