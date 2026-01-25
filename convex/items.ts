import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function otherPartyId(args: {
	itemOwnerId: string;
	claimerId: string;
	actorId: string;
}): string {
	const { itemOwnerId, claimerId, actorId } = args;
	if (actorId === itemOwnerId) return claimerId;
	if (actorId === claimerId) return itemOwnerId;
	throw new Error("Unauthorized");
}

function hasDateOverlap(
	a: { startDate: number; endDate: number },
	b: { startDate: number; endDate: number },
): boolean {
	return a.startDate < b.endDate && a.endDate > b.startDate;
}

function isRangeActiveNow(range: {
	startDate: number;
	endDate: number;
}): boolean {
	const now = Date.now();
	return range.startDate <= now && now <= range.endDate;
}

function assertHourAligned(windowStartAt: number): void {
	if (windowStartAt % ONE_HOUR_MS !== 0) {
		throw new Error("Time must be aligned to the hour");
	}
}

function assertOnDay(
	windowStartAt: number,
	dayStartAt: number,
	label: string,
): void {
	if (windowStartAt < dayStartAt || windowStartAt >= dayStartAt + ONE_DAY_MS) {
		throw new Error(`Time must be on the ${label} day`);
	}
}

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

		const activeUnavailableOwners = new Set<string>();
		const ownerBlocks = await ctx.db.query("owner_unavailability").collect();
		for (const block of ownerBlocks) {
			if (isRangeActiveNow(block)) {
				activeUnavailableOwners.add(block.ownerId);
			}
		}

		if (!identity) {
			const itemsWithUrls = await Promise.all(
				items
					.filter((item) => !activeUnavailableOwners.has(item.ownerId))
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
				.filter((item) => !activeUnavailableOwners.has(item.ownerId))
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

export const getOwnerUnavailability = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const rows = await ctx.db
			.query("owner_unavailability")
			.withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
			.collect();

		return rows.sort((a, b) => a.startDate - b.startDate);
	},
});

export const addOwnerUnavailabilityRange = mutation({
	args: {
		startDate: v.number(),
		endDate: v.number(),
		note: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");
		if (args.endDate < args.startDate) {
			throw new Error("End date must be after start date");
		}

		await ctx.db.insert("owner_unavailability", {
			ownerId: identity.subject,
			startDate: args.startDate,
			endDate: args.endDate,
			note: args.note,
		});
	},
});

