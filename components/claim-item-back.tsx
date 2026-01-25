"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { LeaseProposeIntradayDialog } from "./lease/lease-propose-intraday-dialog";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface ClaimItemBackProps {
	item: Doc<"items">;
	viewerRole?: "borrower" | "owner";
}

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

function formatIntradayRangeLabel(range: {
	startAt: number;
	endAt: number;
}): string {
	const startHour = new Date(range.startAt).getHours();
	const endHour = new Date(range.endAt).getHours();
	return `${pad2(startHour)}:00–${pad2(endHour)}:00`;
}

function hasOverlap(
	a: { startDate: number; endDate: number },
	b: { startDate: number; endDate: number },
): boolean {
	return a.startDate < b.endDate && a.endDate > b.startDate;
}

function BorrowerClaimItemBack({ item }: { item: Doc<"items"> }) {
	const { flipToFront } = useItemCard();

	const calendar = useItemCalendar({
		mode: "borrower",
		itemId: item._id,
		months: "responsive",
		showMyRequestModifiers: true,
	});

	const [intradayRange, setIntradayRange] = useState<{
		startAt: number;
		endAt: number;
	} | null>(null);
	const [intradayDialogOpen, setIntradayDialogOpen] = useState(false);
	const [intradayFixedDate, setIntradayFixedDate] = useState<Date | null>(null);
	const [isIntradayBusy, setIsIntradayBusy] = useState(false);

	const selectionKey =
		calendar.date?.from && calendar.date?.to
			? `${calendar.date.from.getTime()}-${calendar.date.to.getTime()}`
			: null;
	const lastSelectionKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (selectionKey === lastSelectionKeyRef.current) return;
		lastSelectionKeyRef.current = selectionKey;

		setIntradayRange(null);
		setIntradayDialogOpen(false);
		setIntradayFixedDate(null);

		if (calendar.date?.from && calendar.date?.to) {
			if (isSameDay(calendar.date.from, calendar.date.to)) {
				setIntradayFixedDate(calendar.date.from);
			}
		}
	}, [calendar.date, selectionKey]);

	const isIntradayRequired = Boolean(
		calendar.date?.from &&
			calendar.date?.to &&
			isSameDay(calendar.date.from, calendar.date.to),
	);

	const requestDisabled =
		!calendar.date?.from ||
		!calendar.date?.to ||
		calendar.isSubmitting ||
		isIntradayBusy ||
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
		if (isIntradayRequired) {
			if (!intradayRange) {
				setIntradayDialogOpen(true);
				return;
			}
			calendar.requestItemAt(intradayRange.startAt, intradayRange.endAt, () => {
				setIntradayRange(null);
				setIntradayDialogOpen(false);
				setIntradayFixedDate(null);
				calendar.setDate(undefined);
			});
			return;
		}
		if (!calendar.date?.from || !calendar.date?.to) return;
		calendar.requestItem(calendar.date.from, calendar.date.to, () => {
			setIntradayRange(null);
			setIntradayDialogOpen(false);
			setIntradayFixedDate(null);
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
				{intradayFixedDate ? (
					<div className="mt-3">
						<LeaseProposeIntradayDialog
							title="Select hours"
							description="Same-day requests are booked by the hour."
							triggerLabel={
								intradayRange
									? `Change hours (${formatIntradayRangeLabel(intradayRange)})`
									: "Select hours"
							}
							triggerVariant="outline"
							triggerSize="sm"
							triggerClassName="w-full h-8"
							confirmLabel="Save hours"
							cancelLabel="Cancel"
							fixedDate={intradayFixedDate}
							disabled={calendar.isSubmitting || isIntradayBusy}
							open={intradayDialogOpen}
							onOpenChange={setIntradayDialogOpen}
							onBusyChange={setIsIntradayBusy}
							onConfirm={async (startAt, endAt) => {
								const now = Date.now();
								if (startAt < now) {
									toast.error("Start time must be in the future");
									throw new Error("Start time must be in the future");
								}
								if (endAt <= startAt) {
									toast.error("End time must be after start time");
									throw new Error("End time must be after start time");
								}

								const overlaps = (calendar.availability ?? []).some((r) =>
									hasOverlap(
										{ startDate: startAt, endDate: endAt },
										{ startDate: r.startDate, endDate: r.endDate },
									),
								);
								if (overlaps) {
									toast.error("Selected hours are not available");
									throw new Error("Selected hours are not available");
								}

								setIntradayRange({ startAt, endAt });
								setIntradayDialogOpen(false);
							}}
						/>
					</div>
				) : null}
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
