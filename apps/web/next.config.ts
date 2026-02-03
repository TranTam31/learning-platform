import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["https://jong-triangled-courtney.ngrok-free.dev"],
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: `http://localhost:8000/api/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
