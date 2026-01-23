"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowBigUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface WishlistItemProps {
	item: Doc<"wishlist"> & { matchCount: number; isLiked: boolean };
}

export function WishlistItem({ item }: WishlistItemProps) {
	const toggleVote = useMutation(api.wishlist.toggleVote);
	const query = encodeURIComponent(item.text.trim());

	const handleVote = async () => {
		try {
			await toggleVote({ id: item._id });
		} catch {
			toast.error("Failed to vote");
		}
	};

	return (
		<Card className="w-full gap-0 py-2">
			<div className="flex items-center gap-3 px-4">
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-medium">{item.text}</div>
				</div>

				{item.matchCount > 0 ? (
					<Link
						href={`/?q=${query}`}
						className="inline-flex items-center gap-1 rounded-md border bg-green-50 px-2 py-1 text-xs text-green-700 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<CheckCircle2 className="h-3.5 w-3.5" />
						<span className="whitespace-nowrap">
							{item.matchCount} {item.matchCount === 1 ? "match" : "matches"}
						</span>
					</Link>
				) : null}

				<Button
					variant={item.isLiked ? "secondary" : "ghost"}
					size="sm"
					className={`h-8 gap-1 px-2 ${
						item.isLiked
							? "bg-orange-100 hover:bg-orange-200 text-orange-700"
							: ""
					}`}
					onClick={handleVote}
				>
					<ArrowBigUp
						className={`h-4 w-4 ${item.isLiked ? "fill-orange-700" : ""}`}
					/>
					<span className="text-xs">{item.votes.length}</span>
				</Button>

				<span className="text-xs text-muted-foreground whitespace-nowrap">
					{formatDistanceToNow(item.createdAt, { addSuffix: true })}
				</span>
			</div>
		</Card>
	);
}