export const deleteOwnerUnavailabilityRange = mutation({
	args: { id: v.id("owner_unavailability") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const row = await ctx.db.get(args.id);
		if (!row) throw new Error("Unavailability range not found");
		if (row.ownerId !== identity.subject) throw new Error("Unauthorized");

		await ctx.db.delete(args.id);
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

		const activeBorrowedClaims = myClaims.filter(
			(c) =>
				!!c.pickedUpAt &&
				!c.returnedAt &&
				!c.transferredAt &&
				!c.expiredAt &&
				!c.missingAt,
		);

		const borrowedItemIds = activeBorrowedClaims.map((c) => c.itemId);

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
		ward: v.optional(v.string()),
	}),
);

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		giveaway: v.optional(v.boolean()),
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
			giveaway: args.giveaway,
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

		if (item.giveaway) {
			if (args.endDate !== args.startDate + ONE_DAY_MS) {
				throw new Error("Giveaway pickup date must be a single day");
			}
			// We intentionally don't validate "start of local day" here because
			// server timezones differ from user timezones (Convex often runs in UTC).
			// Hour alignment is enough to keep the data clean for calendar math.
			assertHourAligned(args.startDate);
		}

		const ownerBlocks = await ctx.db
			.query("owner_unavailability")
			.withIndex("by_owner", (q) => q.eq("ownerId", item.ownerId))
			.collect();
		const blocksOverlap = ownerBlocks.some((b) =>
			hasDateOverlap(
				{ startDate: args.startDate, endDate: args.endDate },
				{ startDate: b.startDate, endDate: b.endDate },
			),
		);
		if (blocksOverlap) {
			throw new Error("Item is not available for these dates");
		}

		// Validate dates
		const now = Date.now();
		if (args.endDate <= args.startDate) {
			throw new Error("End date must be after start date");
		}
		if (item.giveaway) {
			// Giveaway requests represent a pickup day in the user's local timezone.
			// We can't reliably compute "today" on the server due to timezone mismatch.
			// Instead, allow the request as long as the requested day hasn't fully passed.
			if (args.endDate <= now) {
				throw new Error("Start date must be today or later");
			}
		} else {
			const todayStart = new Date(now);
			todayStart.setHours(0, 0, 0, 0);
			// For now simple checks.
			if (args.startDate < todayStart.getTime()) {
				throw new Error("Start date must be today or later");
			}
		}

		const duration = args.endDate - args.startDate;
		const isHourAligned =
			args.startDate % ONE_HOUR_MS === 0 && args.endDate % ONE_HOUR_MS === 0;
		const isIntraday = duration < ONE_DAY_MS && isHourAligned;

		if (duration < ONE_DAY_MS && !isHourAligned) {
			throw new Error("Time must be aligned to the hour");
		}

		if (isIntraday) {
			if (args.startDate < now) {
				throw new Error("Start time must be in the future");
			}
			assertHourAligned(args.startDate);
			assertHourAligned(args.endDate);
		}

		// Check for specific overlaps with APPROVED claims
		const approvedClaims = await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.id))
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		const activeApprovedClaims = approvedClaims.filter(
			(c) => !c.expiredAt && !c.returnedAt && !c.transferredAt,
		);

		const hasOverlap = activeApprovedClaims.some((claim) =>
			hasDateOverlap(
				{ startDate: args.startDate, endDate: args.endDate },
				{ startDate: claim.startDate, endDate: claim.endDate },
			),
		);

		if (hasOverlap) {
			throw new Error("Item is not available for these dates");
		}

		// Check for self-overlap (User cannot have overlapping requests for the same item)
		// Only consider active requests (pending/approved). Ignore rejected/cancelled.
		const myActiveRequests = await ctx.db
			.query("claims")
			.withIndex("by_claimer", (q) => q.eq("claimerId", identity.subject))
			.filter((q) => q.eq(q.field("itemId"), args.id))
			.filter((q) =>
				q.or(
					q.eq(q.field("status"), "pending"),
					q.eq(q.field("status"), "approved"),
				),
			)
			.collect();

		const myBlockingRequests = myActiveRequests.filter(
			(r) =>
				r.status === "pending" ||
				(r.status === "approved" &&
					!r.expiredAt &&
					!r.returnedAt &&
					!r.transferredAt),
		);

		const hasSelfOverlap = myBlockingRequests.some((req) =>
			hasDateOverlap(
				{ startDate: args.startDate, endDate: args.endDate },
				{ startDate: req.startDate, endDate: req.endDate },
			),
		);

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

		await ctx.db.insert("lease_activity", {
			itemId: args.id,
			claimId,
			type: "lease_requested",
			actorId: identity.subject,
			createdAt: now,
		});

		// Notify owner
		await ctx.db.insert("notifications", {
			recipientId: item.ownerId,
			type: "new_request",
			itemId: args.id,
			requestId: claimId,
			isRead: false,
			createdAt: now,
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

		const now = Date.now();
		await ctx.db.patch(args.claimId, { status: "approved" });

		await ctx.db.insert("item_activity", {
			itemId: args.id,
			type: "loan_started",
			actorId: identity.subject,
			createdAt: now,
			claimId: args.claimId,
			borrowerId: claim.claimerId,
			startDate: claim.startDate,
			endDate: claim.endDate,
		});

		await ctx.db.insert("lease_activity", {
			itemId: args.id,
			claimId: args.claimId,
			type: "lease_approved",
			actorId: identity.subject,
			createdAt: now,
		});

		const isHourAligned =
			claim.startDate % ONE_HOUR_MS === 0 && claim.endDate % ONE_HOUR_MS === 0;
		const isIntraday =
			claim.endDate - claim.startDate < ONE_DAY_MS && isHourAligned;

		if (isIntraday) {
			const pickupProposalId = `auto-pickup-${args.claimId}`;
			const pickupWindowStartAt = claim.startDate;
			const pickupWindowEndAt = claim.startDate + ONE_HOUR_MS;

			await ctx.db.insert("lease_activity", {
				itemId: args.id,
				claimId: args.claimId,
				type: "lease_pickup_proposed",
				actorId: claim.claimerId,
				createdAt: now,
				proposalId: pickupProposalId,
				windowStartAt: pickupWindowStartAt,
				windowEndAt: pickupWindowEndAt,
			});

			await ctx.db.insert("lease_activity", {
				itemId: args.id,
				claimId: args.claimId,
				type: "lease_pickup_approved",
				actorId: identity.subject,
				createdAt: now,
				proposalId: pickupProposalId,
				windowStartAt: pickupWindowStartAt,
				windowEndAt: pickupWindowEndAt,
			});

			if (!item.giveaway) {
				const returnProposalId = `auto-return-${args.claimId}`;
				const returnWindowStartAt = claim.endDate;
				const returnWindowEndAt = claim.endDate + ONE_HOUR_MS;

				await ctx.db.insert("lease_activity", {
					itemId: args.id,
					claimId: args.claimId,
					type: "lease_return_proposed",
					actorId: claim.claimerId,
					createdAt: now,
					proposalId: returnProposalId,
					windowStartAt: returnWindowStartAt,
					windowEndAt: returnWindowEndAt,
				});

				await ctx.db.insert("lease_activity", {
					itemId: args.id,
					claimId: args.claimId,
					type: "lease_return_approved",
					actorId: identity.subject,
					createdAt: now,
					proposalId: returnProposalId,
					windowStartAt: returnWindowStartAt,
					windowEndAt: returnWindowEndAt,
				});
			}
		}

		// Notify claimer
		await ctx.db.insert("notifications", {
			recipientId: claim.claimerId,
			type: "request_approved",
			itemId: args.id,
			requestId: args.claimId,
			isRead: false,
			createdAt: now,
		});

		// We no longer set isAvailable to false globally, as it depends on dates.

		// Optionally reject others or leave them pending?
		// Usually once approved, others are implicitly rejected or on hold.
		// Let's leave them pending but they effectively can't get it unless this one is cancelled.
	},
});

