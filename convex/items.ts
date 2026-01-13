import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const items = await ctx.db.query("items").order("desc").collect();
    
    if (!identity) {
      return items.map(item => ({ ...item, isRequested: false }));
    }

    const myClaims = await ctx.db
        .query("claims")
        .withIndex("by_claimer", q => q.eq("claimerId", identity.subject))
        .collect();
        
    const myClaimedItemIds = new Set(myClaims.map(c => c.itemId));
    
    return items
      .filter((item) => item.ownerId !== identity.subject)
      .map(item => ({
        ...item,
        isRequested: myClaimedItemIds.has(item._id),
    }));
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
      
    const borrowedItemIds = myClaims.map(c => c.itemId);
    
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
        ...ownedItems.map(item => ({ ...item, isOwner: true })),
        ...borrowedItems.map(item => ({ ...item, isOwner: false }))
    ];
    
    return result;
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

export const requestItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (!item.isAvailable) throw new Error("Item is not available");
    if (item.ownerId === identity.subject) throw new Error("Cannot claim your own item");

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

    await ctx.db.insert("claims", {
      itemId: args.itemId,
      claimerId: identity.subject,
      status: "pending",
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
  }
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
    await ctx.db.patch(args.itemId, { isAvailable: false });
    
    // Optionally reject others or leave them pending? 
    // Usually once approved, others are implicitly rejected or on hold. 
    // Let's leave them pending but they effectively can't get it unless this one is cancelled.
  }
});

export const rejectClaim = mutation({
  args: { claimId: v.id("claims"), itemId: v.id("items") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.ownerId !== identity.subject) throw new Error("Unauthorized");
    
    await ctx.db.patch(args.claimId, { status: "rejected" });
  }
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
  }
});
