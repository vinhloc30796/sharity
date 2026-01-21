import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];

		const notifications = await ctx.db
			.query("notifications")
			.withIndex("by_recipient", (q) => q.eq("recipientId", identity.subject))
			.order("desc")
			.collect();

		return Promise.all(
			notifications.map(async (n) => {
				const item = await ctx.db.get(n.itemId);
				return { ...n, item };
			}),
		);
	},
});

export const markAsRead = mutation({
	args: { notificationId: v.id("notifications") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const notification = await ctx.db.get(args.notificationId);
		if (!notification) throw new Error("Notification not found");

		if (notification.recipientId !== identity.subject) {
			throw new Error("Unauthorized");
		}

		await ctx.db.patch(args.notificationId, { isRead: true });
	},
});

export const markAllAsRead = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const notifications = await ctx.db
			.query("notifications")
			.withIndex("by_recipient", (q) => q.eq("recipientId", identity.subject))
			.filter((q) => q.eq(q.field("isRead"), false))
			.collect();

		await Promise.all(
			notifications.map((n) => ctx.db.patch(n._id, { isRead: true })),
		);
	},
});

export const subscribeAvailability = mutation({
	args: { itemId: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const existing = await ctx.db
			.query("availability_alerts")
			.withIndex("by_user_item", (q) =>
				q.eq("userId", identity.subject).eq("itemId", args.itemId),
			)
			.first();

		if (existing) {
			// Already subscribed, so unsubscribe (toggle)
			await ctx.db.delete(existing._id);
			return false; // Subscribed: false
		} else {
			await ctx.db.insert("availability_alerts", {
				itemId: args.itemId,
				userId: identity.subject,
				createdAt: Date.now(),
			});
			return true; // Subscribed: true
		}
	},
});

export const getAvailabilitySubscription = query({
	args: { itemId: v.id("items") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return false;

		const existing = await ctx.db
			.query("availability_alerts")
			.withIndex("by_user_item", (q) =>
				q.eq("userId", identity.subject).eq("itemId", args.itemId),
			)
			.first();

		return !!existing;
	},
});
