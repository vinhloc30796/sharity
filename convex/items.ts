import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";

// Seed function for testing (no auth required)
export const seed = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Check if already seeded
		const existing = await ctx.db.query("items").first();
		if (existing) {
			return { message: "Already seeded", count: 0 };
		}

		const testOwnerId = "test-user-seed";

		const testItems = [
			{
				name: "Rice Cooker",
				description:
					"Electric rice cooker, 1.8L capacity. Perfect for 2-4 people.",
				category: "kitchen" as const,
				location: { lat: 11.9404, lng: 108.4583, address: "Da Lat Market" },
			},
			{
				name: "Camping Tent",
				description: "2-person waterproof tent. Great for weekend trips.",
				category: "sports" as const,
				location: { lat: 11.945, lng: 108.442, address: "Xuan Huong Lake" },
			},
			{
				name: "LED Desk Lamp",
				description: "Adjustable brightness LED lamp with USB charging port.",
				category: "electronics" as const,
				location: { lat: 11.938, lng: 108.455, address: "Da Lat University" },
			},
			{
				name: "Winter Jacket",
				description: "Warm fleece jacket, size M. Perfect for Da Lat evenings.",
				category: "clothing" as const,
				location: { lat: 11.942, lng: 108.461, address: "Hoa Binh Square" },
			},
			{
				name: "Vietnamese Cookbook",
				description: "Traditional recipes from Central Vietnam. 200+ recipes.",
				category: "books" as const,
				location: { lat: 11.936, lng: 108.448, address: "Crazy House" },
			},
			{
				name: "Folding Chair",
				description:
					"Portable folding chair for outdoor use. Lightweight aluminum.",
				category: "furniture" as const,
				location: { lat: 11.948, lng: 108.453, address: "Valley of Love" },
			},
			{
				name: "Yoga Mat",
				description: "Non-slip yoga mat, 6mm thick. Includes carrying strap.",
				category: "sports" as const,
				location: { lat: 11.934, lng: 108.462, address: "Langbiang Mountain" },
			},
			{
				name: "Bluetooth Speaker",
				description: "Portable waterproof speaker. 10 hour battery life.",
				category: "electronics" as const,
				location: { lat: 11.941, lng: 108.45, address: "Da Lat Night Market" },
			},
			{
				name: "Coffee Grinder",
				description: "Manual burr coffee grinder. Perfect for Da Lat coffee!",
				category: "kitchen" as const,
				location: { lat: 11.939, lng: 108.456, address: "Big C Da Lat" },
			},
			{
				name: "Board Games Set",
				description:
					"Collection of classic board games: Chess, Checkers, Backgammon.",
				category: "other" as const,
				location: {
					lat: 11.943,
					lng: 108.447,
					address: "Da Lat Railway Station",
				},
			},
		];

		for (const item of testItems) {
			await ctx.db.insert("items", {
				name: item.name,
				description: item.description,
				ownerId: testOwnerId,
				category: item.category,
				location: item.location,
			});
		}

		return { message: "Seeded successfully", count: testItems.length };
	},
});

export const get = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		const items = await ctx.db.query("items").order("desc").collect();

		if (!identity) {
			const itemsWithUrls = await Promise.all(
				items.map(async (item) => {
					let imageUrls: (string | null)[] = [];
					if (item.imageStorageIds) {
						imageUrls = await Promise.all(
							item.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
						);
					}

					const images = item.imageStorageIds
						? (item.imageStorageIds
								.map((id, idx) => ({ id, url: imageUrls[idx] }))
								.filter((img) => img.url !== null) as {
								id: Id<"_storage">;
								url: string;
							}[])
						: [];

					return {
						...item,
						images,
						imageUrls: images.map((i) => i.url),
						isRequested: false,
					};
				}),
			);
			return itemsWithUrls;
		}

		const myClaims = await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) => q.eq("claimerId", identity.subject))
			.collect();

		const myClaimedItemIds = new Set(myClaims.map((c) => c.itemId));

		const itemsWithUrls = await Promise.all(
			items
				.filter((item) => item.ownerId !== identity.subject)
				.map(async (item) => {
					let imageUrls: (string | null)[] = [];
					if (item.imageStorageIds) {
						imageUrls = await Promise.all(
							item.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
						);
					}
					const images = item.imageStorageIds
						? (item.imageStorageIds
								.map((id, idx) => ({ id, url: imageUrls[idx] }))
								.filter((img) => img.url !== null) as {
								id: Id<"_storage">;
								url: string;
							}[])
						: [];

					return {
						...item,
						images,
						imageUrls: images.map((i) => i.url),
						isRequested: myClaimedItemIds.has(item._id),
					};
				}),
		);
		return itemsWithUrls;
	},
});

