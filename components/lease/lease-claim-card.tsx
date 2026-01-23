"use client";

import { useQuery } from "convex/react";
import {
	Check,
	Clock,
	X,
	AlertTriangle,
	Package,
	PackageCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { LeaseActivityEvent } from "./lease-activity-timeline";
import { LeaseActivitySection } from "./lease-activity-section";
import { LeaseActionDialog } from "./lease-action-dialog";
import { LeaseClaimHeader } from "./lease-claim-header";
import type {
	ApproveClaimArgs,
	MarkLeaseStatusArgs,
	MutationResult,
	RecordLeaseArgs,
	RejectClaimArgs,
	ViewerRole,
} from "./lease-claim-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

function getLeaseState(claim: Doc<"claims">): string {
	if (claim.status === "rejected") return "rejected";
	if (claim.status === "approved") return "approved";
	return "requested";
}

function badgeVariantForState(
	state: string,
): "default" | "secondary" | "outline" | "destructive" {
	switch (state) {
		case "approved":
			return "default";
		case "requested":
			return "secondary";
		case "picked_up":
			return "default";
		case "returned":
			return "outline";
		case "expired":
			return "destructive";
		case "missing":
			return "destructive";
		case "rejected":
			return "destructive";
		default:
			return "secondary";
	}
}

function labelForState(state: string): string {
	switch (state) {
		case "requested":
			return "Awaiting approval";
		case "approved":
			return "Approved";
		case "rejected":
			return "Rejected";
		case "picked_up":
			return "In use";
		case "returned":
			return "Completed";
		case "expired":
			return "Expired";
		case "missing":
			return "Missing";
		default:
			return "Unknown";
	}
}

function getStateIcon(state: string) {
	switch (state) {
		case "requested":
			return Clock;
		case "approved":
			return Check;
		case "rejected":
			return X;
		case "picked_up":
			return Package;
		case "returned":
			return PackageCheck;
		case "expired":
		case "missing":
			return AlertTriangle;
		default:
			return Clock;
	}
}

// Manages a single lease claim with activity and status actions.
export function LeaseClaimCard(props: {
	itemId: Id<"items">;
	claim: Doc<"claims">;
	viewerRole: ViewerRole;
	approveClaim?: (args: ApproveClaimArgs) => MutationResult;
	rejectClaim?: (args: RejectClaimArgs) => MutationResult;
	markPickedUp: (args: RecordLeaseArgs) => MutationResult;
	markReturned: (args: RecordLeaseArgs) => MutationResult;
	markExpired?: (args: MarkLeaseStatusArgs) => MutationResult;
	markMissing?: (args: MarkLeaseStatusArgs) => MutationResult;
	generateUploadUrl: () => Promise<string>;
}) {
	const {
		itemId,
		claim,
		viewerRole,
		approveClaim,
		rejectClaim,
		markPickedUp,
		markReturned,
		markExpired,
		markMissing,
		generateUploadUrl,
	} = props;

	const events = useQuery(api.items.getLeaseActivity, { claimId: claim._id });
	const leaseEvents = events as LeaseActivityEvent[] | undefined;

	const isOwner = viewerRole === "owner";
	const isApproved = claim.status === "approved";

	const [isApproving, setIsApproving] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);

	const eventTimes = useMemo(() => {
		const byType = new Map<LeaseActivityEvent["type"], number>();
		if (leaseEvents) {
			for (const e of leaseEvents) {
				const existing = byType.get(e.type);
				if (existing === undefined || e.createdAt < existing) {
					byType.set(e.type, e.createdAt);
				}
			}
		}
		return {
			requestedAt: byType.get("lease_requested"),
			approvedAt: byType.get("lease_approved"),
			rejectedAt: byType.get("lease_rejected"),
			expiredAt: byType.get("lease_expired"),
			missingAt: byType.get("lease_missing"),
			pickedUpAt: byType.get("lease_picked_up"),
			returnedAt: byType.get("lease_returned"),
		};
	}, [leaseEvents]);

	const derivedState = useMemo(() => {
		if (eventTimes.rejectedAt) return "rejected";
		if (eventTimes.missingAt) return "missing";
		if (eventTimes.returnedAt) return "returned";
		if (eventTimes.expiredAt) return "expired";
		if (eventTimes.pickedUpAt) return "picked_up";
		if (eventTimes.approvedAt) return "approved";
		if (eventTimes.requestedAt) return "requested";
		return getLeaseState(claim);
	}, [claim, eventTimes]);

	const canRecordPickup =
		isApproved &&
		!eventTimes.pickedUpAt &&
		!eventTimes.expiredAt &&
		!eventTimes.rejectedAt;
	const canRecordReturn =
		isApproved &&
		!!eventTimes.pickedUpAt &&
		!eventTimes.returnedAt &&
		!eventTimes.missingAt &&
		!eventTimes.rejectedAt;

	const canMarkExpired =
		isOwner &&
		isApproved &&
		!eventTimes.pickedUpAt &&
		!eventTimes.expiredAt &&
		!eventTimes.rejectedAt;
	const canMarkMissing =
		isOwner &&
		isApproved &&
		!!eventTimes.pickedUpAt &&
		!eventTimes.returnedAt &&
		!eventTimes.missingAt &&
		!eventTimes.rejectedAt;

	const StateIcon = getStateIcon(derivedState);

	return (
		<Card>
			<CardHeader>
				<LeaseClaimHeader
					claim={claim}
					requestedAt={eventTimes.requestedAt ?? claim._creationTime}
					stateLabel={labelForState(derivedState)}
					stateVariant={badgeVariantForState(derivedState)}
					StateIcon={StateIcon}
				/>
			</CardHeader>

			<CardContent>
				{isOwner && claim.status === "pending" && (
					<div className="flex gap-2">
						<Button
							size="sm"
							className="flex-1 h-8"
							disabled={isApproving || isRejecting}
							onClick={async () => {
								if (!approveClaim) return;
								setIsApproving(true);
								try {
									await approveClaim({ claimId: claim._id, id: itemId });
								} finally {
									setIsApproving(false);
								}
							}}
						>
							{isApproving ? (
								"Approving..."
							) : (
								<>
									<Check className="h-3.5 w-3.5 mr-1.5" />
									Approve
								</>
							)}
						</Button>

						{rejectClaim ? (
							<LeaseActionDialog
								title="Reject lease request"
								description="This will notify the borrower that their request was declined."
								triggerLabel="Reject"
								triggerIcon={X}
								triggerVariant="outline"
								triggerSize="sm"
								triggerClassName="h-8"
								confirmLabel="Reject request"
								confirmVariant="destructive"
								cancelLabel="Cancel"
								noteConfig={{
									id: "reject-note",
									label: "Reason (optional, but recommended)",
									placeholder: "Let them know why...",
									rows: 3,
								}}
								disabled={isApproving}
								onBusyChange={setIsRejecting}
								onConfirm={async () =>
									await rejectClaim({ claimId: claim._id, id: itemId })
								}
							/>
						) : null}
					</div>
				)}

				{(isOwner || viewerRole === "borrower") &&
					claim.status === "approved" && (
						<div className="space-y-2">
							{canRecordPickup && (
								<LeaseActionDialog
									title="Confirm item pickup"
									description="Record that the item has been picked up. Photos help document the item&apos;s condition."
									triggerLabel="Confirm pickup"
									triggerIcon={Package}
									triggerSize="sm"
									triggerClassName="w-full h-8"
									confirmLabel="Confirm pickup"
									cancelLabel="Cancel"
									noteConfig={{
										id: "pickup-note",
										label: "Notes (optional)",
										placeholder: "Any notes about the pickup...",
										rows: 2,
									}}
									photoConfig={{
										label: "Photos (optional)",
										maxFiles: 5,
										accept: "image/*",
									}}
									generateUploadUrl={generateUploadUrl}
									onConfirm={async ({ note, photoStorageIds }) =>
										await markPickedUp({
											itemId,
											claimId: claim._id,
											note,
											photoStorageIds,
										})
									}
								/>
							)}

							{canRecordReturn && (
								<LeaseActionDialog
									title="Confirm item return"
									description="Record that the item has been returned. Photos help document the item&apos;s condition."
									triggerLabel="Confirm return"
									triggerIcon={PackageCheck}
									triggerSize="sm"
									triggerClassName="w-full h-8"
									confirmLabel="Confirm return"
									cancelLabel="Cancel"
									noteConfig={{
										id: "return-note",
										label: "Notes (optional)",
										placeholder: "Any notes about the return...",
										rows: 2,
									}}
									photoConfig={{
										label: "Photos (optional)",
										maxFiles: 5,
										accept: "image/*",
									}}
									generateUploadUrl={generateUploadUrl}
									onConfirm={async ({ note, photoStorageIds }) =>
										await markReturned({
											itemId,
											claimId: claim._id,
											note,
											photoStorageIds,
										})
									}
								/>
							)}

							{isOwner && (canMarkExpired || canMarkMissing) && (
								<div className="flex gap-2 pt-1.5 border-t">
									{canMarkExpired && markExpired && (
										<LeaseActionDialog
											title="Mark lease as expired"
											description="The borrower didn't pick up the item. This will end the lease."
											triggerLabel="Expired"
											triggerIcon={AlertTriangle}
											triggerVariant="outline"
											triggerSize="sm"
											triggerClassName="flex-1 h-7 text-xs text-destructive hover:text-destructive"
											confirmLabel="Mark as expired"
											confirmVariant="destructive"
											cancelLabel="Cancel"
											noteConfig={{
												id: "expired-note",
												label: "Notes (optional)",
												placeholder: "Why is this being marked expired...",
												rows: 2,
											}}
											onConfirm={async ({ note }) =>
												await markExpired({
													itemId,
													claimId: claim._id,
													note,
												})
											}
										/>
									)}

									{canMarkMissing && markMissing && (
										<LeaseActionDialog
											title="Mark item as missing"
											description="The item wasn't returned as expected. This is a serious issue."
											triggerLabel="Missing"
											triggerIcon={AlertTriangle}
											triggerVariant="outline"
											triggerSize="sm"
											triggerClassName="flex-1 h-7 text-xs text-destructive hover:text-destructive"
											confirmLabel="Mark as missing"
											confirmVariant="destructive"
											cancelLabel="Cancel"
											noteConfig={{
												id: "missing-note",
												label: "Notes (optional)",
												placeholder: "Details about the missing item...",
												rows: 2,
											}}
											onConfirm={async ({ note }) =>
												await markMissing({
													itemId,
													claimId: claim._id,
													note,
												})
											}
										/>
									)}
								</div>
							)}
						</div>
					)}

				<LeaseActivitySection events={leaseEvents} />
			</CardContent>
		</Card>
	);
}
