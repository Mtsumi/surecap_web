/** @type {import('next').NextConfig} */

// Exact ngrok hostname required — wildcards alone may not match on Next 14.2.
// Update NGROK_FE_HOST in .env.local when your frontend tunnel URL changes.
const ngrokFeHost = process.env.NGROK_FE_HOST?.trim();

const nextConfig = {
  allowedDevOrigins: [
    ...(ngrokFeHost ? [ngrokFeHost] : []),
    ...(process.env.DEV_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ??
      []),
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
};

export default nextConfig;