export const getLeaseActivity = query({
	args: { claimId: v.optional(v.id("claims")) },
	handler: async (ctx, args) => {
		const claimId = args.claimId;
		if (!claimId) return [];

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const claim = await ctx.db.get(claimId);
		if (!claim) throw new Error("Claim not found");

		const item = await ctx.db.get(claim.itemId);
		if (!item) throw new Error("Item not found");

		const userId = identity.subject;
		if (userId !== item.ownerId && userId !== claim.claimerId) {
			throw new Error("Unauthorized");
		}

		const events = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", claimId))
			.order("desc")
			.take(50);

		const eventsWithPhotos = await Promise.all(
			events.map(async (event) => {
				const ids = event.photoStorageIds ?? [];
				const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
				const photoUrls = urls.filter(
					(u): u is string => typeof u === "string",
				);
				return { ...event, photoUrls };
			}),
		);

		return eventsWithPhotos;
	},
});

export const proposePickupWindow = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
		windowStartAt: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const now = Date.now();
		if (args.windowStartAt < now) {
			throw new Error("Pickup time must be in the future");
		}

		assertHourAligned(args.windowStartAt);

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can propose pickup");
		}
		if (claim.pickedUpAt)
			throw new Error("Pickup already recorded for this lease");
		if (claim.expiredAt)
			throw new Error("Cannot propose pickup for an expired lease");
		if (claim.returnedAt) throw new Error("Cannot propose pickup after return");
		if (claim.missingAt)
			throw new Error("Cannot propose pickup for a missing item");

		assertOnDay(args.windowStartAt, claim.startDate, "start");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");

		const userId = identity.subject;
		if (userId !== item.ownerId && userId !== claim.claimerId) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		if (existing.some((e) => e.type === "lease_picked_up")) {
			throw new Error("Pickup already recorded for this lease");
		}
		if (existing.some((e) => e.type === "lease_expired")) {
			throw new Error("Cannot propose pickup for an expired lease");
		}
		if (existing.some((e) => e.type === "lease_rejected")) {
			throw new Error("Cannot propose pickup for a rejected lease");
		}

		const windowEndAt = args.windowStartAt + ONE_HOUR_MS;
		const proposalId = `${args.claimId}-${now}-${Math.random().toString(16).slice(2)}`;

		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_pickup_proposed",
			actorId: userId,
			createdAt: now,
			proposalId,
			windowStartAt: args.windowStartAt,
			windowEndAt,
		});

		await ctx.db.insert("notifications", {
			recipientId: otherPartyId({
				itemOwnerId: item.ownerId,
				claimerId: claim.claimerId,
				actorId: userId,
			}),
			type: "pickup_proposed",
			itemId: args.itemId,
			requestId: args.claimId,
			windowStartAt: args.windowStartAt,
			windowEndAt,
			isRead: false,
			createdAt: now,
		});
	},
});

