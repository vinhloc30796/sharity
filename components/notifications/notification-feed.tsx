"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Check } from "lucide-react";

export function NotificationFeed() {
	const notifications = useQuery(api.notifications.get);
	const markAsRead = useMutation(api.notifications.markAsRead);
	const markAllAsRead = useMutation(api.notifications.markAllAsRead);

	if (notifications === undefined) {
		return <div className="p-4 text-center">Loading notifications...</div>;
	}

	if (notifications.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">No new notifications</div>
		);
	}

	const handleMarkRead = async (id: Id<"notifications">) => {
		await markAsRead({ notificationId: id });
	};

	const renderedNotifications = notifications.map((n) => {
		let message = "";
		switch (n.type) {
			case "new_request":
				message = `New request for "${n.item?.name}"`;
				break;
			case "request_approved":
				message = `Request approved for "${n.item?.name}"`;
				break;
			case "request_rejected":
				message = `Request rejected for "${n.item?.name}"`;
				break;
			case "item_available":
				message = `"${n.item?.name}" is now available!`;
				break;
			default:
				message = "New notification";
		}

		return (
			<Card
				key={n._id}
				className={`p-3 mb-2 flex justify-between items-start gap-2 ${
					n.isRead ? "bg-gray-50" : "bg-white border-blue-200 shadow-sm"
				}`}
				onClick={() => !n.isRead && handleMarkRead(n._id)}
			>
				<div className="flex-1 cursor-pointer">
					<p
						className={`text-sm ${n.isRead ? "text-gray-600" : "font-medium text-gray-900"}`}
					>
						{message}
					</p>
					<p className="text-xs text-gray-400 mt-1">
						{formatDistanceToNow(n.createdAt, { addSuffix: true })}
					</p>
				</div>
				{!n.isRead && (
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 shrink-0"
						onClick={(e) => {
							e.stopPropagation();
							handleMarkRead(n._id);
						}}
					>
						<span className="sr-only">Mark as read</span>
						<div className="h-2 w-2 rounded-full bg-blue-500" />
					</Button>
				)}
			</Card>
		);
	});

	return (
		<div className="flex flex-col max-h-[400px]">
			<div className="p-2 border-b flex justify-between items-center sticky top-0 bg-white z-10">
				<span className="font-semibold text-sm">Notifications</span>
				<Button
					variant="ghost"
					size="sm"
					className="text-xs h-7"
					onClick={() => markAllAsRead({})}
				>
					Mark all read <Check className="ml-1 h-3 w-3" />
				</Button>
			</div>
			<div className="overflow-y-auto p-2 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
				{renderedNotifications}
			</div>
		</div>
	);
}
