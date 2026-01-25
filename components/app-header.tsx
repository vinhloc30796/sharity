"use client";

import Link from "next/link";

import {
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/nextjs";
import { Settings } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { OwnerUnavailabilityButton } from "@/components/owner-unavailability-button";
import { Button } from "@/components/ui/button";

export function AppHeader() {
	return (
		<header className="flex justify-end p-4 gap-4">
			<SignedOut>
				<div className="flex gap-2 md:gap-4">
					<SignInButton mode="modal">
						<Button variant="ghost" size="sm">
							Sign In
						</Button>
					</SignInButton>
					<SignUpButton mode="modal">
						<Button size="sm">Sign Up</Button>
					</SignUpButton>
				</div>
			</SignedOut>

			<SignedIn>
				<div className="hidden md:flex items-center gap-4">
					<OwnerUnavailabilityButton variant="ghost" size="sm" />
					<Link href="/profile">
						<Button variant="ghost" size="sm">
							<Settings className="h-4 w-4 mr-1" />
							Profile
						</Button>
					</Link>
					<NotificationBell />
					<UserButton />
				</div>

				<div className="flex md:hidden items-center gap-2">
					<OwnerUnavailabilityButton variant="ghost" size="sm" />
					<Link href="/profile">
						<Button variant="ghost" size="sm">
							<Settings className="h-4 w-4 mr-1" />
							Profile
						</Button>
					</Link>
					<NotificationBell />
					<UserButton />
				</div>
			</SignedIn>
		</header>
	);
}