export const proposeReturnWindow = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
		windowStartAt: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const now = Date.now();
		if (args.windowStartAt < now) {
			throw new Error("Return time must be in the future");
		}

		assertHourAligned(args.windowStartAt);

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can propose return");
		}
		if (claim.returnedAt)
			throw new Error("Return already recorded for this lease");
		if (claim.expiredAt)
			throw new Error("Cannot propose return for an expired lease");
		if (claim.missingAt)
			throw new Error("Cannot propose return for a missing item");

		assertOnDay(args.windowStartAt, claim.endDate, "end");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.giveaway) {
			throw new Error("Return is not required for giveaway items");
		}

		const userId = identity.subject;
		if (userId !== item.ownerId && userId !== claim.claimerId) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		const hasPickup =
			claim.pickedUpAt !== undefined ||
			existing.some((e) => e.type === "lease_picked_up");
		if (!hasPickup) {
			throw new Error("Cannot propose return before pickup is recorded");
		}
		if (existing.some((e) => e.type === "lease_returned")) {
			throw new Error("Return already recorded for this lease");
		}
		if (existing.some((e) => e.type === "lease_missing")) {
			throw new Error("Cannot propose return for a missing item");
		}
		if (existing.some((e) => e.type === "lease_rejected")) {
			throw new Error("Cannot propose return for a rejected lease");
		}

		const windowEndAt = args.windowStartAt + ONE_HOUR_MS;
		const proposalId = `${args.claimId}-${now}-${Math.random().toString(16).slice(2)}`;

		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_return_proposed",
			actorId: userId,
			createdAt: now,
			proposalId,
			windowStartAt: args.windowStartAt,
			windowEndAt,
		});

		await ctx.db.insert("notifications", {
			recipientId: otherPartyId({
				itemOwnerId: item.ownerId,
				claimerId: claim.claimerId,
				actorId: userId,
			}),
			type: "return_proposed",
			itemId: args.itemId,
			requestId: args.claimId,
			windowStartAt: args.windowStartAt,
			windowEndAt,
			isRead: false,
			createdAt: now,
		});
	},
});

export const approvePickupWindow = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const now = Date.now();
		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can approve pickup time");
		}
		if (claim.pickedUpAt)
			throw new Error("Pickup already recorded for this lease");
		if (claim.expiredAt)
			throw new Error("Cannot approve pickup for an expired lease");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");

		const userId = identity.subject;
		if (userId !== item.ownerId && userId !== claim.claimerId) {
			throw new Error("Unauthorized");
		}

		const events = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		const latestProposal = events.find(
			(e) => e.type === "lease_pickup_proposed",
		);
		if (
			!latestProposal ||
			typeof latestProposal.windowStartAt !== "number" ||
			typeof latestProposal.windowEndAt !== "number"
		) {
			throw new Error("Pickup time must be proposed before it can be approved");
		}
		if (now > latestProposal.windowEndAt) {
			throw new Error("Pickup proposal has expired");
		}
		if (latestProposal.actorId === userId) {
			throw new Error("Only the counterparty can approve pickup time");
		}

		const latestApproval = events.find(
			(e) => e.type === "lease_pickup_approved",
		);
		if (
			latestApproval?.proposalId &&
			latestApproval.proposalId === latestProposal.proposalId
		) {
			throw new Error("Pickup time already approved");
		}

		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_pickup_approved",
			actorId: userId,
			createdAt: now,
			proposalId: latestProposal.proposalId,
			windowStartAt: latestProposal.windowStartAt,
			windowEndAt: latestProposal.windowEndAt,
		});

		await ctx.db.insert("notifications", {
			recipientId: latestProposal.actorId,
			type: "pickup_approved",
			itemId: args.itemId,
			requestId: args.claimId,
			windowStartAt: latestProposal.windowStartAt,
			windowEndAt: latestProposal.windowEndAt,
			isRead: false,
			createdAt: now,
		});
	},
});

