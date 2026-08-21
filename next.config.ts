import type { NextConfig } from "next";

// Exercise photos (exercises.image_url) can point at this project's Supabase
// Storage public URLs -- next/image refuses to optimize any remote host
// that isn't explicitly allow-listed here, so without this every real
// exercise photo throws instead of rendering. Derived from the same env
// var the Supabase client already reads, so it stays correct per environment
// instead of hardcoding one project's hostname.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
