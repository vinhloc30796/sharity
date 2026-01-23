// Clerk issuer URL from environment variable
// Set via: npx convex env set CLERK_ISSUER_URL "https://xxx.clerk.accounts.dev"
// For local dev: reads from .env.local
const CLERK_ISSUER_URL = process.env.CLERK_ISSUER_URL!;

export default {
	providers: [
		{
			domain: CLERK_ISSUER_URL,
			applicationID: "convex",
		},
	],
};
