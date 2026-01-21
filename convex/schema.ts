import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	items: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		ownerId: v.string(), // For MVP, we'll just store a string ID
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
	}),
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
