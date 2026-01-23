"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowBigUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface WishlistItemProps {
	item: Doc<"wishlist"> & { matchCount: number; isLiked: boolean };
}

export function WishlistItem({ item }: WishlistItemProps) {
	const toggleVote = useMutation(api.wishlist.toggleVote);

	const handleVote = async () => {
		try {
			await toggleVote({ id: item._id });
		} catch {
			toast.error("Failed to vote");
		}
	};

	return (
		<Card className="w-full">
			<CardHeader className="pb-2">
				<div className="flex justify-between items-start gap-4">
					<p className="text-lg font-medium leading-none">{item.text}</p>
					<span className="text-xs text-muted-foreground whitespace-nowrap">
						{formatDistanceToNow(item.createdAt, { addSuffix: true })}
					</span>
				</div>
			</CardHeader>
			<CardContent className="pb-2">
				{item.matchCount > 0 && (
					<div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md transition-colors hover:bg-green-100 cursor-pointer">
						<CheckCircle2 className="h-4 w-4" />
						<span>
							{item.matchCount} matching{" "}
							{item.matchCount === 1 ? "item" : "items"} available
						</span>
					</div>
				)}
			</CardContent>
			<CardFooter className="pt-2">
				<Button
					variant={item.isLiked ? "secondary" : "ghost"}
					size="sm"
					className={`gap-2 ${item.isLiked ? "bg-orange-100 hover:bg-orange-200 text-orange-700" : ""}`}
					onClick={handleVote}
				>
					<ArrowBigUp
						className={`h-5 w-5 ${item.isLiked ? "fill-orange-700" : ""}`}
					/>
					<span>{item.votes.length}</span>
				</Button>
			</CardFooter>
		</Card>
	);
}
