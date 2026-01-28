"use client";

import Link from "next/link";

import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ItemCard } from "./item-card";
import type { Id } from "@/convex/_generated/dataModel";
import type { MediaImage } from "./item-form";

interface BorrowedItemData {
	_id: Id<"items">;
	_creationTime: number;
	name: string;
	ownerId: string;
	description?: string;
	images?: MediaImage[];
	imageUrls?: string[];
	claim: {
		_id: Id<"claims">;
		startDate: number;
		endDate: number;
		pickedUpAt?: number;
	};
	owner: {
		id: string;
		name: string | null;
		avatarUrl: string | null;
	};
}

function formatOwnerName(owner: BorrowedItemData["owner"]): string {
	if (owner.name) return owner.name;
	if (owner.id.length <= 16) return owner.id;
	return `${owner.id.slice(0, 8)}...${owner.id.slice(-6)}`;
}

function getDueStatus(endDate: number): {
	label: string;
	className: string;
	isOverdue: boolean;
} {
	const now = Date.now();
	const endDateObj = new Date(endDate);

	if (isPast(endDateObj)) {
		return {
			label: `Overdue by ${formatDistanceToNow(endDateObj)}`,
			className:
				"border-transparent bg-rose-100 text-rose-900 hover:bg-rose-100/80",
			isOverdue: true,
		};
	}

	if (isToday(endDateObj)) {
		return {
			label: "Due today",
			className:
				"border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100/80",
			isOverdue: false,
		};
	}

	const daysUntilDue = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
	if (daysUntilDue <= 3) {
		return {
			label: `Due in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}`,
			className:
				"border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100/80",
			isOverdue: false,
		};
	}

	return {
		label: `Due ${format(endDateObj, "MMM d")}`,
		className:
			"border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-100/80",
		isOverdue: false,
	};
}

export function BorrowedItemCard({ item }: { item: BorrowedItemData }) {
	const dueStatus = getDueStatus(item.claim.endDate);

	const rightHeader = (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${dueStatus.className}`}
		>
			{dueStatus.label}
		</span>
	);

	return (
		<ItemCard
			item={item}
			rightHeader={rightHeader}
			density="compact"
			hideDescription
			hideMetaRow
			footer={
				<div className="flex justify-end gap-2 w-full">
					<Link href={`/item/${item._id}`}>
						<Button variant="secondary" size="sm">
							View Details
						</Button>
					</Link>
				</div>
			}
		>
			<div className="space-y-2">
				{/* Owner info */}
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<User className="h-3 w-3" />
					<span>Borrowed from {formatOwnerName(item.owner)}</span>
				</div>

				{/* Picked up date */}
				{item.claim.pickedUpAt && (
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Clock className="h-3 w-3" />
						<span>
							Picked up {format(new Date(item.claim.pickedUpAt), "MMM d, yyyy")}
						</span>
					</div>
				)}

				{/* Lease period */}
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Calendar className="h-3 w-3" />
					<span>
						{format(new Date(item.claim.startDate), "MMM d")} -{" "}
						{format(new Date(item.claim.endDate), "MMM d, yyyy")}
					</span>
				</div>
			</div>
		</ItemCard>
	);
}
