// Local development: hardcoded Clerk issuer URL
// For production: restore process.env.CLERK_ISSUER_URL
const CLERK_ISSUER_URL = "https://trusted-shiner-99.clerk.accounts.dev";

export default {
	providers: [
		{
			domain: CLERK_ISSUER_URL,
			applicationID: "convex",
		},
	],
};
