import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	items: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		ownerId: v.string(), // For MVP, we'll just store a string ID
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
		category: v.optional(
			v.union(
				v.literal("kitchen"),
				v.literal("furniture"),
				v.literal("electronics"),
				v.literal("clothing"),
				v.literal("books"),
				v.literal("sports"),
				v.literal("other"),
			),
		),
		location: v.optional(
			v.object({
				lat: v.number(),
				lng: v.number(),
				address: v.optional(v.string()),
			}),
		),
	}),
	item_activity: defineTable({
		itemId: v.id("items"),
		type: v.union(
			v.literal("item_created"),
			v.literal("loan_started"),
			v.literal("item_picked_up"),
			v.literal("item_returned"),
		),
		actorId: v.string(),
		createdAt: v.number(),
		claimId: v.optional(v.id("claims")),
		note: v.optional(v.string()),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
		borrowerId: v.optional(v.string()),
	})
		.index("by_item", ["itemId"])
		.index("by_item_createdAt", ["itemId", "createdAt"]),
	lease_activity: defineTable({
		itemId: v.id("items"),
		claimId: v.id("claims"),
		type: v.union(
			v.literal("lease_requested"),
			v.literal("lease_approved"),
			v.literal("lease_rejected"),
			v.literal("lease_expired"),
			v.literal("lease_missing"),
			v.literal("lease_pickup_proposed"),
			v.literal("lease_pickup_approved"),
			v.literal("lease_return_proposed"),
			v.literal("lease_return_approved"),
			v.literal("lease_picked_up"),
			v.literal("lease_returned"),
		),
		actorId: v.string(),
		createdAt: v.number(),
		note: v.optional(v.string()),
		photoStorageIds: v.optional(v.array(v.id("_storage"))),
		proposalId: v.optional(v.string()),
		windowStartAt: v.optional(v.number()),
		windowEndAt: v.optional(v.number()),
	})
		.index("by_claim_createdAt", ["claimId", "createdAt"])
		.index("by_item_createdAt", ["itemId", "createdAt"])
		.index("by_type_windowEndAt", ["type", "windowEndAt"]),
	claims: defineTable({
		itemId: v.id("items"),
		claimerId: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("rejected"),
		),
		startDate: v.number(),
		endDate: v.number(),
		// Temporarily optional so existing rows can be migrated safely.
		requestedAt: v.optional(v.number()),
		approvedAt: v.optional(v.number()),
		rejectedAt: v.optional(v.number()),
		pickedUpAt: v.optional(v.number()),
		returnedAt: v.optional(v.number()),
		expiredAt: v.optional(v.number()),
		missingAt: v.optional(v.number()),
	})
		.index("by_item", ["itemId"])
		.index("by_claimer", ["claimerId"]),
	notifications: defineTable({
		recipientId: v.string(),
		type: v.union(
			v.literal("new_request"),
			v.literal("request_approved"),
			v.literal("request_rejected"),
			v.literal("item_available"),
		),
		itemId: v.id("items"),
		requestId: v.optional(v.id("claims")),
		isRead: v.boolean(),
		createdAt: v.number(),
	}).index("by_recipient", ["recipientId"]),
	availability_alerts: defineTable({
		itemId: v.id("items"),
		userId: v.string(),
		createdAt: v.number(),
	})
		.index("by_item", ["itemId"])
		.index("by_user_item", ["userId", "itemId"]),
});