export const approveReturnWindow = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const now = Date.now();
		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can approve return time");
		}
		if (claim.returnedAt)
			throw new Error("Return already recorded for this lease");
		if (claim.expiredAt)
			throw new Error("Cannot approve return for an expired lease");
		if (claim.missingAt)
			throw new Error("Cannot approve return for a missing item");

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.giveaway) {
			throw new Error("Return is not required for giveaway items");
		}

		const userId = identity.subject;
		if (userId !== item.ownerId && userId !== claim.claimerId) {
			throw new Error("Unauthorized");
		}

		const events = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		const hasPickup =
			claim.pickedUpAt !== undefined ||
			events.some((e) => e.type === "lease_picked_up");
		if (!hasPickup) {
			throw new Error("Cannot approve return before pickup is recorded");
		}

		const latestProposal = events.find(
			(e) => e.type === "lease_return_proposed",
		);
		if (
			!latestProposal ||
			typeof latestProposal.windowStartAt !== "number" ||
			typeof latestProposal.windowEndAt !== "number"
		) {
			throw new Error("Return time must be proposed before it can be approved");
		}
		if (now > latestProposal.windowEndAt) {
			throw new Error("Return proposal has expired");
		}
		if (latestProposal.actorId === userId) {
			throw new Error("Only the counterparty can approve return time");
		}

		const latestApproval = events.find(
			(e) => e.type === "lease_return_approved",
		);
		if (
			latestApproval?.proposalId &&
			latestApproval.proposalId === latestProposal.proposalId
		) {
			throw new Error("Return time already approved");
		}

		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_return_approved",
			actorId: userId,
			createdAt: now,
			proposalId: latestProposal.proposalId,
			windowStartAt: latestProposal.windowStartAt,
			windowEndAt: latestProposal.windowEndAt,
		});

		await ctx.db.insert("notifications", {
			recipientId: latestProposal.actorId,
			type: "return_approved",
			itemId: args.itemId,
			requestId: args.claimId,
			windowStartAt: latestProposal.windowStartAt,
			windowEndAt: latestProposal.windowEndAt,
			isRead: false,
			createdAt: now,
		});
	},
});

export const markPickedUp = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
		note: v.optional(v.string()),
		photoStorageIds: v.optional(v.array(v.id("_storage"))),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const createdAt = Date.now();
		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can be marked as picked up");
		}
		if (claim.pickedUpAt) {
			throw new Error("Pickup already recorded for this lease");
		}
		if (claim.expiredAt) {
			throw new Error("Cannot confirm pickup for an expired lease");
		}

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");

		const itemOwnerIdAtPickup = item.ownerId;

		const userId = identity.subject;
		if (userId !== item.ownerId && userId !== claim.claimerId) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		if (existing.some((e) => e.type === "lease_picked_up")) {
			throw new Error("Pickup already recorded for this lease");
		}
		if (existing.some((e) => e.type === "lease_expired")) {
			throw new Error("Cannot confirm pickup for an expired lease");
		}
		if (existing.some((e) => e.type === "lease_rejected")) {
			throw new Error("Cannot confirm pickup for a rejected lease");
		}

		const latestProposal = existing.find(
			(e) => e.type === "lease_pickup_proposed",
		);
		if (
			!latestProposal ||
			typeof latestProposal.windowStartAt !== "number" ||
			typeof latestProposal.windowEndAt !== "number"
		) {
			throw new Error(
				"Pickup time must be proposed before it can be confirmed",
			);
		}
		if (createdAt > latestProposal.windowEndAt) {
			throw new Error("Pickup proposal has expired");
		}
		if (createdAt < latestProposal.windowStartAt) {
			throw new Error(
				"Pickup can only be confirmed during the proposed window",
			);
		}

		const latestApproval = existing.find(
			(e) => e.type === "lease_pickup_approved",
		);
		if (
			!latestApproval ||
			latestApproval.proposalId !== latestProposal.proposalId
		) {
			throw new Error(
				"Pickup time must be approved before it can be confirmed",
			);
		}

		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_picked_up",
			actorId: userId,
			createdAt,
			note: args.note,
			photoStorageIds: args.photoStorageIds,
			proposalId: latestProposal.proposalId,
			windowStartAt: latestProposal.windowStartAt,
			windowEndAt: latestProposal.windowEndAt,
		});

		await ctx.db.patch(args.claimId, { pickedUpAt: createdAt });

		if (item.giveaway) {
			await ctx.db.insert("lease_activity", {
				itemId: args.itemId,
				claimId: args.claimId,
				type: "lease_transferred",
				actorId: userId,
				createdAt,
				note: args.note,
				photoStorageIds: args.photoStorageIds,
				proposalId: latestProposal.proposalId,
				windowStartAt: latestProposal.windowStartAt,
				windowEndAt: latestProposal.windowEndAt,
			});

			await ctx.db.patch(args.claimId, { transferredAt: createdAt });
			await ctx.db.patch(args.itemId, { ownerId: claim.claimerId });
		}

		await ctx.db.insert("notifications", {
			recipientId: otherPartyId({
				itemOwnerId: itemOwnerIdAtPickup,
				claimerId: claim.claimerId,
				actorId: userId,
			}),
			type: "pickup_confirmed",
			itemId: args.itemId,
			requestId: args.claimId,
			isRead: false,
			createdAt,
		});
	},
});

