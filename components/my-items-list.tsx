"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { MyItemCard } from "./my-item-card";

export function MyItemsList() {
	const items = useQuery(api.items.getMyItems);

	if (items === undefined) {
		return <div className="text-center p-4">Loading...</div>;
	}

	if (items.length === 0) {
		return (
			<div className="text-center p-4 text-gray-500">
				You haven&apos;t shared any items yet.
			</div>
		);
	}

	const borrowedCount = items.filter((i) => !i.isOwner).length;

	return (
		<div className="space-y-4">
			{borrowedCount > 0 ? (
				<div className="text-xs text-muted-foreground">
					Includes {borrowedCount} borrowed item{borrowedCount > 1 ? "s" : ""}.
				</div>
			) : null}
			{items.map((item) => (
				<MyItemCard key={item._id} item={item} isOwner={item.isOwner} />
			))}
		</div>
	);
}