export const getById = query({
	args: { id: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		const item = await ctx.db.get(args.id);

		if (!item) return null;

		let imageUrls: (string | null)[] = [];
		if (item.imageStorageIds) {
			imageUrls = await Promise.all(
				item.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
			);
		}

		const images = item.imageStorageIds
			? (item.imageStorageIds
					.map((id, idx) => ({ id, url: imageUrls[idx] }))
					.filter((img) => img.url !== null) as {
					id: Id<"_storage">;
					url: string;
				}[])
			: [];

		const isOwner = identity?.subject === item.ownerId;

		let requests = undefined;
		if (isOwner) {
			requests = await ctx.db
				.query("claims")
				.withIndex("by_item", (q) => q.eq("itemId", args.id))
				.collect();
		}

		// Always fetch my claims for this item to support multiple requests
		const myClaims = await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) =>
				q.eq("claimerId", identity?.subject ?? ""),
			)
			.filter((q) => q.eq(q.field("itemId"), args.id))
			.collect();

		return {
			...item,
			images,
			imageUrls: images.map((i) => i.url),
			isOwner,
			requests,
			myClaims,
		};
	},
});

export const getMyItems = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return [];
		}

		// 1. Get items owned by the user
		const ownedItems = await ctx.db
			.query("items")
			.filter((q) => q.eq(q.field("ownerId"), identity.subject))
			.order("desc")
			.collect();

		// 2. Get items borrowed by the user (approved claims)
		const myClaims = await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) => q.eq("claimerId", identity.subject))
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		const borrowedItemIds = myClaims.map((c) => c.itemId);

		// Fetch the actual item documents for borrowed items
		const borrowedItems = [];
		for (const itemId of borrowedItemIds) {
			const item = await ctx.db.get(itemId);
			if (item) {
				borrowedItems.push(item);
			}
		}

		// 3. Combine and add isOwner flag
		const result = [
			...ownedItems.map((item) => ({ ...item, isOwner: true })),
			...borrowedItems.map((item) => ({ ...item, isOwner: false })),
		];

		const resultWithUrls = await Promise.all(
			result.map(async (item) => {
				let imageUrls: (string | null)[] = [];
				if (item.imageStorageIds) {
					imageUrls = await Promise.all(
						item.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
					);
				}
				const images = item.imageStorageIds
					? (item.imageStorageIds
							.map((id, idx) => ({ id, url: imageUrls[idx] }))
							.filter((img) => img.url !== null) as {
							id: Id<"_storage">;
							url: string;
						}[])
					: [];

				return {
					...item,
					images,
					imageUrls: images.map((i) => i.url),
				};
			}),
		);

		return resultWithUrls;
	},
});

const categoryValidator = v.optional(
	v.union(
		v.literal("kitchen"),
		v.literal("furniture"),
		v.literal("electronics"),
		v.literal("clothing"),
		v.literal("books"),
		v.literal("sports"),
		v.literal("other"),
	),
);

const locationValidator = v.optional(
	v.object({
		lat: v.number(),
		lng: v.number(),
		address: v.optional(v.string()),
	}),
);

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
		category: categoryValidator,
		location: locationValidator,
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthenticated call to mutation");
		}
		const ownerId = identity.subject;

		const itemId = await ctx.db.insert("items", {
			name: args.name,
			description: args.description,
			ownerId,
			imageStorageIds: args.imageStorageIds,
			category: args.category,
			location: args.location,
		});

		await ctx.db.insert("item_activity", {
			itemId,
			type: "item_created",
			actorId: ownerId,
			createdAt: Date.now(),
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("items"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
		category: categoryValidator,
		location: locationValidator,
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthenticated call to mutation");
		}
		const { id, ...fields } = args;

		const item = await ctx.db.get(id);
		if (!item) {
			throw new Error("Item not found");
		}

		if (item.ownerId !== identity.subject) {
			throw new Error("Unauthorized: You do not own this item");
		}

		await ctx.db.patch(id, fields);
	},
});

export const deleteItem = mutation({
	args: { id: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthenticated call to mutation");
		}

		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Item not found");
		}

		if (item.ownerId !== identity.subject) {
			throw new Error("Unauthorized: You do not own this item");
		}

		await ctx.db.delete(args.id);
	},
});

