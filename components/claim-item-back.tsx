"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";

import type { Doc } from "../convex/_generated/dataModel";
import { useItemCalendar } from "@/hooks/use-item-calendar";
import { ItemCalendar } from "@/components/item-calendar";
import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useItemCard } from "./item-card";
import { AvailabilityToggle } from "./notifications/availability-toggle";
import { LeaseClaimCard } from "./lease/lease-claim-card";
import { api } from "@/convex/_generated/api";

interface ClaimItemBackProps {
	item: Doc<"items">;
	viewerRole?: "borrower" | "owner";
}

function BorrowerClaimItemBack({ item }: { item: Doc<"items"> }) {
	const { flipToFront } = useItemCard();

	const calendar = useItemCalendar({
		mode: "borrower",
		itemId: item._id,
		months: "responsive",
		showMyRequestModifiers: true,
	});

	const requestDisabled =
		!calendar.date?.from ||
		!calendar.date?.to ||
		calendar.isSubmitting ||
		calendar.isAuthLoading ||
		!calendar.isAuthenticated;

	const primaryClaim = useMemo(() => {
		const list = calendar.myRequests ?? [];
		const activeApproved = list
			.filter(
				(c) =>
					c.status === "approved" &&
					!c.returnedAt &&
					!c.expiredAt &&
					!c.missingAt,
			)
			.sort((a, b) => a.startDate - b.startDate);
		if (activeApproved[0]) return activeApproved[0];

		const pending = list
			.filter((c) => c.status === "pending")
			.sort((a, b) => a.startDate - b.startDate);
		return pending[0];
	}, [calendar.myRequests]);

	const markPickedUp = useMutation(api.items.markPickedUp);
	const markReturned = useMutation(api.items.markReturned);
	const generateUploadUrl = useMutation(api.items.generateUploadUrl);

	const onClaim = () => {
		if (!calendar.date?.from || !calendar.date?.to) return;
		calendar.requestItem(calendar.date.from, calendar.date.to, () => {
			calendar.setDate(undefined);
		});
	};

	if (primaryClaim) {
		return (
			<>
				<LeaseClaimCard
					itemId={item._id}
					claim={primaryClaim}
					viewerRole="borrower"
					layout="embedded"
					cancelClaim={async ({ claimId }) =>
						await calendar.cancelRequest(claimId)
					}
					markPickedUp={markPickedUp}
					markReturned={markReturned}
					generateUploadUrl={async () => await generateUploadUrl()}
				/>
				<CardFooter className="mt-auto border-t gap-2 justify-end">
					<Button variant="ghost" size="sm" onClick={flipToFront}>
						Back
					</Button>
					<Link href={`/item/${item._id}`}>
						<Button variant="outline" size="sm">
							Open details
						</Button>
					</Link>
				</CardFooter>
			</>
		);
	}

	return (
		<>
			<CardHeader className="space-y-1">
				<CardTitle className="text-base">Request to Borrow</CardTitle>
				{!calendar.isAuthenticated ? (
					<div className="text-sm text-muted-foreground">
						{calendar.isAuthLoading ? "Connecting..." : "Sign in to request."}
					</div>
				) : null}
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex justify-center w-full max-w-full">
					<ItemCalendar {...calendar.calendarProps} />
				</div>
			</CardContent>
			<CardFooter className="mt-auto border-t gap-2 justify-between">
				<AvailabilityToggle id={item._id} />
				<div className="flex gap-2">
					<Button variant="ghost" size="sm" onClick={flipToFront}>
						Back
					</Button>
					<Link href={`/item/${item._id}`} className="hidden sm:block">
						<Button variant="outline" size="sm">
							Details
						</Button>
					</Link>
					<Button size="sm" onClick={onClaim} disabled={requestDisabled}>
						{calendar.isSubmitting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Request"
						)}
					</Button>
				</div>
			</CardFooter>
		</>
	);
}

function OwnerClaimItemBack({ item }: { item: Doc<"items"> }) {
	const { flipToFront } = useItemCard();
	const claims = useQuery(api.items.getClaims, { id: item._id });

	const primaryClaim = useMemo(() => {
		const list = claims ?? [];
		const pending = list
			.filter((c) => c.status === "pending")
			.sort((a, b) => a.startDate - b.startDate);
		if (pending[0]) return pending[0];

		const activeApproved = list
			.filter(
				(c) =>
					c.status === "approved" &&
					!c.returnedAt &&
					!c.expiredAt &&
					!c.missingAt,
			)
			.sort((a, b) => a.startDate - b.startDate);
		return activeApproved[0];
	}, [claims]);

	const approveClaim = useMutation(api.items.approveClaim);
	const rejectClaim = useMutation(api.items.rejectClaim);
	const markPickedUp = useMutation(api.items.markPickedUp);
	const markReturned = useMutation(api.items.markReturned);
	const markExpired = useMutation(api.items.markExpired);
	const markMissing = useMutation(api.items.markMissing);
	const generateUploadUrl = useMutation(api.items.generateUploadUrl);

	if (primaryClaim) {
		return (
			<>
				<LeaseClaimCard
					itemId={item._id}
					claim={primaryClaim}
					viewerRole="owner"
					layout="embedded"
					approveClaim={approveClaim}
					rejectClaim={rejectClaim}
					markPickedUp={markPickedUp}
					markReturned={markReturned}
					markExpired={markExpired}
					markMissing={markMissing}
					generateUploadUrl={async () => await generateUploadUrl()}
				/>
				<CardFooter className="mt-auto border-t gap-2 justify-end">
					<Button variant="ghost" size="sm" onClick={flipToFront}>
						Back
					</Button>
					<Link href={`/item/${item._id}`}>
						<Button variant="outline" size="sm">
							Open details
						</Button>
					</Link>
				</CardFooter>
			</>
		);
	}

	return (
		<>
			<CardHeader className="space-y-1">
				<CardTitle className="text-base">No active requests</CardTitle>
				<div className="text-sm text-muted-foreground">
					{claims === undefined
						? "Loading..."
						: "Nothing to approve right now."}
				</div>
			</CardHeader>
			<CardFooter className="mt-auto border-t gap-2 justify-end">
				<Button variant="ghost" size="sm" onClick={flipToFront}>
					Back
				</Button>
				<Link href={`/item/${item._id}`}>
					<Button variant="outline" size="sm">
						Open details
					</Button>
				</Link>
			</CardFooter>
		</>
	);
}

export function ClaimItemBack({ item, viewerRole }: ClaimItemBackProps) {
	if (viewerRole === "owner") {
		return <OwnerClaimItemBack item={item} />;
	}
	return <BorrowerClaimItemBack item={item} />;
}
