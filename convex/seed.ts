import { mutation, query } from "./_generated/server";

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
 * View current database state for debugging.
 */
export const viewTestData = query({
	args: {},
	handler: async (ctx) => {
		const items = await ctx.db.query("items").collect();
		const claims = await ctx.db.query("claims").collect();
		const ratings = await ctx.db.query("ratings").collect();

		// Group items by owner
		const itemsByOwner = new Map<string, typeof items>();
		for (const item of items) {
			const ownerItems = itemsByOwner.get(item.ownerId) ?? [];
			ownerItems.push(item);
			itemsByOwner.set(item.ownerId, ownerItems);
		}

		// Format claims with item info
		const claimsWithInfo = claims.map((claim) => {
			const item = items.find((i) => i._id === claim.itemId);
			return {
				claimId: claim._id,
				itemName: item?.name ?? "Unknown",
				itemOwner: item?.ownerId ?? "Unknown",
				claimer: claim.claimerId,
				status: claim.status,
				startDate: new Date(claim.startDate).toISOString(),
				endDate: new Date(claim.endDate).toISOString(),
				canRate: claim.status === "approved" && claim.startDate < Date.now(),
			};
		});

		return {
			users: [...itemsByOwner.keys()],
			itemCount: items.length,
			claimCount: claims.length,
			ratingCount: ratings.length,
			claims: claimsWithInfo,
		};
	},
});

/**
 * Setup complete test data for rating system.
 * Creates cross-claims so both users can rate each other in both roles.
 */
export const setupRatingTestData = mutation({
	args: {},
	handler: async (ctx) => {
		const items = await ctx.db.query("items").collect();

		// Get unique owners
		const ownerIds = [...new Set(items.map((i) => i.ownerId))];

		if (ownerIds.length < 2) {
			return {
				error: "Need at least 2 users with items. Log in with both Google accounts and create an item from each.",
				users: ownerIds,
			};
		}

		const [userA, userB] = ownerIds;
		const itemsOfA = items.filter((i) => i.ownerId === userA);
		const itemsOfB = items.filter((i) => i.ownerId === userB);

		if (itemsOfA.length === 0 || itemsOfB.length === 0) {
			return {
				error: "Each user needs at least one item.",
				userA: { id: userA, itemCount: itemsOfA.length },
				userB: { id: userB, itemCount: itemsOfB.length },
			};
		}

		const now = Date.now();
		const results = {
			created: [] as string[],
			skipped: [] as string[],
		};

		// Scenario 1: User B borrows from User A
		// (User A can rate B as borrower, User B can rate A as lender)
		for (const item of itemsOfA) {
			const existing = await ctx.db
				.query("claims")
				.withIndex("by_item", (q) => q.eq("itemId", item._id))
				.filter((q) => q.eq(q.field("claimerId"), userB))
				.first();

			if (existing) {
				// Update to ensure it's ratable
				await ctx.db.patch(existing._id, {
					status: "approved",
					startDate: now - 14 * ONE_DAY_MS,
					endDate: now - 7 * ONE_DAY_MS,
					approvedAt: now - 15 * ONE_DAY_MS,
				});
				results.skipped.push(`${item.name} (updated existing)`);
			} else {
				await ctx.db.insert("claims", {
					itemId: item._id,
					claimerId: userB,
					status: "approved",
					startDate: now - 14 * ONE_DAY_MS,
					endDate: now - 7 * ONE_DAY_MS,
					requestedAt: now - 16 * ONE_DAY_MS,
					approvedAt: now - 15 * ONE_DAY_MS,
				});
				results.created.push(`${item.name} (B borrows from A)`);
			}
		}

		// Scenario 2: User A borrows from User B
		// (User B can rate A as borrower, User A can rate B as lender)
		for (const item of itemsOfB) {
			const existing = await ctx.db
				.query("claims")
				.withIndex("by_item", (q) => q.eq("itemId", item._id))
				.filter((q) => q.eq(q.field("claimerId"), userA))
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, {
					status: "approved",
					startDate: now - 10 * ONE_DAY_MS,
					endDate: now - 3 * ONE_DAY_MS,
					approvedAt: now - 11 * ONE_DAY_MS,
				});
				results.skipped.push(`${item.name} (updated existing)`);
			} else {
				await ctx.db.insert("claims", {
					itemId: item._id,
					claimerId: userA,
					status: "approved",
					startDate: now - 10 * ONE_DAY_MS,
					endDate: now - 3 * ONE_DAY_MS,
					requestedAt: now - 12 * ONE_DAY_MS,
					approvedAt: now - 11 * ONE_DAY_MS,
				});
				results.created.push(`${item.name} (A borrows from B)`);
			}
		}

		return {
			success: true,
			userA,
			userB,
			...results,
			testScenarios: [
				`Login as User A: can rate User B as borrower (for lending items) AND as lender (for borrowing items)`,
				`Login as User B: can rate User A as borrower (for lending items) AND as lender (for borrowing items)`,
			],
		};
	},
});

