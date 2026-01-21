import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthenticated call to mutation");
		}
		const ownerId = identity.subject;

		await ctx.db.insert("items", {
			name: args.name,
			description: args.description,
			ownerId,
			imageStorageIds: args.imageStorageIds,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("items"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
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
		itemId: v.id("items"),
		startDate: v.number(),
		endDate: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.itemId);
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
			.withIndex("by_item", (q) => q.eq("itemId", args.itemId))
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		const hasOverlap = approvedClaims.some((claim) => {
			return args.startDate < claim.endDate && args.endDate > claim.startDate;
		});

		if (hasOverlap) {
			throw new Error("Item is not available for these dates");
		}

		const existingClaim = await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) => q.eq("claimerId", identity.subject))
			.filter((q) => q.eq(q.field("itemId"), args.itemId))
			.first();

		if (existingClaim) throw new Error("Already requested this item");

		const pendingClaims = await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.itemId))
			.filter((q) => q.eq(q.field("status"), "pending"))
			.collect();

		if (pendingClaims.length >= 5) {
			throw new Error("Waitlist is full");
		}

		const claimId = await ctx.db.insert("claims", {
			itemId: args.itemId,
			claimerId: identity.subject,
			status: "pending",
			startDate: args.startDate,
			endDate: args.endDate,
		});

		// Notify owner
		await ctx.db.insert("notifications", {
			recipientId: item.ownerId,
			type: "new_request",
			itemId: args.itemId,
			requestId: claimId,
			isRead: false,
			createdAt: Date.now(),
		});
	},
});

export const getClaims = query({
	args: { itemId: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];

		const item = await ctx.db.get(args.itemId);
		if (!item) return [];

		if (item.ownerId !== identity.subject) {
			throw new Error("Unauthorized");
		}

		return await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.itemId))
			.collect();
	},
});

export const approveClaim = mutation({
	args: { claimId: v.id("claims"), itemId: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");

		await ctx.db.patch(args.claimId, { status: "approved" });

		// Notify claimer
		await ctx.db.insert("notifications", {
			recipientId: claim.claimerId,
			type: "request_approved",
			itemId: args.itemId,
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

export const rejectClaim = mutation({
	args: { claimId: v.id("claims"), itemId: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");

		await ctx.db.patch(args.claimId, { status: "rejected" });

		// Notify claimer
		await ctx.db.insert("notifications", {
			recipientId: claim.claimerId,
			type: "request_rejected",
			itemId: args.itemId,
			requestId: args.claimId,
			isRead: false,
			createdAt: Date.now(),
		});
	},
});

export const cancelClaim = mutation({
	args: { itemId: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const claim = await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) => q.eq("claimerId", identity.subject))
			.filter((q) => q.eq(q.field("itemId"), args.itemId))
			.first();

		if (!claim) throw new Error("No claim found");

		await ctx.db.delete(claim._id);

		if (claim.status === "approved") {
			// Notify subscribers that item is available
			const subscriptions = await ctx.db
				.query("availability_alerts")
				.withIndex("by_item", (q) => q.eq("itemId", args.itemId))
				.collect();

			for (const sub of subscriptions) {
				await ctx.db.insert("notifications", {
					recipientId: sub.userId,
					type: "item_available",
					itemId: args.itemId,
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
	args: { itemId: v.id("items") },
	handler: async (ctx, args) => {
		const claims = await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.itemId))
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		return claims.map((c) => ({
			startDate: c.startDate,
			endDate: c.endDate,
		}));
	},
});

export const generateUploadUrl = mutation(async (ctx) => {
	return await ctx.storage.generateUploadUrl();
});
