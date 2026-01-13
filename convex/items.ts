import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("items").order("desc").collect();
  },
});

export const getMyItems = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("ownerId"), identity.subject))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
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
      isAvailable: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("items"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isAvailable: v.optional(v.boolean()),
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