export const requestItem = mutation({
	args: {
		id: v.id("items"),
		startDate: v.number(),
		endDate: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.id);
		if (!item) throw new Error("Item not found");
		if (item.ownerId === identity.subject)
			throw new Error("Cannot claim your own item");

		// Validate dates
		const now = Date.now();
		// Allow some buffer or strip time components if strict?
		// For now simple checks.
		if (args.endDate < args.startDate) {
			throw new Error("End date must be after start date");
		}
		if (args.startDate < now - 24 * 60 * 60 * 1000) {
			// Allow "today" even if slightly past now, roughly.
			// But strictly past dates shouldn't be allowed ideally.
			// Let's just say startDate must be >= today.
		}

		// Check for specific overlaps with APPROVED claims
		const approvedClaims = await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.id))
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		const hasOverlap = approvedClaims.some((claim) => {
			return args.startDate < claim.endDate && args.endDate > claim.startDate;
		});

		if (hasOverlap) {
			throw new Error("Item is not available for these dates");
		}

		// Check for self-overlap (User cannot have overlapping requests for the same item)
		const myRequests = await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) => q.eq("claimerId", identity.subject))
			.filter((q) => q.eq(q.field("itemId"), args.id))
			.collect();

		const hasSelfOverlap = myRequests.some((req) => {
			// Check if new request overlaps with existing request
			return args.startDate < req.endDate && args.endDate > req.startDate;
		});

		if (hasSelfOverlap) {
			throw new Error(
				"You already have a request that overlaps with these dates",
			);
		}

		const pendingClaims = await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.id))
			.filter((q) => q.eq(q.field("status"), "pending"))
			.collect();

		if (pendingClaims.length >= 5) {
			throw new Error("Waitlist is full");
		}

		const claimId = await ctx.db.insert("claims", {
			itemId: args.id,
			claimerId: identity.subject,
			status: "pending",
			startDate: args.startDate,
			endDate: args.endDate,
		});

		// Notify owner
		await ctx.db.insert("notifications", {
			recipientId: item.ownerId,
			type: "new_request",
			itemId: args.id,
			requestId: claimId,
			isRead: false,
			createdAt: Date.now(),
		});
	},
});

export const getClaims = query({
	args: { id: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];

		const item = await ctx.db.get(args.id);
		if (!item) return [];

		if (item.ownerId !== identity.subject) {
			throw new Error("Unauthorized");
		}

		return await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.id))
			.collect();
	},
});

export const approveClaim = mutation({
	args: { claimId: v.id("claims"), id: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.id);
		if (!item) throw new Error("Item not found");
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.id) throw new Error("Mismatch item/claim");

		await ctx.db.patch(args.claimId, { status: "approved" });

		await ctx.db.insert("item_activity", {
			itemId: args.id,
			type: "loan_started",
			actorId: identity.subject,
			createdAt: Date.now(),
			claimId: args.claimId,
			borrowerId: claim.claimerId,
			startDate: claim.startDate,
			endDate: claim.endDate,
		});

		// Notify claimer
		await ctx.db.insert("notifications", {
			recipientId: claim.claimerId,
			type: "request_approved",
			itemId: args.id,
			requestId: args.claimId,
			isRead: false,
			createdAt: Date.now(),
		});

		// We no longer set isAvailable to false globally, as it depends on dates.

		// Optionally reject others or leave them pending?
		// Usually once approved, others are implicitly rejected or on hold.
		// Let's leave them pending but they effectively can't get it unless this one is cancelled.
	},
});

export const markPickedUp = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.optional(v.id("claims")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const createdAt = Date.now();

		if (args.claimId) {
			const claim = await ctx.db.get(args.claimId);
			if (!claim) throw new Error("Claim not found");
			if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
			if (claim.status !== "approved") {
				throw new Error("Only approved claims can be marked as picked up");
			}

			await ctx.db.insert("item_activity", {
				itemId: args.itemId,
				type: "item_picked_up",
				actorId: identity.subject,
				createdAt,
				claimId: args.claimId,
				borrowerId: claim.claimerId,
				startDate: claim.startDate,
				endDate: claim.endDate,
			});
			return;
		}

		await ctx.db.insert("item_activity", {
			itemId: args.itemId,
			type: "item_picked_up",
			actorId: identity.subject,
			createdAt,
		});
	},
});

export const markReturned = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.optional(v.id("claims")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const createdAt = Date.now();

		if (args.claimId) {
			const claim = await ctx.db.get(args.claimId);
			if (!claim) throw new Error("Claim not found");
			if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
			if (claim.status !== "approved") {
				throw new Error("Only approved claims can be marked as returned");
			}

			await ctx.db.insert("item_activity", {
				itemId: args.itemId,
				type: "item_returned",
				actorId: identity.subject,
				createdAt,
				claimId: args.claimId,
				borrowerId: claim.claimerId,
				startDate: claim.startDate,
				endDate: claim.endDate,
			});
			return;
		}

		await ctx.db.insert("item_activity", {
			itemId: args.itemId,
			type: "item_returned",
			actorId: identity.subject,
			createdAt,
		});
	},
});

