"use client";

import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { api } from "@/convex/_generated/api";
import { StarRating } from "@/components/star-rating";
import { UserLink } from "@/components/user-link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface RatingsListProps {
	userId: string;
}

export function RatingsList({ userId }: RatingsListProps) {
	const allRatings = useQuery(api.ratings.getRatingsForUser, { userId });
	const lenderRatings = useQuery(api.ratings.getRatingsForUser, {
		userId,
		role: "lender",
	});
	const borrowerRatings = useQuery(api.ratings.getRatingsForUser, {
		userId,
		role: "borrower",
	});

	if (allRatings === undefined) {
		return (
			<div className="text-sm text-muted-foreground">Loading ratings...</div>
		);
	}

	if (allRatings.length === 0) {
		return <div className="text-sm text-muted-foreground">No ratings yet.</div>;
	}

	return (
		<Tabs defaultValue="all" className="w-full">
			<TabsList className="w-full grid grid-cols-3">
				<TabsTrigger value="all">All ({allRatings?.length ?? 0})</TabsTrigger>
				<TabsTrigger value="lender">
					As Lender ({lenderRatings?.length ?? 0})
				</TabsTrigger>
				<TabsTrigger value="borrower">
					As Borrower ({borrowerRatings?.length ?? 0})
				</TabsTrigger>
			</TabsList>

			<TabsContent value="all" className="mt-4">
				<RatingsGrid ratings={allRatings} />
			</TabsContent>

			<TabsContent value="lender" className="mt-4">
				<RatingsGrid ratings={lenderRatings ?? []} />
			</TabsContent>

			<TabsContent value="borrower" className="mt-4">
				<RatingsGrid ratings={borrowerRatings ?? []} />
			</TabsContent>
		</Tabs>
	);
}

interface Rating {
	_id: string;
	fromUserId: string;
	stars: number;
	comment?: string;
	role: "lender" | "borrower";
	createdAt: number;
	photoUrls: string[];
}

function RatingsGrid({ ratings }: { ratings: Rating[] }) {
	if (ratings.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">
				No ratings in this category.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{ratings.map((rating) => (
				<RatingCard key={rating._id} rating={rating} />
			))}
		</div>
	);
}

function RatingCard({ rating }: { rating: Rating }) {
	return (
		<Card>
			<CardContent className="pt-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<UserLink userId={rating.fromUserId} size="sm" />
							<Badge variant="outline" className="text-xs">
								{rating.role === "lender" ? "As Lender" : "As Borrower"}
							</Badge>
						</div>
						<StarRating value={rating.stars} readonly size="sm" />
						{rating.comment && (
							<p className="text-sm text-gray-700">{rating.comment}</p>
						)}
						{rating.photoUrls.length > 0 && (
							<div className="flex gap-2 mt-2">
								{rating.photoUrls.map((url, index) => (
									<img
										key={index}
										src={url}
										alt={`Rating photo ${index + 1}`}
										className="w-16 h-16 object-cover rounded-md border"
									/>
								))}
							</div>
						)}
					</div>
					<span className="text-xs text-muted-foreground whitespace-nowrap">
						{formatDistanceToNow(new Date(rating.createdAt), {
							addSuffix: true,
						})}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
