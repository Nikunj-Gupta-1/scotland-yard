import os from 'node:os';

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@scotland-yard/common'],
  allowedDevOrigins: getLocalDevOrigins(),
  basePath: process.env.BASE_PATH || '',
};

export default nextConfig;