/**
 * Clear all ratings (for re-testing).
 */
export const clearAllRatings = mutation({
	args: {},
	handler: async (ctx) => {
		const ratings = await ctx.db.query("ratings").collect();
		for (const rating of ratings) {
			await ctx.db.delete(rating._id);
		}
		return { deleted: ratings.length };
	},
});

/**
 * Setup claims between two specific real users for rating testing.
 * Hardcoded for your two Google accounts.
 */
export const setupClaimsForRealUsers = mutation({
	args: {},
	handler: async (ctx) => {
		// Your two Google accounts
		const userA = "user_38gb4lqLetM0bfE5ChI8DYn5ZLN"; // owns Playing Cards
		const userB = "user_38Wbynzhx7Pimx4nOA6bjYXiKzh"; // owns Mosquito killer

		const items = await ctx.db.query("items").collect();
		const now = Date.now();

		const results = {
			created: [] as string[],
			updated: [] as string[],
		};

		// Find items owned by each user
		const itemsOfUserA = items.filter((i) => i.ownerId === userA);
		const itemsOfUserB = items.filter((i) => i.ownerId === userB);

		// Create/update claims: User B borrows from User A
		for (const item of itemsOfUserA) {
			const existing = await ctx.db
				.query("claims")
				.withIndex("by_item", (q) => q.eq("itemId", item._id))
				.filter((q) => q.eq(q.field("claimerId"), userB))
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, {
					status: "approved",
					startDate: now - 14 * ONE_DAY_MS,
					endDate: now - 7 * ONE_DAY_MS,
					approvedAt: now - 15 * ONE_DAY_MS,
				});
				results.updated.push(`${item.name}: UserB borrows from UserA`);
			} else {
				await ctx.db.insert("claims", {
					itemId: item._id,
					claimerId: userB,
					status: "approved",
					startDate: now - 14 * ONE_DAY_MS,
					endDate: now - 7 * ONE_DAY_MS,
					requestedAt: now - 16 * ONE_DAY_MS,
					approvedAt: now - 15 * ONE_DAY_MS,
				});
				results.created.push(`${item.name}: UserB borrows from UserA`);
			}
		}

		// Create/update claims: User A borrows from User B
		for (const item of itemsOfUserB) {
			const existing = await ctx.db
				.query("claims")
				.withIndex("by_item", (q) => q.eq("itemId", item._id))
				.filter((q) => q.eq(q.field("claimerId"), userA))
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, {
					status: "approved",
					startDate: now - 10 * ONE_DAY_MS,
					endDate: now - 3 * ONE_DAY_MS,
					approvedAt: now - 11 * ONE_DAY_MS,
				});
				results.updated.push(`${item.name}: UserA borrows from UserB`);
			} else {
				await ctx.db.insert("claims", {
					itemId: item._id,
					claimerId: userA,
					status: "approved",
					startDate: now - 10 * ONE_DAY_MS,
					endDate: now - 3 * ONE_DAY_MS,
					requestedAt: now - 12 * ONE_DAY_MS,
					approvedAt: now - 11 * ONE_DAY_MS,
				});
				results.created.push(`${item.name}: UserA borrows from UserB`);
			}
		}

		return {
			success: true,
			userA: { id: userA, itemCount: itemsOfUserA.length },
			userB: { id: userB, itemCount: itemsOfUserB.length },
			...results,
			howToTest: [
				"Login as UserA (owns Playing Cards): Rate UserB as borrower + Rate UserB as lender",
				"Login as UserB (owns Mosquito killer): Rate UserA as borrower + Rate UserA as lender",
			],
		};
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
