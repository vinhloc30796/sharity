import { mutation } from "./_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Force update ALL claims to have past dates (regardless of current dates).
 */
export const forceAllClaimsPast = mutation({
	args: {},
	handler: async (ctx) => {
		const claims = await ctx.db.query("claims").collect();

		const now = Date.now();
		let updated = 0;

		for (const claim of claims) {
			await ctx.db.patch(claim._id, {
				status: "approved",
				startDate: now - 7 * ONE_DAY_MS, // Started 7 days ago
				endDate: now - 1 * ONE_DAY_MS, // Ended yesterday
				approvedAt: claim.approvedAt ?? now - 8 * ONE_DAY_MS,
			});
			updated++;
		}

		return { updated };
	},
});

/**
 * Update all approved claims to have dates in the past so ratings can be tested.
 * Run this from the Convex dashboard: npx convex dashboard → Functions → seed:makeClaimsRatable
 */
export const makeClaimsRatable = mutation({
	args: {},
	handler: async (ctx) => {
		const claims = await ctx.db
			.query("claims")
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		const now = Date.now();
		let updated = 0;

		for (const claim of claims) {
			// Only update if startDate is in the future
			if (claim.startDate > now) {
				await ctx.db.patch(claim._id, {
					startDate: now - 7 * ONE_DAY_MS, // Started 7 days ago
					endDate: now - 1 * ONE_DAY_MS, // Ended yesterday
				});
				updated++;
			}
		}

		return { updated, total: claims.length };
	},
});

/**
 * Approve all pending claims and set dates to past for rating testing.
 */
export const approvePendingClaimsForTesting = mutation({
	args: {},
	handler: async (ctx) => {
		const claims = await ctx.db
			.query("claims")
			.filter((q) => q.eq(q.field("status"), "pending"))
			.collect();

		const now = Date.now();
		let updated = 0;

		for (const claim of claims) {
			await ctx.db.patch(claim._id, {
				status: "approved",
				approvedAt: now - 8 * ONE_DAY_MS,
				startDate: now - 7 * ONE_DAY_MS, // Started 7 days ago
				endDate: now - 1 * ONE_DAY_MS, // Ended yesterday
			});
			updated++;
		}

		return { approved: updated };
	},
});

/**
 * Create test claims between two users for rating testing.
 * You need to provide actual user IDs from Clerk.
 */
export const createTestClaims = mutation({
	args: {},
	handler: async (ctx) => {
		// Get all items
		const items = await ctx.db.query("items").collect();

		if (items.length === 0) {
			return { error: "No items found. Create some items first." };
		}

		// Get unique owner IDs
		const ownerIds = [...new Set(items.map((i) => i.ownerId))];

		if (ownerIds.length < 2) {
			return {
				error:
					"Need at least 2 different users with items. Create items from different accounts.",
			};
		}

		const now = Date.now();
		let created = 0;

		// For each item, create a claim from a different user
		for (const item of items) {
			// Find another user to be the claimer
			const otherUserId = ownerIds.find((id) => id !== item.ownerId);
			if (!otherUserId) continue;

			// Check if a claim already exists
			const existingClaim = await ctx.db
				.query("claims")
				.withIndex("by_item", (q) => q.eq("itemId", item._id))
				.filter((q) => q.eq(q.field("claimerId"), otherUserId))
				.first();

			if (existingClaim) continue;

			// Create approved claim with past dates
			await ctx.db.insert("claims", {
				itemId: item._id,
				claimerId: otherUserId,
				status: "approved",
				startDate: now - 7 * ONE_DAY_MS,
				endDate: now - 1 * ONE_DAY_MS,
				requestedAt: now - 10 * ONE_DAY_MS,
				approvedAt: now - 8 * ONE_DAY_MS,
			});

			created++;
		}

		return { created, itemsProcessed: items.length };
	},
});
