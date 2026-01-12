import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("items").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For MVP, we'll generate a fake owner ID
    const ownerId = "user_demo_123";
    
    await ctx.db.insert("items", {
      name: args.name,
      description: args.description,
      ownerId,
      isAvailable: true,
    });
  },
});
