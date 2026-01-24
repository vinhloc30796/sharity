import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		const userId = identity?.subject;

		const wishlistItems = await ctx.db
			.query("wishlist")
			.withIndex("by_createdAt")
			.order("desc")
			.collect();

		// Fetch all items to check for matches
		// Note: As the item database grows, this should be optimized to use a search index
		// or backend-guided search. For MVP < 1000 items, in-memory check is fine.
		const items = await ctx.db.query("items").collect();

		// Resolve images for all wishlist items
		const results = await Promise.all(
			wishlistItems.map(async (wishlistItem) => {
				const matchCount = items.filter((item) => {
					const itemText = (
						item.name +
						" " +
						(item.description || "")
					).toLowerCase();
					return itemText.includes(wishlistItem.text.toLowerCase());
				}).length;

				const isLiked = userId ? wishlistItem.votes.includes(userId) : false;

				// Resolve image URLs
				const images: { id: string; url: string }[] = [];
				if (wishlistItem.imageStorageIds) {
					for (const storageId of wishlistItem.imageStorageIds) {
						const url = await ctx.storage.getUrl(storageId);
						if (url) {
							images.push({ id: storageId, url });
						}
					}
				}

				return {
					...wishlistItem,
					matchCount,
					isLiked,
					images,
				};
			}),
		);

		return results;
	},
});

export const create = mutation({
	args: {
		text: v.string(),
		imageStorageIds: v.optional(v.array(v.id("_storage"))),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		await ctx.db.insert("wishlist", {
			text: args.text,
			userId: identity.subject,
			votes: [],
			createdAt: Date.now(),
			imageStorageIds: args.imageStorageIds,
		});
	},
});

export const toggleVote = mutation({
	args: { id: v.id("wishlist") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");
		const userId = identity.subject;

		const item = await ctx.db.get(args.id);
		if (!item) throw new Error("Item not found");

		const hasVoted = item.votes.includes(userId);
		const newVotes = hasVoted
			? item.votes.filter((id) => id !== userId)
			: [...item.votes, userId];

		await ctx.db.patch(args.id, { votes: newVotes });
	},
});