export const markReturned = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
		note: v.optional(v.string()),
		photoStorageIds: v.optional(v.array(v.id("_storage"))),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const createdAt = Date.now();
		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can be marked as returned");
		}
		if (claim.returnedAt) {
			throw new Error("Return already recorded for this lease");
		}
		if (claim.expiredAt) {
			throw new Error("Cannot confirm return for an expired lease");
		}
		if (claim.missingAt) {
			throw new Error("Cannot confirm return for a missing item");
		}

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.giveaway) {
			throw new Error("Return is not required for giveaway items");
		}

		const userId = identity.subject;
		if (userId !== item.ownerId && userId !== claim.claimerId) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		if (existing.some((e) => e.type === "lease_returned")) {
			throw new Error("Return already recorded for this lease");
		}

		const hasPickup =
			claim.pickedUpAt !== undefined ||
			existing.some((e) => e.type === "lease_picked_up");
		if (!hasPickup) {
			throw new Error("Cannot mark returned before pickup is recorded");
		}
		if (existing.some((e) => e.type === "lease_missing")) {
			throw new Error("Cannot confirm return for a missing item");
		}
		if (existing.some((e) => e.type === "lease_rejected")) {
			throw new Error("Cannot confirm return for a rejected lease");
		}

		const latestProposal = existing.find(
			(e) => e.type === "lease_return_proposed",
		);
		if (
			!latestProposal ||
			typeof latestProposal.windowStartAt !== "number" ||
			typeof latestProposal.windowEndAt !== "number"
		) {
			throw new Error(
				"Return time must be proposed before it can be confirmed",
			);
		}
		if (createdAt > latestProposal.windowEndAt) {
			throw new Error("Return proposal has expired");
		}
		if (createdAt < latestProposal.windowStartAt) {
			throw new Error(
				"Return can only be confirmed during the proposed window",
			);
		}

		const latestApproval = existing.find(
			(e) => e.type === "lease_return_approved",
		);
		if (
			!latestApproval ||
			latestApproval.proposalId !== latestProposal.proposalId
		) {
			throw new Error(
				"Return time must be approved before it can be confirmed",
			);
		}

		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_returned",
			actorId: userId,
			createdAt,
			note: args.note,
			photoStorageIds: args.photoStorageIds,
			proposalId: latestProposal.proposalId,
			windowStartAt: latestProposal.windowStartAt,
			windowEndAt: latestProposal.windowEndAt,
		});

		await ctx.db.patch(args.claimId, { returnedAt: createdAt });

		await ctx.db.insert("notifications", {
			recipientId: otherPartyId({
				itemOwnerId: item.ownerId,
				claimerId: claim.claimerId,
				actorId: userId,
			}),
			type: "return_confirmed",
			itemId: args.itemId,
			requestId: args.claimId,
			isRead: false,
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

		const now = Date.now();
		await ctx.db.patch(args.claimId, { status: "rejected" });

		await ctx.db.insert("lease_activity", {
			itemId: args.id,
			claimId: args.claimId,
			type: "lease_rejected",
			actorId: identity.subject,
			createdAt: now,
		});

		// Notify claimer
		await ctx.db.insert("notifications", {
			recipientId: claim.claimerId,
			type: "request_rejected",
			itemId: args.id,
			requestId: args.claimId,
			isRead: false,
			createdAt: now,
		});
	},
});

