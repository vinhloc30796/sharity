import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	items: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		ownerId: v.string(), // For MVP, we'll just store a string ID
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
		isAvailable: v.boolean(),
	}),
	claims: defineTable({
		itemId: v.id("items"),
		claimerId: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("rejected"),
		),
	})
		.index("by_item", ["itemId"])
		.index("by_claimer", ["claimerId"]),
});
