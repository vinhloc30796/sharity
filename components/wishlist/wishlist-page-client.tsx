"use client";

import { WishlistDraftCard } from "@/components/wishlist/wishlist-draft-card";
import { WishlistItem } from "@/components/wishlist/wishlist-item";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type WishlistPageClientProps = {
	shouldFocusDraft: boolean;
};

export function WishlistPageClient({
	shouldFocusDraft,
}: WishlistPageClientProps) {
	const router = useRouter();
	const wishlistItems = useQuery(api.wishlist.list);
	const [sortBy, setSortBy] = useState<"recent" | "upvoted">("recent");

	if (!wishlistItems) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50/50">
				<div className="animate-pulse">Loading...</div>
			</div>
		);
	}

	const sortedItems = [...wishlistItems].sort((a, b) => {
		if (sortBy === "upvoted") {
			return b.votes.length - a.votes.length;
		}
		// Default to recent (which is already the default backend order, but good to be explicit for client sort)
		return b.createdAt - a.createdAt;
	});

	return (
		<main className="min-h-screen bg-gray-50/50">
			<div className="container mx-auto px-3 sm:px-4 lg:px-6 py-8 max-w-4xl">
				<Button
					variant="ghost"
					className="mb-6 gap-2"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-4 w-4" /> Back
				</Button>

				<div className="space-y-8">
					<div className="flex flex-col md:flex-row items-center justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold tracking-tight">Wishlist</h1>
							<p className="text-gray-500">
								Request items you can&apos;t find and vote on others&apos;
								requests.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Select
								value={sortBy}
								onValueChange={(v) => setSortBy(v as "recent" | "upvoted")}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="recent">Most Recent</SelectItem>
									<SelectItem value="upvoted">Most Upvoted</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid gap-4">
						<WishlistDraftCard autoFocus={shouldFocusDraft} />
						{sortedItems.length === 0 ? (
							<div className="text-center py-12 text-gray-500 bg-white rounded-lg border shadow-sm">
								<p>No items found.</p>
							</div>
						) : (
							sortedItems.map((item) => (
								<WishlistItem key={item._id} item={item} />
							))
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