export const markExpired = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
		note: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can be marked as expired");
		}
		if (claim.expiredAt) {
			throw new Error("Expired already recorded for this lease");
		}

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const existing = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		if (existing.some((e) => e.type === "lease_picked_up")) {
			throw new Error("Cannot mark expired after pickup is recorded");
		}
		if (existing.some((e) => e.type === "lease_expired")) {
			throw new Error("Expired already recorded for this lease");
		}

		const now = Date.now();
		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_expired",
			actorId: identity.subject,
			createdAt: now,
			note: args.note,
		});

		await ctx.db.patch(args.claimId, { expiredAt: now });

		const recipientIds = [item.ownerId, claim.claimerId];
		for (const recipientId of recipientIds) {
			await ctx.db.insert("notifications", {
				recipientId,
				type: "pickup_expired",
				itemId: args.itemId,
				requestId: args.claimId,
				isRead: false,
				createdAt: now,
			});
		}
	},
});

export const markMissing = mutation({
	args: {
		itemId: v.id("items"),
		claimId: v.id("claims"),
		note: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const claim = await ctx.db.get(args.claimId);
		if (!claim) throw new Error("Claim not found");
		if (claim.itemId !== args.itemId) throw new Error("Mismatch item/claim");
		if (claim.status !== "approved") {
			throw new Error("Only approved claims can be marked as missing");
		}
		if (claim.missingAt) {
			throw new Error("Missing already recorded for this lease");
		}

		const item = await ctx.db.get(args.itemId);
		if (!item) throw new Error("Item not found");
		if (item.giveaway) {
			throw new Error("Missing returns are not tracked for giveaway items");
		}
		if (item.ownerId !== identity.subject) throw new Error("Unauthorized");

		const existing = await ctx.db
			.query("lease_activity")
			.withIndex("by_claim_createdAt", (q) => q.eq("claimId", args.claimId))
			.order("desc")
			.take(50);

		if (!existing.some((e) => e.type === "lease_picked_up")) {
			throw new Error("Cannot mark missing before pickup is recorded");
		}
		if (existing.some((e) => e.type === "lease_returned")) {
			throw new Error("Cannot mark missing after return is recorded");
		}
		if (existing.some((e) => e.type === "lease_missing")) {
			throw new Error("Missing already recorded for this lease");
		}

		const now = Date.now();
		await ctx.db.insert("lease_activity", {
			itemId: args.itemId,
			claimId: args.claimId,
			type: "lease_missing",
			actorId: identity.subject,
			createdAt: now,
			note: args.note,
		});

		await ctx.db.patch(args.claimId, { missingAt: now });

		const recipientIds = [item.ownerId, claim.claimerId];
		for (const recipientId of recipientIds) {
			await ctx.db.insert("notifications", {
				recipientId,
				type: "return_missing",
				itemId: args.itemId,
				requestId: args.claimId,
				isRead: false,
				createdAt: now,
			});
		}
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

		// Keep behavior: we still delete cancelled claims for now.
		// Once we add a dedicated lease page, we can switch to a soft-cancel.
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
		const item = await ctx.db.get(args.id);
		if (!item) throw new Error("Item not found");

		const claims = await ctx.db
			.query("claims")
			.withIndex("by_item", (q) => q.eq("itemId", args.id))
			.filter((q) => q.eq(q.field("status"), "approved"))
			.collect();

		const activeClaims = claims.filter(
			(c) => !c.expiredAt && !c.returnedAt && !c.transferredAt,
		);

		const ownerBlocks = await ctx.db
			.query("owner_unavailability")
			.withIndex("by_owner", (q) => q.eq("ownerId", item.ownerId))
			.collect();

		return [
			...activeClaims.map((c) => ({
				startDate: c.startDate,
				endDate: c.endDate,
			})),
			...ownerBlocks.map((b) => ({
				startDate: b.startDate,
				endDate: b.endDate,
			})),
		];
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

export const resolveOverdueProposals = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();

		const overduePickup = await ctx.db
			.query("lease_activity")
			.withIndex("by_type_windowEndAt", (q) =>
				q.eq("type", "lease_pickup_proposed").lt("windowEndAt", now),
			)
			.order("asc")
			.take(100);

		const overdueReturn = await ctx.db
			.query("lease_activity")
			.withIndex("by_type_windowEndAt", (q) =>
				q.eq("type", "lease_return_proposed").lt("windowEndAt", now),
			)
			.order("asc")
			.take(100);

		for (const proposal of [...overduePickup, ...overdueReturn]) {
			const claim = await ctx.db.get(proposal.claimId);
			if (!claim) continue;
			if (claim.status !== "approved") continue;

			const events = await ctx.db
				.query("lease_activity")
				.withIndex("by_claim_createdAt", (q) =>
					q.eq("claimId", proposal.claimId),
				)
				.order("desc")
				.take(50);

			const latestSameType = events.find((e) => e.type === proposal.type);
			if (!latestSameType || latestSameType._id !== proposal._id) continue;

			if (proposal.type === "lease_pickup_proposed") {
				if (claim.pickedUpAt || claim.expiredAt) continue;
				if (events.some((e) => e.type === "lease_picked_up")) continue;
				if (events.some((e) => e.type === "lease_expired")) continue;

				await ctx.db.insert("lease_activity", {
					itemId: claim.itemId,
					claimId: claim._id,
					type: "lease_expired",
					actorId: "system",
					createdAt: now,
					note: "Auto-expired after unconfirmed pickup window",
				});

				await ctx.db.patch(claim._id, { expiredAt: now });

				const item = await ctx.db.get(claim.itemId);
				if (!item) continue;
				const recipientIds = [item.ownerId, claim.claimerId];
				for (const recipientId of recipientIds) {
					await ctx.db.insert("notifications", {
						recipientId,
						type: "pickup_expired",
						itemId: claim.itemId,
						requestId: claim._id,
						isRead: false,
						createdAt: now,
					});
				}
			} else if (proposal.type === "lease_return_proposed") {
				if (claim.returnedAt || claim.missingAt) continue;
				if (events.some((e) => e.type === "lease_returned")) continue;
				if (events.some((e) => e.type === "lease_missing")) continue;

				const hasPickup =
					claim.pickedUpAt !== undefined ||
					events.some((e) => e.type === "lease_picked_up");
				if (!hasPickup) continue;

				await ctx.db.insert("lease_activity", {
					itemId: claim.itemId,
					claimId: claim._id,
					type: "lease_missing",
					actorId: "system",
					createdAt: now,
					note: "Auto-marked missing after unconfirmed return window",
				});

				await ctx.db.patch(claim._id, { missingAt: now });

				const item = await ctx.db.get(claim.itemId);
				if (!item) continue;
				const recipientIds = [item.ownerId, claim.claimerId];
				for (const recipientId of recipientIds) {
					await ctx.db.insert("notifications", {
						recipientId,
						type: "return_missing",
						itemId: claim.itemId,
						requestId: claim._id,
						isRead: false,
						createdAt: now,
					});
				}
			}
		}
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

// Migration: Add ward to items that have location but no ward
export const migrateAddWard = action({
	args: {},
	handler: async (ctx) => {
		// Get all items
		const items = await ctx.runQuery(api.items.get);

		let updated = 0;
		let skipped = 0;
		let failed = 0;

		for (const item of items) {
			// Skip if no location or already has ward
			if (!item.location || item.location.ward) {
				skipped++;
				continue;
			}

			try {
				// Reverse geocode using Nominatim
				const response = await fetch(
					`https://nominatim.openstreetmap.org/reverse?format=json&lat=${item.location.lat}&lon=${item.location.lng}&addressdetails=1`,
					{
						headers: {
							"User-Agent": "Sharity App Migration",
						},
					},
				);

				if (!response.ok) {
					throw new Error(`Geocoding failed: ${response.status}`);
				}

				const data = await response.json();
				const address = data.address || {};

				// Extract ward (same logic as location-picker-dialog.tsx)
				const ward =
					address.suburb ||
					address.quarter ||
					address.neighbourhood ||
					address.city_district ||
					address.town ||
					address.city ||
					address.county ||
					"Unknown area";

				// Update item with ward
				await ctx.runMutation(internal.items.updateLocationWard, {
					id: item._id,
					ward,
				});

				console.log(`✅ ${item.name} → ${ward}`);
				updated++;

				// Rate limit: Nominatim allows 1 request/second
				await new Promise((resolve) => setTimeout(resolve, 1100));
			} catch (error) {
				console.error(`❌ ${item.name}:`, error);
				failed++;
			}
		}

		return { updated, skipped, failed };
	},
});

export const updateLocationWard = internalMutation({
	args: {
		id: v.id("items"),
		ward: v.string(),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item || !item.location) return;

		await ctx.db.patch(args.id, {
			location: {
				...item.location,
				ward: args.ward,
			},
		});
	},
});