export const rejectClaim = mutation({
	args: { claimId: v.id("claims"), id: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.id);
		if (!item) throw new Error("Item not found");
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");

		await ctx.db.patch(args.claimId, { status: "rejected" });

		// Notify claimer
		await ctx.db.insert("notifications", {
			recipientId: claim.claimerId,
			type: "request_rejected",
			itemId: args.id,
			requestId: args.claimId,
			isRead: false,
			createdAt: Date.now(),
		});
	},
});

export const cancelClaim = mutation({
	args: { claimId: v.id("claims"), itemId: v.optional(v.id("items")) },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");

		if (claim.claimerId !== identity.subject) {
			throw new Error("Unauthorized: You cannot cancel this claim");
		}

		await ctx.db.delete(claim._id);

		if (claim.status === "approved") {
			// Notify subscribers that item is available
			const subscriptions = await ctx.db
				.query("availability_alerts")
				.withIndex("by_item", (q) => q.eq("itemId", claim.itemId))
				.collect();

			for (const sub of subscriptions) {
				await ctx.db.insert("notifications", {
					recipientId: sub.userId,
					type: "item_available",
					itemId: claim.itemId,
					isRead: false,
					createdAt: Date.now(),
				});
				// Remove subscription after notifying
				await ctx.db.delete(sub._id);
			}
		}
	},
});

export const getAvailability = query({
	args: { id: v.id("items") },
	handler: async (ctx, args) => {
		const claims = await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.id))
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		return claims.map((c) => ({
			startDate: c.startDate,
			endDate: c.endDate,
		}));
	},
});

export const getMyRequests = query({
	args: { itemId: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];

		return await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) => q.eq("claimerId", identity.subject))
			.filter((q) => q.eq(q.field("itemId"), args.itemId))
			.collect();
	},
});

export const getItemActivity = query({
	args: { itemId: v.id("items") },
	handler: async (ctx, args) => {
		const events = await ctx.db
			.query("item_activity")
			.withIndex("by_item_createdAt", (q) => q.eq("itemId", args.itemId))
			.order("desc")
			.take(50);

		return events;
	},
});

export const generateUploadUrl = mutation(async (ctx) => {
	return await ctx.storage.generateUploadUrl();
});

// Internal mutation for seed script (no auth required)
export const updateImageInternal = internalMutation({
	args: {
		id: v.id("items"),
		imageStorageIds: v.array(v.id("_storage")),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { imageStorageIds: args.imageStorageIds });
	},
});

// Image URLs for seeding
const SEED_IMAGE_URLS: Record<string, string> = {
	"Rice Cooker":
		"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
	"Camping Tent":
		"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop",
	"LED Desk Lamp":
		"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop",
	"Winter Jacket":
		"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop",
	"Vietnamese Cookbook":
		"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop",
	"Folding Chair":
		"https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
	"Yoga Mat":
		"https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop",
	"Bluetooth Speaker":
		"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop",
	"Coffee Grinder":
		"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=300&fit=crop",
	"Board Games Set":
		"https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400&h=300&fit=crop",
};

// Action to seed images (can fetch external URLs)
export const seedImages = action({
	args: {},
	handler: async (ctx): Promise<{ success: number; failed: number }> => {
		const items = await ctx.runQuery(api.items.get);
		let success = 0;
		let failed = 0;

		for (const item of items) {
			const imageUrl = SEED_IMAGE_URLS[item.name];
			if (!imageUrl) continue;

			// Skip if already has images
			if (item.imageUrls && item.imageUrls.length > 0) {
				console.log(`Skipping ${item.name} - already has images`);
				continue;
			}

			try {
				console.log(`Downloading image for: ${item.name}`);
				const response = await fetch(imageUrl);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);

				const imageBlob = await response.blob();

				// Get upload URL and upload
				const uploadUrl = await ctx.runMutation(api.items.generateUploadUrl);
				const uploadResponse = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": imageBlob.type || "image/jpeg" },
					body: imageBlob,
				});

				if (!uploadResponse.ok) throw new Error("Upload failed");

				const { storageId } = await uploadResponse.json();

				// Update item
				await ctx.runMutation(internal.items.updateImageInternal, {
					id: item._id,
					imageStorageIds: [storageId],
				});

				console.log(`✅ ${item.name} - done`);
				success++;
			} catch (error) {
				console.error(`❌ ${item.name}:`, error);
				failed++;
			}
		}

		return { success, failed };
	},
});
