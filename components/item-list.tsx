"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { List, Map } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

import { Doc } from "../convex/_generated/dataModel";

import { ReactNode } from "react";
import { UserLink } from "@/components/user-link";
import { ItemCard } from "./item-card";
import { CategoryFilter } from "./category-filter";
import type { ItemCategory } from "./item-form";
import { cn } from "@/lib/utils";
import { WishlistEmptyCard } from "@/components/wishlist/wishlist-empty-card";

// Dynamic import to avoid SSR hydration issues with Leaflet
const ItemsMap = dynamic(
	() => import("./items-map").then((mod) => mod.ItemsMap),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
				<p className="text-muted-foreground">Loading map...</p>
			</div>
		),
	},
);

type ViewMode = "list" | "map";

export function ItemList({
	action,
	actionBack,
	onEmptyMakeRequest,
}: {
	action?: (item: Doc<"items"> & { isRequested?: boolean }) => ReactNode;
	actionBack?: (item: Doc<"items"> & { isRequested?: boolean }) => ReactNode;
	onEmptyMakeRequest?: () => void;
}) {
	const items = useQuery(api.items.get);
	const searchParams = useSearchParams();
	const urlQuery = searchParams.get("q") ?? "";
	const [search, setSearch] = useState(() => urlQuery);
	const [selectedCategories, setSelectedCategories] = useState<ItemCategory[]>(
		[],
	);
	const [viewMode, setViewMode] = useState<ViewMode>("list");

	const filteredItems = items?.filter((item) => {
		const needle = search.trim().toLowerCase();
		const itemText = `${item.name} ${item.description ?? ""}`.toLowerCase();

		// (1) keyword AND category (when both are set)
		const matchesSearch = needle.length === 0 || itemText.includes(needle);

		// (2) categories are OR'd together
		const matchesCategory =
			selectedCategories.length === 0 ||
			(item.category !== undefined &&
				selectedCategories.includes(item.category));

		return matchesSearch && matchesCategory;
	});

	return (
		<div className="w-full max-w-2xl space-y-4">
			<div className="flex flex-col gap-3">
				<div className="flex gap-2">
					<Input
						placeholder="Search available items..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="flex-1"
					/>
					<div className="flex border rounded-md">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setViewMode("list")}
							className={cn(
								"rounded-r-none",
								viewMode === "list" && "bg-muted",
							)}
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setViewMode("map")}
							className={cn("rounded-l-none", viewMode === "map" && "bg-muted")}
						>
							<Map className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<CategoryFilter
					selected={selectedCategories}
					onChange={setSelectedCategories}
				/>
			</div>

			{viewMode === "map" ? (
				<div className="space-y-2">
					{items === undefined ? (
						<p>Loading...</p>
					) : (
						<>
							<ItemsMap items={filteredItems || []} />
							{filteredItems?.filter((i) => i.location).length === 0 && (
								<p className="text-sm text-muted-foreground text-center">
									No items with location in current filter
								</p>
							)}
						</>
					)}
				</div>
			) : (
				<div className="grid gap-4">
					{items === undefined ? (
						<p>Loading...</p>
					) : items.length === 0 ? (
						<WishlistEmptyCard onMakeRequest={onEmptyMakeRequest} />
					) : filteredItems?.length === 0 ? (
						<WishlistEmptyCard onMakeRequest={onEmptyMakeRequest} />
					) : (
						filteredItems?.map((item) => (
							<ItemCard
								key={item._id}
								item={item}
								backContent={actionBack && actionBack(item)}
								footer={
									<div className="flex justify-between items-center w-full">
										<UserLink userId={item.ownerId} size="sm" />
										{action && action(item)}
									</div>
								}
							/>
						))
					)}
				</div>
			)}
		</div>
	);
}
