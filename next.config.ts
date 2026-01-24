import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "127.0.0.1",
				port: "3210",
			},
			{
				protocol: "https",
				hostname: "*.convex.cloud",
			},
		],
	},
};

export default nextConfig;
