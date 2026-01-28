"use client";

import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { api } from "../convex/_generated/api";
import { BorrowedItemCard } from "./borrowed-item-card";
import { MyItemCard } from "./my-item-card";

export function MyItemsList() {
	const items = useQuery(api.items.getMyItems);
	const borrowedItems = useQuery(api.items.getMyBorrowedItems);

	if (items === undefined || borrowedItems === undefined) {
		return <div className="text-center p-4">Loading...</div>;
	}

	// Filter out borrowed items from "my items" (they're shown separately)
	const ownedItems = items.filter((i) => i.isOwner);

	const hasNoItems = ownedItems.length === 0 && borrowedItems.length === 0;

	if (hasNoItems) {
		return (
			<div className="text-center p-4 text-gray-500">
				You don&apos;t have any items yet.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Items I'm Borrowing Section */}
			{borrowedItems.length > 0 && (
				<section className="space-y-3">
					<div className="flex items-center gap-2">
						<Package className="h-4 w-4 text-indigo-600" />
						<h2 className="text-sm font-medium text-gray-700">
							Items I&apos;m Borrowing
						</h2>
						<span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
							{borrowedItems.length}
						</span>
					</div>
					<div className="space-y-3">
						{borrowedItems.map((item) => (
							<BorrowedItemCard key={item._id} item={item} />
						))}
					</div>
				</section>
			)}

			{/* My Items Section */}
			{ownedItems.length > 0 && (
				<section className="space-y-3">
					{borrowedItems.length > 0 && (
						<h2 className="text-sm font-medium text-gray-700">My Items</h2>
					)}
					<div className="space-y-3">
						{ownedItems.map((item) => (
							<MyItemCard key={item._id} item={item} isOwner />
						))}
					</div>
				</section>
			)}
		</div>
	);
}
