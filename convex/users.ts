import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Contact info validator
const contactsValidator = v.optional(
	v.object({
		telegram: v.optional(v.string()),
		whatsapp: v.optional(v.string()),
		facebook: v.optional(v.string()),
		phone: v.optional(v.string()),
	}),
);

/**
 * Get current user's profile
 */
export const getMyProfile = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		// Clerk data for comparison/reset
		const clerkData = {
			name: identity.name || identity.nickname || null,
			email: identity.email || null,
			avatarUrl: identity.pictureUrl || null,
		};

		const profile = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.first();

		if (!profile) {
			// Return basic info from Clerk if no profile exists yet
			return {
				clerkId: identity.subject,
				name: clerkData.name,
				email: clerkData.email,
				avatarUrl: clerkData.avatarUrl,
				address: null,
				bio: null,
				contacts: null,
				hasProfile: false,
				clerkData,
			};
		}

		// Get avatar URL if exists
		let avatarUrl: string | null = null;
		if (profile.avatarStorageId) {
			avatarUrl = await ctx.storage.getUrl(profile.avatarStorageId);
		} else if (identity.pictureUrl) {
			// Fallback to Clerk avatar
			avatarUrl = identity.pictureUrl;
		}

		return {
			...profile,
			email: clerkData.email,
			avatarUrl,
			hasProfile: true,
			clerkData,
		};
	},
});

/**
 * Get basic user info (name + avatar) for display in UI
 * Lightweight query for UserLink component
 */
export const getBasicInfo = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
			.first();

		if (!profile) {
			return {
				userId: args.userId,
				name: null,
				avatarUrl: null,
			};
		}

		let avatarUrl: string | null = null;
		if (profile.avatarStorageId) {
			avatarUrl = await ctx.storage.getUrl(profile.avatarStorageId);
		}

		return {
			userId: args.userId,
			name: profile.name || null,
			avatarUrl,
		};
	},
});

/**
 * Get user profile by Clerk ID (for viewing other users)
 */
export const getProfile = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
			.first();

		if (!profile) {
			return null;
		}

		// Get avatar URL if exists
		let avatarUrl: string | null = null;
		if (profile.avatarStorageId) {
			avatarUrl = await ctx.storage.getUrl(profile.avatarStorageId);
		}

		// Don't expose full contact details to other users - just show what's available
		return {
			_id: profile._id,
			clerkId: profile.clerkId,
			name: profile.name,
			avatarUrl,
			address: profile.address,
			bio: profile.bio, // Bio is public
			// Only show which contact methods are available, not the actual values
			availableContacts: {
				telegram: !!profile.contacts?.telegram,
				whatsapp: !!profile.contacts?.whatsapp,
				facebook: !!profile.contacts?.facebook,
				phone: !!profile.contacts?.phone,
			},
			createdAt: profile.createdAt,
		};
	},
});

/**
 * Get full profile with contacts (only for users who have an approved claim with this user)
 */
export const getProfileWithContacts = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		// Check if there's an approved claim between these users
		const claims = await ctx.db.query("claims").collect();
		const items = await ctx.db.query("items").collect();

		const hasApprovedInteraction = claims.some((claim) => {
			if (claim.status !== "approved") return false;

			const item = items.find((i) => i._id === claim.itemId);
			if (!item) return false;

			// Current user is borrower, target is lender
			if (
				claim.claimerId === identity.subject &&
				item.ownerId === args.userId
			) {
				return true;
			}
			// Current user is lender, target is borrower
			if (
				item.ownerId === identity.subject &&
				claim.claimerId === args.userId
			) {
				return true;
			}
			return false;
		});

		if (!hasApprovedInteraction) {
			return null; // No access to contacts
		}

		const profile = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
			.first();

		if (!profile) {
			return null;
		}

		let avatarUrl: string | null = null;
		if (profile.avatarStorageId) {
			avatarUrl = await ctx.storage.getUrl(profile.avatarStorageId);
		}

		return {
			...profile,
			avatarUrl,
		};
	},
});

/**
 * Create or update user profile
 */
export const updateProfile = mutation({
	args: {
		name: v.optional(v.string()),
		address: v.optional(v.string()),
		bio: v.optional(v.string()),
		contacts: contactsValidator,
		avatarStorageId: v.optional(v.id("_storage")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthenticated");
		}

		// Validate bio length
		if (args.bio && args.bio.length > 500) {
			throw new Error("Bio must be 500 characters or less");
		}

		const existingProfile = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.first();

		const now = Date.now();

		if (existingProfile) {
			// Update existing profile
			await ctx.db.patch(existingProfile._id, {
				...args,
				updatedAt: now,
			});
			return existingProfile._id;
		}

		// Create new profile
		const profileId = await ctx.db.insert("users", {
			clerkId: identity.subject,
			name: args.name,
			address: args.address,
			bio: args.bio,
			contacts: args.contacts,
			avatarStorageId: args.avatarStorageId,
			createdAt: now,
			updatedAt: now,
		});

		return profileId;
	},
});

/**
 * Generate upload URL for avatar
 */
export const generateAvatarUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthenticated");
		}
		return await ctx.storage.generateUploadUrl();
	},
});

/**
 * Get user's lending and borrowing history
 */
export const getUserHistory = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		// Get all items owned by this user
		const ownedItems = await ctx.db
			.query("items")
			.filter((q) => q.eq(q.field("ownerId"), args.userId))
			.collect();

		const ownedItemIds = new Set(ownedItems.map((i) => i._id));

		// Get all claims
		const allClaims = await ctx.db.query("claims").collect();

		// Lending history: claims on items this user owns (approved or completed)
		const lendingClaims = allClaims.filter(
			(c) => ownedItemIds.has(c.itemId) && c.status === "approved",
		);

		// Borrowing history: claims made by this user
		const borrowingClaims = allClaims.filter(
			(c) => c.claimerId === args.userId && c.status === "approved",
		);

		// Get item details for all claims
		const allItems = await ctx.db.query("items").collect();
		const itemsMap = new Map(allItems.map((i) => [i._id, i]));

		// Format lending history
		const lendingHistory = await Promise.all(
			lendingClaims.map(async (claim) => {
				const item = itemsMap.get(claim.itemId);
				let imageUrl: string | null = null;
				if (item?.imageStorageIds?.[0]) {
					imageUrl = await ctx.storage.getUrl(item.imageStorageIds[0]);
				}
				return {
					claimId: claim._id,
					itemId: claim.itemId,
					itemName: item?.name || "Unknown",
					itemImageUrl: imageUrl,
					borrowerId: claim.claimerId,
					startDate: claim.startDate,
					endDate: claim.endDate,
					status: claim.status,
				};
			}),
		);

		// Format borrowing history
		const borrowingHistory = await Promise.all(
			borrowingClaims.map(async (claim) => {
				const item = itemsMap.get(claim.itemId);
				let imageUrl: string | null = null;
				if (item?.imageStorageIds?.[0]) {
					imageUrl = await ctx.storage.getUrl(item.imageStorageIds[0]);
				}
				return {
					claimId: claim._id,
					itemId: claim.itemId,
					itemName: item?.name || "Unknown",
					itemImageUrl: imageUrl,
					lenderId: item?.ownerId || "Unknown",
					startDate: claim.startDate,
					endDate: claim.endDate,
					status: claim.status,
				};
			}),
		);

		return {
			lending: lendingHistory,
			borrowing: borrowingHistory,
			stats: {
				totalLent: lendingHistory.length,
				totalBorrowed: borrowingHistory.length,
			},
		};
	},
});
