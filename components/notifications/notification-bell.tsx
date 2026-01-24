"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NotificationFeed } from "./notification-feed";
import { useState, useEffect } from "react";

export function NotificationBell() {
	const notifications = useQuery(api.notifications.get);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{mounted && unreadCount > 0 && (
						<span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
					)}
					<span className="sr-only">Notifications</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<NotificationFeed />
			</PopoverContent>
		</Popover>
	);
}
