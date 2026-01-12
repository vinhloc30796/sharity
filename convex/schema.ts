import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  items: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(), // For MVP, we'll just store a string ID
    isAvailable: v.boolean(),
  }),
});
